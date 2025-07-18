
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWallet } from '@/context/WalletContext';
import { DollarSign, Loader2 } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { calculatePlatformFee, sendDonation } from '@/services/walletService';
import { useTips } from '@/context/TipContext';
import { supabase } from '@/integrations/supabase/client';

interface DonationPanelProps {
  streamId: string;
  creatorName: string;
  creatorWallet: string;
}

const DonationPanel = ({ streamId, creatorName, creatorWallet }: DonationPanelProps) => {
  // Updated donation panel to use unified wallet capability
  const { 
    hasWalletCapability, 
    effectiveWalletAddress, 
    canTransact, 
    getUnifiedProvider,
    connected, 
    publicKey, 
    solBalance, 
    wenliveBalance,
    currentWallet,
    wallets
  } = useWallet();
  
  const [donationAmount, setDonationAmount] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [tokenType, setTokenType] = useState<'SOL' | 'WENLIVE'>('SOL');
  const [donationMessage, setDonationMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showTip } = useTips();

  const presetAmounts = [0.5, 1, 2, 5, 10];
  const currentBalance = tokenType === 'SOL' ? solBalance : wenliveBalance;
  
  // Get the current wallet provider
  const getCurrentProvider = () => {
    if (!currentWallet) return null;
    return wallets.find(wallet => wallet.name === currentWallet)?.provider || null;
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d{0,9}$/.test(value)) {
      setCustomAmount(value);
      
      if (value !== '') {
        const numValue = parseFloat(value);
        setDonationAmount(numValue);
        setIsCustomAmount(true);
      }
    }
  };

  const selectPresetAmount = (amount: number) => {
    setDonationAmount(amount);
    setCustomAmount('');
    setIsCustomAmount(false);
  };

  const handleDonate = async () => {
    if (!hasWalletCapability || !effectiveWalletAddress) {
      toast.error("Please connect your wallet or sign in to donate");
      return;
    }
    
    if (!canTransact) {
      toast.error("Your wallet doesn't support transactions");
      return;  
    }
    
    if (!creatorWallet) {
      toast.error("Creator wallet address is missing");
      return;
    }

    // Validate donation amount
    if (donationAmount <= 0) {
      toast.error("Please enter a valid donation amount");
      return;
    }

    if (currentBalance !== null && donationAmount > currentBalance) {
      toast.error(`Insufficient ${tokenType} balance for this donation`);
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const provider = getUnifiedProvider();
      if (!provider) {
        toast.error("Could not initialize wallet provider");
        setIsProcessing(false);
        return;
      }
      
      const platformFee = calculatePlatformFee(donationAmount);
      const creatorAmount = donationAmount - platformFee;
      
      // Inform user about the fee
      toast.info(`Your donation will be split as follows:`, {
        description: `${creatorAmount.toFixed(2)} ${tokenType} to creator, ${platformFee.toFixed(2)} ${tokenType} platform fee (20%)`,
        duration: 3000,
      });
      
      // Create a public key from the effective wallet address
      const senderPublicKey = new PublicKey(effectiveWalletAddress);

      console.log('🚀 Starting stream donation process:', {
        streamId,
        donor: effectiveWalletAddress,
        creator: creatorWallet,
        amount: donationAmount,
        tokenType: tokenType
      });
      
      // Send the donation using our wallet service
      const signature = await sendDonation(
        provider, 
        senderPublicKey, 
        creatorWallet, 
        donationAmount,
        tokenType,
        donationMessage
      );
      
      if (signature) {
        console.log('✅ Stream donation transaction successful');

        // Get user profiles for display name and user IDs - but don't require them for stream donations
        const { data: userProfile, error: userError } = await supabase
          .from('user_profiles')
          .select('username, display_name')
          .eq('wallet_address', effectiveWalletAddress)
          .single();

        const { data: creatorProfile, error: creatorError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', creatorWallet)
          .single();

        const { data: donorProfile, error: donorError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('wallet_address', effectiveWalletAddress)
          .single();

        console.log('📋 Profile lookup results for stream donation:', {
          userProfile: userProfile ? 'found' : 'not found',
          userError: userError?.message || 'none',
          creatorProfile: creatorProfile?.id || 'not found',
          creatorError: creatorError?.message || 'none',
          donorProfile: donorProfile?.id || 'not found',
          donorError: donorError?.message || 'none'
        });

        const displayName = userProfile?.display_name || userProfile?.username || `${effectiveWalletAddress.slice(0, 4)}...${effectiveWalletAddress.slice(-4)}`;
        
        // Create donation record for stream donation
        const donationRecord = {
          creator_user_id: creatorProfile?.id || null, // NULL if creator profile not found
          donor_user_id: donorProfile?.id || null,     // NULL if donor profile not found
          stream_id: streamId,                         // Always has stream_id for stream donations
          amount_sol: donationAmount,
          token_type: tokenType,
          message: donationMessage,
          transaction_signature: signature,
          donor_wallet_address: effectiveWalletAddress,
          creator_wallet_address: creatorWallet
        };

        console.log('💾 Inserting stream donation record:', donationRecord);

        const { data: insertedDonation, error: donationError } = await supabase
          .from('donations')
          .insert(donationRecord)
          .select();

        if (donationError) {
          console.error('❌ Error storing stream donation record:', donationError);
          toast.error("Donation succeeded but failed to record", {
            description: "Your donation went through but we couldn't save the record. Contact support if needed."
          });
        } else {
          console.log('✅ Stream donation record stored successfully:', insertedDonation);
        }
        
        // Create message content that includes token type information
        const messageContent = donationMessage || `Thanks for the ${tokenType}!`;
        const donationMessageWithToken = `${messageContent} (${donationAmount} ${tokenType} donation)`;
        
        // Add donation message to chat with explicit token type metadata
        const { data: chatMessage, error: chatError } = await supabase
          .from('chat_messages')
          .insert({
            stream_id: streamId,
            sender_wallet_address: effectiveWalletAddress,
            sender_display_name: displayName,
            message_content: `DONATION_TOKEN_TYPE:${tokenType}|${donationMessageWithToken}`,
            is_donation: true,
            donation_amount: donationAmount
          })
          .select();

        if (chatError) {
          console.error('❌ Error storing chat message:', chatError);
        } else {
          console.log('✅ Chat message stored successfully:', chatMessage);
        }
        
        // Show success message
        toast.success(`Thank you for your support!`, {
          description: `You donated ${donationAmount} ${tokenType} to ${creatorName}`,
        });
        
        // Show the floating tip notification with the correct token type
        showTip({
          id: signature,
          username: displayName,
          amount: donationAmount,
          message: donationMessage,
          timestamp: new Date(),
          tokenType: tokenType
        });
        
        // Reset form
        setDonationMessage('');
        if (isCustomAmount) {
          setCustomAmount('');
          setIsCustomAmount(false);
          setDonationAmount(presetAmounts[1]); // Reset to default amount
        }
      } else {
        console.log('❌ Stream donation transaction failed');
      }
    } catch (error: any) {
      console.error("❌ Error processing stream donation:", error);
      toast.error("Donation failed", {
        description: error.message || "Could not process your donation",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-secondary/50 rounded-lg border border-white/10 p-4">
      <h3 className="text-white font-medium mb-4 flex items-center gap-1">
        <DollarSign size={18} className="text-solana" />
        Support {creatorName}
      </h3>
      
      {hasWalletCapability ? (
        <div>
          <div className="mb-4">
            <label className="text-white/70 text-sm block mb-1">Token Type</label>
            <Select value={tokenType} onValueChange={(value: 'SOL' | 'WENLIVE') => setTokenType(value)}>
              <SelectTrigger className="bg-black/30 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOL">SOL</SelectItem>
                <SelectItem value="WENLIVE">$WENLIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <label className="text-white/70 text-sm block mb-1">Select Amount ({tokenType})</label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  className={`py-1 rounded-md text-sm ${
                    !isCustomAmount && donationAmount === amount
                      ? 'bg-solana text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                  onClick={() => selectPresetAmount(amount)}
                  disabled={isProcessing}
                >
                  {amount}
                </button>
              ))}
            </div>
            
            {/* Custom amount input */}
            <div className="mt-2">
              <label className="text-white/70 text-sm block mb-1">Custom Amount</label>
              <div className="relative">
                <Input 
                  type="text"
                  placeholder="Enter custom amount"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className={`bg-black/30 border ${
                    isCustomAmount ? 'border-solana' : 'border-white/10'
                  } text-white`}
                  disabled={isProcessing}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50">
                  {tokenType}
                </span>
              </div>
            </div>
            
            <div className="text-right text-xs text-white/50 flex justify-between mt-1">
              <span>Platform fee: 20%</span>
              <span>Your balance: {currentBalance?.toFixed(2) || 0} {tokenType}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="text-white/70 text-sm block mb-1">Message (optional)</label>
            <textarea
              value={donationMessage}
              onChange={(e) => setDonationMessage(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-md text-white p-2 text-sm h-16 resize-none focus:ring-solana focus:border-solana"
              placeholder="Add a message with your donation"
              disabled={isProcessing}
            />
          </div>
          
          <Button 
            className="w-full bg-solana hover:bg-solana/90 text-white"
            onClick={handleDonate}
            disabled={
              isProcessing || 
              !donationAmount || 
              donationAmount <= 0 || 
              (currentBalance !== null && donationAmount > currentBalance)
            }
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Processing...
              </>
            ) : (
              `Donate ${donationAmount} ${tokenType}`
            )}
          </Button>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-white/70 mb-3">Connect your wallet or sign in to support this creator</p>
          <Button className="bg-solana hover:bg-solana/90 text-white">
            Connect Wallet or Sign In
          </Button>
        </div>
      )}
    </div>
  );
};

export default DonationPanel;
