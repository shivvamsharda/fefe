
import React from 'react';

interface KickChatProps {
  channelName: string;
}

const KickChat: React.FC<KickChatProps> = ({ channelName }) => {
  const chatUrl = `https://kick.com/popout/${channelName}/chat`;

  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden border border-border flex flex-col">
      <div className="bg-card border-b border-border px-4 py-2 flex-shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Chat</h3>
      </div>
      <iframe
        src={chatUrl}
        className="w-full flex-1"
        frameBorder="0"
        allow="clipboard-write"
        title={`${channelName} Kick Chat`}
      />
    </div>
  );
};

export default KickChat;
