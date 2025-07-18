
import React from 'react';

interface TwitchChatProps {
  channelName: string;
  parentDomain: string;
}

const TwitchChat: React.FC<TwitchChatProps> = ({ channelName, parentDomain }) => {
  const chatUrl = `https://www.twitch.tv/embed/${channelName}/chat?parent=${parentDomain}&darkpopout`;

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
        title={`${channelName} Chat`}
      />
    </div>
  );
};

export default TwitchChat;
