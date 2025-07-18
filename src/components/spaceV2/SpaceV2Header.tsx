
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Play, Square, LogOut, UserPlus } from 'lucide-react';
import { ConnectionState } from 'livekit-client';
import { toast } from 'sonner';
import type { SpaceV2 } from '@/services/spacesV2Service';

interface SpaceV2HeaderProps {
  space: SpaceV2;
  roomName: string;
  isHost: boolean;
  category: string;
  setCategory: (category: string) => void;
  connectionState: ConnectionState;
  localScreenShare: any;
  remoteScreenShares: Map<string, any>;
  onGoLive: () => void;
  onEndSpace: () => void;
  onLeaveSpace: () => void;
}

const SpaceV2Header: React.FC<SpaceV2HeaderProps> = ({
  space,
  roomName,
  isHost,
  category,
  setCategory,
  connectionState,
  localScreenShare,
  remoteScreenShares,
  onGoLive,
  onEndSpace,
  onLeaveSpace
}) => {
  const copyRoomLink = async () => {
    const baseUrl = window.location.href.split('?')[0]; // Remove any existing parameters
    const viewerUrl = `${baseUrl}?invite=viewer`; // Add viewer invitation parameter
    try {
      await navigator.clipboard.writeText(viewerUrl);
      toast.success('Viewer link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const copyParticipantInvite = async () => {
    const baseUrl = window.location.href.split('?')[0];
    const inviteUrl = `${baseUrl}?invite=participant`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Participant invitation link copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy invitation link');
    }
  };

  return (
    <div className="bg-black border-b border-gray-800 p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-white">{space.title}</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          onClick={copyRoomLink}
          variant="outline"
          size="sm"
          className="text-white border-gray-700 hover:bg-gray-900 hover:border-primary/50"
        >
          <Copy size={16} className="mr-1" />
          Copy Link
        </Button>

        {isHost && (
          <Button
            onClick={copyParticipantInvite}
            variant="outline"
            size="sm"
            className="text-white border-gray-700 hover:bg-gray-900 hover:border-primary/50"
          >
            <UserPlus size={16} className="mr-1" />
            Invite Participants
          </Button>
        )}

        {isHost && (
          <>
            {!space.is_live ? (
              <div className="flex items-center gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-32 bg-gray-900 border-gray-700 text-white hover:bg-gray-800">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700">
                    <SelectItem value="memecoins" className="text-white hover:bg-gray-800">Memecoins</SelectItem>
                    <SelectItem value="gaming" className="text-white hover:bg-gray-800">Gaming</SelectItem>
                    <SelectItem value="dev" className="text-white hover:bg-gray-800">Development</SelectItem>
                    <SelectItem value="trading" className="text-white hover:bg-gray-800">Trading</SelectItem>
                    <SelectItem value="education" className="text-white hover:bg-gray-800">Education</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={onGoLive} size="sm" className="bg-primary hover:bg-primary/90 text-black font-semibold">
                  <Play size={16} className="mr-1" />
                  Go Live
                </Button>
              </div>
            ) : (
              <Button onClick={onEndSpace} variant="destructive" size="sm">
                <Square size={16} className="mr-1" />
                End Space
              </Button>
            )}
          </>
        )}
        
        <Button 
          onClick={onLeaveSpace} 
          variant="outline" 
          size="sm" 
          className="text-white border-gray-700 hover:bg-gray-900 hover:border-primary/50"
        >
          <LogOut size={16} className="mr-1" />
          Leave
        </Button>
      </div>
    </div>
  );
};

export default SpaceV2Header;
