
import React from 'react';
import YouTubeSubscribe from './YouTubeSubscribe';

interface YouTubeChatProps {
  videoId: string;
  channelName?: string;
}

const YouTubeChat: React.FC<YouTubeChatProps> = ({ videoId, channelName }) => {
  const parentDomain = window.location.hostname;
  const chatUrl = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${parentDomain}`;

  return (
    <div className="w-full h-full bg-background rounded-lg overflow-hidden border border-border flex flex-col">
      <div className="bg-card border-b border-border px-4 py-2 flex-shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Chat</h3>
        {channelName && (
          <YouTubeSubscribe channelName={channelName} />
        )}
      </div>
      <iframe
        src={chatUrl}
        className="w-full flex-1"
        frameBorder="0"
        allow="clipboard-write"
        title={`YouTube Live Chat`}
      />
    </div>
  );
};

export default YouTubeChat;
