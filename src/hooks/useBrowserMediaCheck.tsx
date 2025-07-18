
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useBrowserMediaCheck = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const { toast } = useToast();

  const checkMediaPermissions = async () => {
    setIsCheckingPermissions(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Check for video tracks
      const videoTracks = stream.getVideoTracks();
      setHasCameraPermission(videoTracks.length > 0);
      
      // Check for audio tracks
      const audioTracks = stream.getAudioTracks();
      setHasAudioPermission(audioTracks.length > 0);
      
      // Stop all tracks to release the camera/mic
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('Error checking media permissions:', error);
      setHasCameraPermission(false);
      setHasAudioPermission(false);
      
      toast({
        title: 'Camera or Microphone Access Denied',
        description: 'Please enable camera and microphone access in your browser settings.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  return {
    hasCameraPermission,
    hasAudioPermission,
    isCheckingPermissions,
    checkMediaPermissions,
  };
};
