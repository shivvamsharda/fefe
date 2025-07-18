
import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface BunnyPlayerProps {
  playbackUrl: string;
  thumbnailUrl?: string;
  title?: string;
  autoPlay?: boolean;
  controls?: boolean;
  width?: string | number;
  height?: string | number;
  className?: string;
  onError?: () => void;
}

const BunnyPlayer: React.FC<BunnyPlayerProps> = ({
  playbackUrl,
  thumbnailUrl,
  title,
  autoPlay = false,
  controls = true,
  width = "100%",
  height = "auto",
  className = "",
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    // Check if the playback URL is HLS (.m3u8)
    const isHLS = playbackUrl.includes('.m3u8');

    if (isHLS) {
      // Use hls.js for HLS streams
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: false,
        });
        hlsRef.current = hls;
        
        hls.loadSource(playbackUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed, video ready to play');
          if (autoPlay) {
            // Ensure video is muted for autoplay
            video.muted = true;
            video.play().catch(error => {
              console.error('Autoplay failed:', error);
              if (onError) onError();
            });
          }
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
          if (onError) onError();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = playbackUrl;
        if (autoPlay) {
          video.muted = true;
          video.play().catch(error => {
            console.error('Autoplay failed:', error);
            if (onError) onError();
          });
        }
      } else {
        console.error('HLS is not supported in this browser');
        if (onError) onError();
      }
    } else {
      // Direct video URL (MP4, etc.)
      video.src = playbackUrl;
      if (autoPlay) {
        video.muted = true;
        video.play().catch(error => {
          console.error('Autoplay failed:', error);
          if (onError) onError();
        });
      }
    }

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playbackUrl, autoPlay, onError]);

  return (
    <div className={`bunny-player-container ${className}`}>
      <video
        ref={videoRef}
        poster={thumbnailUrl}
        title={title}
        autoPlay={autoPlay}
        muted={autoPlay} // Always mute when autoplay is enabled
        controls={controls}
        width={width}
        height={height}
        className="w-full h-full rounded-lg"
        preload="metadata"
        playsInline // Important for mobile autoplay
      >
        Your browser does not support video playback.
      </video>
    </div>
  );
};

export default BunnyPlayer;
