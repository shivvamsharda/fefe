import React, { useState, useEffect } from 'react';
import MuxPlayerReact from '@mux/mux-player-react';
import { Card } from '@/components/ui/card';
import { Info, Monitor, AlertCircle, PlayCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StreamPreviewPlayerProps {
  playbackId?: string;
  title?: string;
  onRetry?: () => void;
  userId?: string;
}

const StreamPreviewPlayer = ({ 
  playbackId, 
  title = 'Stream Preview',
  onRetry,
  userId
}: StreamPreviewPlayerProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [latencyInfo, setLatencyInfo] = useState<{
    currentLatency?: number;
    targetLatency?: number;
    isLowLatency?: boolean;
  }>({});

  const isMockStream = playbackId?.startsWith('mock_playback_');
  const isValidPlaybackId = !!playbackId && playbackId.trim() !== '';

  useEffect(() => {
    console.log(`StreamPreviewPlayer: Ultra-low latency loading for playback ID: "${playbackId}"`);
  }, [playbackId]);

  useEffect(() => {
    if (playbackId) {
      setHasError(false);
      setIsLoaded(false);
      setRetryCount(0);
      setIsConnecting(true);
      
      // Very fast timeout for preview - immediate feedback
      const timer = setTimeout(() => {
        setIsConnecting(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [playbackId]);

  // Ultra-fast retry logic for preview
  useEffect(() => {
    if (hasError && retryCount < 3 && isValidPlaybackId && !isMockStream) {
      const backoffDelay = Math.min(100 + (retryCount * 100), 500); // Even faster retries
      console.log(`Ultra-fast preview retry in ${backoffDelay}ms (attempt ${retryCount + 1})...`);
      const timer = setTimeout(() => {
        setHasError(false);
        setRetryCount(prev => prev + 1);
      }, backoffDelay);
      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount, isValidPlaybackId, isMockStream]);

  if (!isValidPlaybackId) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-500/70" />
          <h3 className="text-xl mb-3">Preview Unavailable</h3>
          <p className="text-white/70">
            Stream preview doesn't have a valid playback ID.
          </p>
          {onRetry && (
            <Button 
              onClick={onRetry}
              className="mt-4 bg-solana hover:bg-solana/90"
            >
              Refresh Preview
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (isMockStream) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <h3 className="text-xl mb-3">Stream Preview</h3>
          <div className="flex justify-center mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping mr-2"></div>
            <span className="text-white/90">LIVE PREVIEW</span>
          </div>
          <p className="text-white/70">
            This is a preview of how your stream appears to viewers.
            <br />
            The actual stream will be visible here once you go live.
          </p>
        </div>
      </Card>
    );
  }

  // Ultra-fast initial loading
  if (isConnecting && !isLoaded && !hasError) {
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-solana/30 border-t-solana rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-white/70 text-sm">Connecting to preview...</p>
        </div>
      </div>
    );
  }
  
  // Fast error state with immediate retry
  if (hasError && retryCount >= 3) {
    return (
      <Card className="w-full aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-destructive" />
          <h3 className="text-xl mb-3">Preview Connection Issue</h3>
          <p className="text-white/70 mb-4">
            Stream preview may not be active or there's a temporary connection issue.
          </p>
          <Button 
            onClick={() => {
              if (onRetry) {
                onRetry();
              }
              setHasError(false);
              setRetryCount(0);
              setIsConnecting(true);
              setTimeout(() => setIsConnecting(false), 100);
            }}
            className="px-4 py-2 bg-solana text-white rounded-md hover:bg-solana/90"
          >
            Retry Preview
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden relative">
      <MuxPlayerReact
        key={`preview-player-${playbackId}-${retryCount}`}
        streamType="ll-live"
        playbackId={playbackId}
        metadata={{
          video_title: `${title} (Preview)`,
          viewer_user_id: userId || "creator-preview"
        }}
        autoPlay
        muted
        preload="auto"
        primaryColor="#14F195"
        secondaryColor="#9945FF"
        style={{ 
          height: '100%', 
          width: '100%',
          display: 'block'
        }}
        onLoadStart={() => {
          console.log(`Preview stream connecting (ultra-low latency)`, { playbackId, userId });
          setIsLoaded(false);
          setIsConnecting(false);
        }}
        onLoadedData={() => {
          console.log(`Preview stream ready (ultra-low latency)`, { playbackId, userId });
          setIsLoaded(true);
          setHasError(false);
          setIsConnecting(false);
          setLatencyInfo({
            isLowLatency: true,
            targetLatency: 1000 // Target 1 second latency
          });
        }}
        onError={(e) => {
          console.error(`Preview stream error (ultra-low latency):`, e, { playbackId, userId });
          setIsLoaded(false);
          setHasError(true);
          setIsConnecting(false);
        }}
        onPlaying={() => {
          console.log(`Preview stream playing (ultra-low latency)`, { playbackId, userId });
          setIsLoaded(true);
          setHasError(false);
          setIsConnecting(false);
        }}
      />
      
      {/* Latency indicator for creator */}
      {isLoaded && (
        <div className="absolute top-2 right-2 bg-black/70 rounded-md px-2 py-1 flex items-center gap-1">
          <Wifi size={12} className="text-green-500" />
          <span className="text-xs text-white/90">
            {latencyInfo.isLowLatency ? 'Low Latency' : 'Preview'}
          </span>
        </div>
      )}
      
      {/* Preview mode indicator */}
      <div className="absolute bottom-2 left-2 bg-black/70 rounded-md px-2 py-1 flex items-center gap-1">
        <Monitor size={12} className="text-solana" />
        <span className="text-xs text-white/90">Creator Preview</span>
      </div>
    </div>
  );
};

export default StreamPreviewPlayer;
