import React, { useState, useEffect } from 'react';
import MuxPlayerReact from '@mux/mux-player-react';
import { Card } from '@/components/ui/card';
import { Info, Monitor, AlertCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVodViewerTracking } from '@/hooks/useVodViewerTracking';
import { useVodWatchSession } from '@/hooks/useVodWatchSession';

interface MuxPlayerProps {
  playbackId?: string;
  isLive?: boolean; 
  title?: string;
  insetMode?: boolean;
  onRetry?: () => void;
  vodId?: string; // Add vodId prop for tracking
  userId?: string; // Add userId prop for session tracking
}

const MuxPlayer = ({ 
  playbackId, 
  isLive = true,
  title = 'Stream Content',
  insetMode = false,
  onRetry,
  vodId,
  userId
}: MuxPlayerProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const isMockStream = playbackId?.startsWith('mock_playback_');
  const isValidPlaybackId = !!playbackId && playbackId.trim() !== '';

  // Use VOD viewer tracking for anonymous users (existing system)
  useVodViewerTracking(vodId || '', !isLive && isPlaying);

  // Use VOD watch session tracking for authenticated users (new system)
  useVodWatchSession(vodId || '', !isLive && isPlaying, userId);

  useEffect(() => {
    console.log(`MuxPlayer: Optimized loading for playback ID: "${playbackId}" - isLive: ${isLive}`);
  }, [playbackId, isLive]);

  useEffect(() => {
    if (playbackId) {
      setHasError(false);
      setIsLoaded(false);
      setRetryCount(0);
      setIsConnecting(true);
      
      // Reduced timeout for much faster feedback
      const timer = setTimeout(() => {
        setIsConnecting(false);
      }, 500); // Reduced from 1000ms to 500ms
      
      return () => clearTimeout(timer);
    }
  }, [playbackId]);

  // Much faster retry logic with immediate retries
  useEffect(() => {
    if (isLive && hasError && retryCount < 3 && isValidPlaybackId && !isMockStream) {
      const backoffDelay = Math.min(200 + (retryCount * 200), 1000); // Much faster retries
      console.log(`Quick retry in ${backoffDelay}ms (attempt ${retryCount + 1})...`);
      const timer = setTimeout(() => {
        setHasError(false);
        setRetryCount(prev => prev + 1);
      }, backoffDelay);
      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount, isValidPlaybackId, isMockStream, isLive]);

  if (!isValidPlaybackId) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-500/70" />
          <h3 className="text-xl mb-3">Stream Unavailable</h3>
          <p className="text-white/70">
            This content doesn't have a valid playback ID.
          </p>
          {onRetry && (
            <Button 
              onClick={onRetry}
              className="mt-4 bg-solana hover:bg-solana/90"
            >
              Refresh
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (isLive && isMockStream) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <h3 className="text-xl mb-3">Stream Preview</h3>
          <div className="flex justify-center mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping mr-2"></div>
            <span className="text-white/90">LIVE</span>
          </div>
          <p className="text-white/70">
            This is a preview of how your stream would appear.
            <br />
            Your actual stream will be visible here once you go live.
          </p>
        </div>
      </Card>
    );
  }

  // Extremely fast initial loading
  if (isConnecting && !isLoaded && !hasError) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-solana/30 border-t-solana rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-white/70 text-sm">Connecting...</p>
        </div>
      </div>
    );
  }
  
  // Faster error state with immediate retry
  if (hasError && (!isLive || retryCount >= 3)) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-destructive" />
          <h3 className="text-xl mb-3">Connection Issue</h3>
          <p className="text-white/70 mb-4">
            {isLive ? "Stream may not be active or there's a temporary connection issue." : "Please try again."}
          </p>
          <Button 
            onClick={() => {
              if (onRetry && isLive) {
                onRetry();
              }
              setHasError(false);
              setRetryCount(0);
              setIsConnecting(true);
              setTimeout(() => setIsConnecting(false), 200);
            }}
            className="px-4 py-2 bg-solana text-white rounded-md hover:bg-solana/90"
          >
            Retry Connection
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`w-full aspect-video rounded-lg overflow-hidden ${insetMode ? 'relative' : ''}`}>
      <MuxPlayerReact
        key={`mux-player-${playbackId}-${retryCount}`}
        streamType={isLive ? "live" : "on-demand"}
        playbackId={playbackId}
        metadata={{
          video_title: title,
          viewer_user_id: userId || "anonymous-user"
        }}
        autoPlay
        muted={isLive}
        preload="auto"
        primaryColor="#14F195"
        secondaryColor="#9945FF"
        style={{ 
          height: '100%', 
          width: '100%',
          display: 'block'
        }}
        onLoadStart={() => {
          console.log(`Stream connecting (${isLive ? 'live' : 'VOD'})`, { playbackId, userId });
          setIsLoaded(false);
          setIsConnecting(false);
        }}
        onLoadedData={() => {
          console.log(`Stream ready (${isLive ? 'live' : 'VOD'})`, { playbackId, userId });
          setIsLoaded(true);
          setHasError(false);
          setIsConnecting(false);
        }}
        onError={(e) => {
          console.error(`Stream error (${isLive ? 'live' : 'VOD'}):`, e, { playbackId, userId });
          setIsLoaded(false);
          setHasError(true);
          setIsConnecting(false);
          setIsPlaying(false);
        }}
        onPlaying={() => {
          console.log(`Stream playing (${isLive ? 'live' : 'VOD'})`, { playbackId, userId });
          setIsLoaded(true);
          setHasError(false);
          setIsConnecting(false);
          setIsPlaying(true);
        }}
        onPause={() => {
          console.log(`Stream paused (${isLive ? 'live' : 'VOD'})`, { playbackId, userId });
          setIsPlaying(false);
        }}
      />
      
      {!insetMode && isLive && (
        <div className="mt-2 p-3 bg-black/30 rounded-md border border-white/10">
          <div className="flex items-center gap-2">
            <Monitor size={14} className="text-solana" />
            <span className="text-xs text-white/70">
              Streaming with <a href="https://obsproject.com/" target="_blank" rel="noopener noreferrer" className="text-solana hover:underline">OBS Studio</a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MuxPlayer;
