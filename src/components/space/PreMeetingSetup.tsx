
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Camera, CameraOff, Mic, MicOff, Users } from 'lucide-react';

interface PreMeetingSetupProps {
  onJoinMeeting: (videoEnabled: boolean, audioEnabled: boolean) => void;
  meetingTitle: string;
  isHost?: boolean;
}

const PreMeetingSetup: React.FC<PreMeetingSetupProps> = ({
  onJoinMeeting,
  meetingTitle,
  isHost = false
}) => {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const setupMedia = async () => {
      try {
        if (videoEnabled) {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: audioEnabled
          });
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
      }
    };

    setupMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoEnabled, audioEnabled]);

  const handleJoinMeeting = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onJoinMeeting(videoEnabled, audioEnabled);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Users size={24} />
            {meetingTitle}
          </CardTitle>
          <p className="text-muted-foreground">
            {isHost ? 'Setup your camera and microphone as the host' : 'Setup your camera and microphone before joining'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Preview */}
          <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            {videoEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CameraOff size={48} className="text-gray-500" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={20} />
                <Label htmlFor="video-toggle">Camera</Label>
              </div>
              <Switch
                id="video-toggle"
                checked={videoEnabled}
                onCheckedChange={setVideoEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic size={20} />
                <Label htmlFor="audio-toggle">Microphone</Label>
              </div>
              <Switch
                id="audio-toggle"
                checked={audioEnabled}
                onCheckedChange={setAudioEnabled}
              />
            </div>
          </div>

          {/* Join Button */}
          <Button 
            onClick={handleJoinMeeting}
            className="w-full"
            size="lg"
          >
            <Users size={20} className="mr-2" />
            {isHost ? 'Start Space' : 'Join Space'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreMeetingSetup;
