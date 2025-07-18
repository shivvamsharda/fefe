import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, DollarSign, Send, User, Pin, Trash2, Reply, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EmojiPicker from '@/components/chat/EmojiPicker';
import DonationLeaderboard from './DonationLeaderboard';
import AuthModal from '@/components/auth/AuthModal';

interface ChatMessage {
  id: string;
  sender_display_name: string;
  message_content: string;
  created_at: string;
  sender_wallet_address?: string;
  is_donation?: boolean;
  donation_amount?: number;
  is_deleted?: boolean;
  reply_to_message_id?: string;
  is_reply?: boolean;
  replied_message?: ChatMessage;
  isOptimistic?: boolean; // Flag for local optimistic updates
}

interface PinnedMessage {
  id: string;
  stream_id: string;
  message_id: string;
  pinned_by_wallet_address: string;
  pinned_at: string;
  chat_messages: ChatMessage;
}

interface ChatBoxProps {
  streamId: string;
  streamCreatorWallet?: string;
}

const ChatBox = ({ streamId, streamCreatorWallet }: ChatBoxProps) => {
  const { hasWalletCapability, effectiveWalletAddress, openWalletModal } = useWallet();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [streamCreator, setStreamCreator] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const optimisticMessageIds = useRef<Set<string>>(new Set()); // Track optimistic message IDs
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  // Check for Google authentication
  useEffect(() => {
    const checkGoogleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setGoogleUser(session?.user || null);
    };

    checkGoogleAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setGoogleUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if user is authenticated via wallet OR Google
  const isAuthenticated = hasWalletCapability || !!googleUser;
  const isCreator = isAuthenticated && streamCreator && (
    (effectiveWalletAddress && effectiveWalletAddress === streamCreator) ||
    (googleUser && streamCreator === googleUser.id)
  );

  console.log('ChatBox debug:', {
    hasWalletCapability,
    googleUser: !!googleUser,
    isAuthenticated,
    effectiveWalletAddress,
    streamCreatorWallet,
    streamCreator,
    isCreator,
    realTimeConnected,
    messagesCount: messages.length
  });

  // Helper function to deduplicate messages
  const deduplicateMessages = (messageList: ChatMessage[]): ChatMessage[] => {
    const seen = new Set<string>();
    return messageList.filter(msg => {
      if (seen.has(msg.id)) {
        return false;
      }
      seen.add(msg.id);
      return true;
    });
  };

  // Enhanced helper function to fetch original message for replies
  const fetchOriginalMessage = async (messageId: string): Promise<ChatMessage | null> => {
    try {
      console.log('🔍 Fetching original message for reply:', messageId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (error || !data) {
        console.error('❌ Error fetching original message:', error);
        return null;
      }

      console.log('✅ Successfully fetched original message:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching original message:', error);
      return null;
    }
  };

  // Enhanced function to resolve reply relationships with better error handling
  const resolveReplyRelationships = async (messageList: ChatMessage[]): Promise<ChatMessage[]> => {
    console.log('🔄 Resolving reply relationships for', messageList.length, 'messages');
    
    const resolvedMessages: ChatMessage[] = [];
    
    for (const msg of messageList) {
      if (msg.is_reply && msg.reply_to_message_id) {
        console.log('🔍 Processing reply message:', msg.id, 'replying to:', msg.reply_to_message_id);
        
        // First check if the original message is already in the current batch
        const originalInBatch = messageList.find(m => m.id === msg.reply_to_message_id);
        
        if (originalInBatch) {
          console.log('✅ Found original message in current batch');
          resolvedMessages.push({
            ...msg,
            replied_message: originalInBatch
          });
        } else {
          console.log('🔍 Original message not in batch, fetching from database');
          const originalMessage = await fetchOriginalMessage(msg.reply_to_message_id);
          
          if (originalMessage) {
            console.log('✅ Successfully resolved reply relationship');
            resolvedMessages.push({
              ...msg,
              replied_message: originalMessage
            });
          } else {
            console.log('⚠️ Could not resolve reply relationship, adding message without context');
            resolvedMessages.push(msg);
          }
        }
      } else {
        resolvedMessages.push(msg);
      }
    }
    
    console.log('✅ Resolved', resolvedMessages.length, 'messages with reply relationships');
    return resolvedMessages;
  };

  // Fallback polling function to fetch new messages
  const fetchNewMessages = async () => {
    if (!streamId || !lastFetchTime) return;

    try {
      console.log('🔄 Fallback: Fetching new messages since:', lastFetchTime);
      
      const { data: newMessages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_deleted', false)
        .gt('created_at', lastFetchTime)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Fallback: Error fetching new messages:', error);
        return;
      }

      if (newMessages && newMessages.length > 0) {
        console.log(`🔄 Fallback: Found ${newMessages.length} new messages`);
        
        // Filter out messages that are already optimistic
        const nonOptimisticMessages = newMessages.filter(msg => !optimisticMessageIds.current.has(msg.id));
        
        if (nonOptimisticMessages.length > 0) {
          // Resolve reply relationships for new messages
          const resolvedMessages = await resolveReplyRelationships(nonOptimisticMessages);
          
          setMessages(prev => {
            const combined = [...prev, ...resolvedMessages];
            return deduplicateMessages(combined);
          });
        }
        
        // Update last fetch time
        setLastFetchTime(newMessages[newMessages.length - 1].created_at);
      }
    } catch (error) {
      console.error('❌ Fallback: Error in fetchNewMessages:', error);
    }
  };

  // Fetch stream details to get creator wallet if not provided
  useEffect(() => {
    const fetchStreamCreator = async () => {
      if (streamCreatorWallet) {
        setStreamCreator(streamCreatorWallet);
        return;
      }

      try {
        const { data: streamData, error } = await supabase
          .from('streams')
          .select(`
            user_profiles!streams_user_id_fkey (
              wallet_address
            )
          `)
          .eq('id', streamId)
          .single();

        if (error) {
          console.error('Error fetching stream creator:', error);
          return;
        }

        if (streamData?.user_profiles?.wallet_address) {
          setStreamCreator(streamData.user_profiles.wallet_address);
        }
      } catch (error) {
        console.error('Error fetching stream creator:', error);
      }
    };

    if (streamId) {
      fetchStreamCreator();
    }
  }, [streamId, streamCreatorWallet]);

  // Enhanced initial data fetch with proper reply resolution
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        console.log('🔥 Fetching existing messages for stream:', streamId);
        
        // Fetch all messages for the stream
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('stream_id', streamId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('❌ Error fetching chat messages:', messagesError);
          toast.error('Failed to load chat messages');
          return;
        }

        console.log('🔥 Fetched', messagesData?.length || 0, 'messages');

        // Resolve reply relationships for all messages
        const resolvedMessages = await resolveReplyRelationships(messagesData || []);

        // Fetch pinned message
        const { data: pinnedData, error: pinnedError } = await supabase
          .from('pinned_messages')
          .select(`
            *,
            chat_messages (*)
          `)
          .eq('stream_id', streamId)
          .single();

        if (pinnedError && pinnedError.code !== 'PGRST116') {
          console.error('Error fetching pinned message:', pinnedError);
        }

        setMessages(resolvedMessages);
        setPinnedMessage(pinnedData || null);
        
        // Set last fetch time to the latest message timestamp
        if (resolvedMessages.length > 0) {
          setLastFetchTime(resolvedMessages[resolvedMessages.length - 1].created_at);
        } else {
          setLastFetchTime(new Date().toISOString());
        }
      } catch (error) {
        console.error('❌ Error fetching chat data:', error);
        toast.error('Failed to load chat data');
      } finally {
        setIsLoading(false);
      }
    };

    if (streamId) {
      fetchChatData();
    }
  }, [streamId]);

  // Simplified real-time listener with immediate message processing
  useEffect(() => {
    if (!streamId) return;

    console.log('🔥 Setting up simplified real-time listener for stream:', streamId);

    // Create a unique channel name to avoid conflicts
    const channelName = `chat-messages-${streamId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `stream_id=eq.${streamId}`
        },
        async (payload) => {
          console.log('🔥 REAL-TIME INSERT EVENT RECEIVED:', payload);
          
          const newMessage = payload.new as ChatMessage;
          
          // Only process non-deleted messages and skip if we already have it as optimistic
          if (!newMessage.is_deleted && !optimisticMessageIds.current.has(newMessage.id)) {
            console.log('🔥 Processing new real-time message:', newMessage);
            
            // Update last fetch time
            setLastFetchTime(newMessage.created_at);
            
            // Add message to state without complex processing
            setMessages(prev => {
              const combined = [...prev, newMessage];
              return deduplicateMessages(combined);
            });
          } else if (optimisticMessageIds.current.has(newMessage.id)) {
            console.log('🔥 Received real-time confirmation for optimistic message:', newMessage.id);
            // Remove from optimistic tracking
            optimisticMessageIds.current.delete(newMessage.id);
            
            // Update the message to remove optimistic flag
            setMessages(prev => 
              prev.map(m => 
                m.id === newMessage.id 
                  ? { ...newMessage, isOptimistic: false }
                  : m
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          console.log('🔥 MESSAGE UPDATE EVENT:', payload);
          const updatedMessage = payload.new as ChatMessage;
          if (updatedMessage.is_deleted) {
            // Remove deleted message from chat
            setMessages(prev => prev.filter(msg => msg.id !== updatedMessage.id));
            // Remove from pinned if it was pinned
            if (pinnedMessage?.message_id === updatedMessage.id) {
              setPinnedMessage(null);
            }
            // Clear reply if replying to deleted message
            if (replyingTo?.id === updatedMessage.id) {
              setReplyingTo(null);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔥 Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates for stream:', streamId);
          setRealTimeConnected(true);
          
          // Clear any existing fallback interval when real-time connects
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
            console.log('🔥 Cleared fallback polling - real-time is working');
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error - enabling fallback polling');
          setRealTimeConnected(false);
          
          // Start fallback polling only when there's an actual error
          if (!fallbackIntervalRef.current) {
            fallbackIntervalRef.current = setInterval(fetchNewMessages, 3000);
            console.log('🔄 Started fallback polling due to channel error');
          }
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Subscription timed out - enabling fallback polling');
          setRealTimeConnected(false);
          
          // Start fallback polling only when there's a timeout
          if (!fallbackIntervalRef.current) {
            fallbackIntervalRef.current = setInterval(fetchNewMessages, 3000);
            console.log('🔄 Started fallback polling due to timeout');
          }
        } else if (status === 'CLOSED') {
          console.log('🔥 Real-time channel closed');
          setRealTimeConnected(false);
        }
      });

    // Store channel reference for cleanup
    channelRef.current = channel;

    return () => {
      console.log('🔥 Cleaning up real-time listener for channel:', channelName);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      
      // Clear fallback polling
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [streamId, pinnedMessage?.message_id, replyingTo?.id, messages]);

  // Set up real-time listener for pinned messages
  useEffect(() => {
    if (!streamId) return;

    const pinnedChannel = supabase
      .channel(`pinned-messages-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pinned_messages',
          filter: `stream_id=eq.${streamId}`
        },
        async (payload) => {
          console.log('Message pinned:', payload);
          const pinnedData = payload.new;
          
          // Fetch the complete pinned message data
          const { data } = await supabase
            .from('pinned_messages')
            .select(`
              *,
              chat_messages (*)
            `)
            .eq('id', pinnedData.id)
            .single();
          
          if (data) {
            setPinnedMessage(data);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'pinned_messages',
          filter: `stream_id=eq.${streamId}`
        },
        (payload) => {
          console.log('Message unpinned:', payload);
          setPinnedMessage(null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pinnedChannel);
    };
  }, [streamId]);

  // Start fallback polling if real-time is not connected after initial load
  useEffect(() => {
    if (!isLoading && !realTimeConnected && lastFetchTime && !fallbackIntervalRef.current) {
      console.log('🔄 Starting fallback polling since real-time is not connected');
      fallbackIntervalRef.current = setInterval(fetchNewMessages, 3000);
    }
    
    return () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [isLoading, realTimeConnected, lastFetchTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !isAuthenticated || isSending) return;
    
    setIsSending(true);
    
    // Create optimistic message ID at the start
    const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
    
    try {
      console.log('🔥 Attempting to send message:', {
        streamId,
        walletAddress: effectiveWalletAddress,
        googleUserId: googleUser?.id,
        messageContent: message.trim(),
        isReply: !!replyingTo,
        replyToId: replyingTo?.id
      });

      let senderWalletAddress = '';
      let displayName = '';

      if (hasWalletCapability && effectiveWalletAddress) {
        // Wallet user
        senderWalletAddress = effectiveWalletAddress;
        
        // Get current user profile for display name
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('username, display_name')
          .eq('wallet_address', effectiveWalletAddress)
          .single();

        displayName = userProfile?.display_name || userProfile?.username || `${effectiveWalletAddress.slice(0, 4)}...${effectiveWalletAddress.slice(-4)}`;
      } else if (googleUser) {
        // Google user - use user ID as wallet address for consistency
        senderWalletAddress = googleUser.id;
        displayName = googleUser.user_metadata?.full_name || googleUser.email?.split('@')[0] || 'Google User';
      }
      
      console.log('🔥 Using display name:', displayName);
      
      // Create optimistic message for immediate UI update
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        sender_wallet_address: senderWalletAddress,
        sender_display_name: displayName,
        message_content: message.trim(),
        created_at: new Date().toISOString(),
        is_donation: false,
        is_deleted: false,
        reply_to_message_id: replyingTo?.id || null,
        is_reply: !!replyingTo,
        replied_message: replyingTo || undefined,
        isOptimistic: true
      };

      // Add optimistic message to state immediately
      setMessages(prev => [...prev, optimisticMessage]);
      optimisticMessageIds.current.add(optimisticId);

      // Clear the input and reply state immediately
      const messageToSend = message.trim();
      const replyToId = replyingTo?.id;
      setMessage('');
      setReplyingTo(null);

      // Insert message into database
      const { data: insertedMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          stream_id: streamId,
          sender_wallet_address: senderWalletAddress,
          sender_display_name: displayName,
          message_content: messageToSend,
          is_donation: false,
          reply_to_message_id: replyToId || null,
          is_reply: !!replyToId
        })
        .select()
        .single();

      if (error) {
        console.error('🔥 Error sending message:', error);
        toast.error('Failed to send message: ' + error.message);
        
        // Remove failed optimistic message
        setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
        optimisticMessageIds.current.delete(optimisticId);
        
        // Restore the input state
        setMessage(messageToSend);
        if (replyToId) {
          // Try to restore the reply context if possible
          const originalReplyMessage = messages.find(m => m.id === replyToId);
          if (originalReplyMessage) {
            setReplyingTo(originalReplyMessage);
          }
        }
        return;
      }

      console.log('✅ Message successfully inserted:', insertedMessage);

      // Replace optimistic message with real message
      if (insertedMessage) {
        optimisticMessageIds.current.delete(optimisticId);
        optimisticMessageIds.current.add(insertedMessage.id);
        
        // Create complete message with reply context
        const completeMessage: ChatMessage = {
          ...insertedMessage,
          replied_message: replyingTo || undefined
        };
        
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticId 
              ? completeMessage
              : msg
          )
        );
      }
      
      toast.success('Message sent!');
    } catch (error) {
      console.error('🔥 Error sending message:', error);
      toast.error('Failed to send message');
      
      // Remove failed optimistic message
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      optimisticMessageIds.current.delete(optimisticId);
    } finally {
      setIsSending(false);
    }
  };

  const handleReplyToMessage = (messageToReply: ChatMessage) => {
    setReplyingTo(messageToReply);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handlePinMessage = async (messageId: string) => {
    if (!isCreator || !effectiveWalletAddress) return;

    try {
      // Check if there's already a pinned message and remove it
      if (pinnedMessage) {
        await supabase
          .from('pinned_messages')
          .delete()
          .eq('stream_id', streamId);
      }

      // Pin the new message
      const { error } = await supabase
        .from('pinned_messages')
        .insert({
          stream_id: streamId,
          message_id: messageId,
          pinned_by_wallet_address: effectiveWalletAddress
        });

      if (error) {
        console.error('Error pinning message:', error);
        toast.error('Failed to pin message');
        return;
      }

      toast.success('Message pinned');
    } catch (error) {
      console.error('Error pinning message:', error);
      toast.error('Failed to pin message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!isCreator || !effectiveWalletAddress) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by_wallet_address: effectiveWalletAddress
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error deleting message:', error);
        toast.error('Failed to delete message');
        return;
      }

      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const parseDonationMessage = (messageContent: string) => {
    let tokenType: 'SOL' | 'WENLIVE' = 'SOL';
    let cleanMessage = messageContent;
    
    // Check if message has our metadata prefix
    if (messageContent?.startsWith('DONATION_TOKEN_TYPE:')) {
      const parts = messageContent.split('|');
      if (parts.length >= 2) {
        const tokenTypePart = parts[0];
        if (tokenTypePart.includes('WENLIVE')) {
          tokenType = 'WENLIVE';
        }
        // Extract the clean message and remove donation metadata
        cleanMessage = parts.slice(1).join('|');
        
        // Remove the donation amount info from the message
        cleanMessage = cleanMessage.replace(/\s*\(\d+\s+(SOL|WENLIVE)\s+donation\).*$/, '');
      }
    } else {
      // Fallback detection for older messages
      if (messageContent?.includes('WENLIVE') || messageContent?.includes('$WENLIVE')) {
        tokenType = 'WENLIVE';
      }
    }
    
    // Return a simple "Thanks for the [token]!" message
    return { tokenType, cleanMessage: `Thanks for the ${tokenType === 'WENLIVE' ? '$WENLIVE' : 'SOL'}!` };
  };

  const renderReplyContext = (repliedMessage: ChatMessage) => {
    if (!repliedMessage) return null;
    
    return (
      <div className="bg-white/5 border-l-2 border-solana/50 pl-2 py-1 mb-1 text-xs">
        <div className="flex items-center gap-1 text-solana/70">
          <Reply size={10} />
          <span>Replying to {repliedMessage.sender_display_name}</span>
        </div>
        <p className="text-white/60 truncate max-w-[200px]">
          {repliedMessage.message_content}
        </p>
      </div>
    );
  };

  const renderMessage = (msg: ChatMessage, isPinned = false) => {
    // Check if this message is currently pinned
    const isCurrentlyPinned = pinnedMessage?.message_id === msg.id;
    
    return (
      <div key={msg.id} className={`animate-fade-in group hover:bg-white/5 rounded-lg transition-colors relative ${isPinned ? 'bg-yellow-500/10 border border-yellow-500/20 p-3' : 'p-2'} ${msg.is_reply ? 'ml-4 border-l-2 border-white/20 pl-3' : ''} ${msg.isOptimistic ? 'opacity-70' : ''}`}>
        {msg.is_donation ? (
          <div className="bg-solana/20 p-2 rounded-lg">
            {(() => {
              const { tokenType, cleanMessage } = parseDonationMessage(msg.message_content);
              return (
                <>
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={14} className="text-solana-foreground" />
                    <span className="text-solana-foreground font-medium text-xs">
                      {msg.donation_amount} {tokenType} Donation
                    </span>
                    <span className="text-white/50 text-xs ml-auto">
                      {formatTime(msg.created_at)}
                    </span>
                    {isCurrentlyPinned && !isPinned && (
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Pin size={12} className="fill-current" />
                      </div>
                    )}
                    {isCreator && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-blue-500/20"
                          onClick={() => handleReplyToMessage(msg)}
                          title="Reply to message"
                        >
                          <Reply size={12} className="text-blue-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-yellow-500/20"
                          onClick={() => handlePinMessage(msg.id)}
                          title="Pin message"
                        >
                          <Pin size={12} className="text-yellow-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-red-500/20"
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete message"
                        >
                          <Trash2 size={12} className="text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {msg.replied_message && renderReplyContext(msg.replied_message)}
                  <div className="flex items-start gap-1 mt-1">
                    <div className="bg-white/10 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User size={12} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-solana font-medium text-xs">{msg.sender_display_name}</span>
                      <p className="text-white text-sm mt-0.5">{cleanMessage}</p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="flex items-start gap-1.5">
            <div className="bg-white/10 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <User size={12} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-solana font-medium text-xs">{msg.sender_display_name}</span>
                <span className="text-white/40 text-xs">
                  {formatTime(msg.created_at)}
                </span>
                {msg.isOptimistic && (
                  <span className="text-yellow-500 text-xs">Sending...</span>
                )}
                {isCurrentlyPinned && !isPinned && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Pin size={12} className="fill-current" />
                  </div>
                )}
                {isPinned && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Pin size={12} />
                    <span className="text-xs">Pinned</span>
                  </div>
                )}
                {msg.is_reply && (
                  <div className="flex items-center gap-1 text-blue-500">
                    <Reply size={12} />
                    <span className="text-xs">Reply</span>
                  </div>
                )}
              </div>
              {msg.replied_message && renderReplyContext(msg.replied_message)}
              <p className="text-white/90 text-sm break-words">{msg.message_content}</p>
            </div>
            {isCreator && !msg.isOptimistic && (
              <div className="flex gap-1 ml-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-blue-500/20"
                  onClick={() => handleReplyToMessage(msg)}
                  title="Reply to message"
                >
                  <Reply size={12} className="text-blue-500" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-yellow-500/20"
                  onClick={() => handlePinMessage(msg.id)}
                  title="Pin message"
                >
                  <Pin size={12} className="text-yellow-500" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-red-500/20"
                  onClick={() => handleDeleteMessage(msg.id)}
                  title="Delete message"
                >
                  <Trash2 size={12} className="text-red-500" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleEmojiSelect = (emoji: string) => {
    const input = messageInputRef.current;
    if (!input) {
      setMessage(prev => prev + emoji);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newMessage = message.slice(0, start) + emoji + message.slice(end);
    
    setMessage(newMessage);
    
    // Restore cursor position after emoji insertion
    setTimeout(() => {
      input.setSelectionRange(start + emoji.length, start + emoji.length);
      input.focus();
    }, 0);
  };

  return (
    <div className="flex flex-col h-full bg-secondary/50 rounded-lg border border-white/10">
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-solana" />
          <h3 className="text-white font-medium">Stream Chat</h3>
          {isCreator && (
            <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
              Moderator
            </span>
          )}
          {/* Real-time connection indicator */}
          <div className={`w-2 h-2 rounded-full ${realTimeConnected ? 'bg-green-500' : 'bg-yellow-500'}`} 
               title={realTimeConnected ? 'Real-time connected' : 'Using fallback polling'} />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: '625px' }}>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-solana"></div>
          </div>
        ) : (
          <>
            {/* Pinned message section */}
            {pinnedMessage && (
              <div className="mb-4">
                <div className="text-xs text-yellow-500 mb-2 flex items-center gap-1">
                  <Pin size={12} />
                  Pinned Message
                </div>
                {renderMessage(pinnedMessage.chat_messages, true)}
              </div>
            )}
            
            {/* Regular messages */}
            {messages.length === 0 ? (
              <div className="text-center text-white/60 py-8">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>No messages yet. Be the first to chat!</p>
              </div>
            ) : (
              messages.map((msg) => renderMessage(msg))
            )}
          </>
        )}
        <div ref={chatEndRef} />
      </div>
      
      {/* Message Input Section */}
      {isAuthenticated ? (
        <div className="border-t border-white/10">
          {/* Reply context */}
          {replyingTo && (
            <div className="p-2 bg-white/5 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Reply size={12} className="text-blue-500" />
                  <span>Replying to {replyingTo.sender_display_name}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 hover:bg-white/10"
                  onClick={cancelReply}
                  title="Cancel reply"
                >
                  <X size={12} className="text-white/50" />
                </Button>
              </div>
              <p className="text-xs text-white/50 truncate mt-1">
                {replyingTo.message_content}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-3">
            <div className="flex gap-2">
              <Input
                ref={messageInputRef}
                type="text"
                placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-black/30 border-white/10 focus:ring-solana focus:border-solana text-white"
                disabled={isSending}
                maxLength={500}
              />
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              <Button 
                type="submit" 
                className="bg-solana hover:bg-solana/90 text-white flex-shrink-0"
                disabled={!message.trim() || isSending}
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-3 border-t border-white/10">
          <Button 
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full bg-solana hover:bg-solana/90 text-white"
          >
            Login to Comment
          </Button>
        </div>
      )}
      
      {/* Donations Leaderboard - Separate section at the bottom */}
      <div className="border-t border-white/10">
        <DonationLeaderboard streamId={streamId} />
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default ChatBox;
