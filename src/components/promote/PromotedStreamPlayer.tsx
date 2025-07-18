
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PromotedStreamPlayerProps {
  embedUrl: string;
  platform: string;
  streamUrl: string;
  title: string;
}

const PromotedStreamPlayer: React.FC<PromotedStreamPlayerProps> = ({
  embedUrl,
  platform,
  streamUrl,
  title,
}) => {
  const [finalEmbedUrl, setFinalEmbedUrl] = useState(embedUrl);
  const [isLoading, setIsLoading] = useState(false);

  // Generate proper embed URL for Twitch and Kick streams on component mount
  useEffect(() => {
    const generateProperEmbedUrl = async () => {
      console.log(`PromotedStreamPlayer: Initial embedUrl for ${platform}:`, embedUrl);
      console.log(`PromotedStreamPlayer: streamUrl for ${platform}:`, streamUrl);
      
      if ((platform === 'twitch' || platform === 'kick') && streamUrl) {
        setIsLoading(true);
        try {
          console.log(`Calling generate-embed-url function for ${platform}...`);
          const { data, error } = await supabase.functions.invoke('generate-embed-url', {
            body: {
              streamUrl,
              platform,
              referer: window.location.origin
            }
          });

          console.log(`Generate-embed-url response for ${platform}:`, { data, error });

          if (!error && data?.embedUrl) {
            console.log(`Updated embedUrl for ${platform}: ${data.embedUrl}`);
            setFinalEmbedUrl(data.embedUrl);
          } else {
            console.warn(`Failed to generate embed URL for ${platform}, using fallback:`, error);
            // Fallback: generate the correct URL manually for Kick
            if (platform === 'kick') {
              const channelMatch = streamUrl.match(/kick\.com\/([^/?]+)/);
              if (channelMatch) {
                const fallbackUrl = `https://player.kick.com/${channelMatch[1]}`;
                console.log(`Using manual fallback URL for Kick: ${fallbackUrl}`);
                setFinalEmbedUrl(fallbackUrl);
              }
            }
          }
        } catch (error) {
          console.error(`Failed to generate proper embed URL for ${platform}:`, error);
          // Fallback: generate the correct URL manually for Kick
          if (platform === 'kick') {
            const channelMatch = streamUrl.match(/kick\.com\/([^/?]+)/);
            if (channelMatch) {
              const fallbackUrl = `https://player.kick.com/${channelMatch[1]}`;
              console.log(`Using manual fallback URL for Kick after error: ${fallbackUrl}`);
              setFinalEmbedUrl(fallbackUrl);
            }
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    generateProperEmbedUrl();
  }, [platform, streamUrl, embedUrl]);

  // For Twitter/X, redirect to external link since they don't support iframe embedding
  if (platform === 'twitter') {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-white mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
          <p className="text-white mb-4">This content is hosted on X (Twitter)</p>
          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg inline-block"
          >
            View on X
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-white/70 text-sm">Loading stream...</p>
        </div>
      </div>
    );
  }

  console.log(`PromotedStreamPlayer: Final embed URL for ${platform}:`, finalEmbedUrl);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        src={finalEmbedUrl}
        title={title}
        className="w-full h-full"
        frameBorder="0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
};

export default PromotedStreamPlayer;
