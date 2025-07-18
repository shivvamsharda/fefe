
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, DollarSign } from 'lucide-react';
import ChatBox from './ChatBox';
import DonationPanel from './DonationPanel';
import { useWallet } from '@/context/WalletContext';

interface StreamInteractionProps {
  streamId: string;
  creatorName?: string;
  creatorWallet?: string;
}

const StreamInteraction = ({ streamId, creatorName, creatorWallet }: StreamInteractionProps) => {
  const { connected } = useWallet();

  return (
    <div className="bg-secondary/50 rounded-lg border border-white/10 overflow-hidden">
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="w-full bg-black/30 border-b border-white/10 rounded-none h-12">
          <TabsTrigger 
            value="chat" 
            className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70"
          >
            <MessageCircle size={18} className="mr-2" />
            Chat
          </TabsTrigger>
          <TabsTrigger 
            value="donate" 
            className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70"
          >
            <DollarSign size={18} className="mr-2" />
            Donate
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="m-0 border-none">
          <div className="h-[700px]">
            <ChatBox streamId={streamId} streamCreatorWallet={creatorWallet} />
          </div>
        </TabsContent>
        
        <TabsContent value="donate" className="m-0 border-none p-4">
          {connected && creatorWallet && creatorName ? (
            <DonationPanel 
              streamId={streamId} 
              creatorName={creatorName}
              creatorWallet={creatorWallet} 
            />
          ) : (
            <div className="text-center py-8">
              <DollarSign size={48} className="mx-auto mb-4 text-white/30" />
              <p className="text-white/70 mb-2">Connect your wallet to support this creator</p>
              <p className="text-white/50 text-sm">
                {!connected ? 'Wallet connection required' : 'Creator information unavailable'}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StreamInteraction;
