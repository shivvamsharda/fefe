
import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, LogOut } from 'lucide-react';
import { ConnectionState } from 'livekit-client';

interface SpaceV2ControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  localScreenShare: any;
  connectionState: ConnectionState;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onLeaveSpace: () => void;
}

const SpaceV2Controls: React.FC<SpaceV2ControlsProps> = ({
  isVideoEnabled,
  isAudioEnabled,
  localScreenShare,
  connectionState,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onLeaveSpace
}) => {
  return (
    <div className="bg-black border-t border-gray-800 p-6 flex items-center justify-center">
      <div className="flex items-center gap-6">
        <button
          onClick={onToggleAudio}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
            isAudioEnabled 
              ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600' 
              : 'bg-red-600 hover:bg-red-500 text-white shadow-lg'
          }`}
        >
          {isAudioEnabled ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        <button
          onClick={onToggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
            isVideoEnabled 
              ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600' 
              : 'bg-red-600 hover:bg-red-500 text-white shadow-lg'
          }`}
        >
          {isVideoEnabled ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        <button
          onClick={onToggleScreenShare}
          disabled={connectionState !== ConnectionState.Connected}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
            connectionState !== ConnectionState.Connected
              ? 'bg-gray-600 cursor-not-allowed text-gray-400'
              : localScreenShare
              ? 'bg-primary hover:bg-primary/90 text-black shadow-lg border border-primary' 
              : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
          }`}
          title={
            connectionState !== ConnectionState.Connected
              ? 'Not connected'
              : localScreenShare 
              ? 'Stop screen share' 
              : 'Start screen share'
          }
        >
          {localScreenShare ? <MonitorOff size={22} /> : <Monitor size={22} />}
        </button>

        <button
          onClick={onLeaveSpace}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all duration-300 shadow-lg"
        >
          <LogOut size={22} />
        </button>
      </div>
    </div>
  );
};

export default SpaceV2Controls;
