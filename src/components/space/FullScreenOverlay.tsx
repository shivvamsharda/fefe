
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Maximize2 } from 'lucide-react';
import { RemoteTrack, RemoteParticipant } from 'livekit-client';

interface FullScreenOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  track: RemoteTrack | null;
  participant: RemoteParticipant | null;
  participantName: string;
}

const FullScreenOverlay: React.FC<FullScreenOverlayProps> = ({
  isOpen,
  onClose,
  track,
  participant,
  participantName
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && track && videoRef.current) {
      track.attach(videoRef.current);
      return () => {
        track.detach();
      };
    }
  }, [isOpen, track]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close Button */}
      <Button
        onClick={onClose}
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
      >
        <X size={24} />
      </Button>

      {/* Participant Name */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/50 text-white px-3 py-1 rounded-md text-sm font-medium">
          {participantName}
        </div>
      </div>

      {/* Video Content */}
      <div className="w-full h-full flex items-center justify-center">
        {track ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-white text-center">
            <Maximize2 size={64} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No video track available</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <p className="text-white/70 text-sm">Press ESC or click X to exit full screen</p>
      </div>
    </div>
  );
};

export default FullScreenOverlay;
