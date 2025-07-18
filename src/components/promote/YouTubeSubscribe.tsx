
import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface YouTubeSubscribeProps {
  channelName: string;
}

const YouTubeSubscribe: React.FC<YouTubeSubscribeProps> = ({ channelName }) => {
  const handleSubscribe = () => {
    const subscribeUrl = `https://www.youtube.com/channel/${channelName}?sub_confirmation=1`;
    window.open(subscribeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      onClick={handleSubscribe}
      variant="outline"
      size="sm"
      className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
    >
      <ExternalLink className="w-4 h-4 mr-2" />
      Subscribe on YouTube
    </Button>
  );
};

export default YouTubeSubscribe;
