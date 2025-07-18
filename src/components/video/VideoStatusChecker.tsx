
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { checkVideoStatus } from "@/services/bunnyStatusService";

interface VideoStatusCheckerProps {
  videoId: string;
  bunnyVideoId: string;
  currentStatus: string;
  onStatusUpdate: () => void;
}

const VideoStatusChecker: React.FC<VideoStatusCheckerProps> = ({
  videoId,
  bunnyVideoId,
  currentStatus,
  onStatusUpdate
}) => {
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await checkVideoStatus(bunnyVideoId);
      // Wait a moment then refresh the page data
      setTimeout(() => {
        onStatusUpdate();
      }, 1000);
    } finally {
      setChecking(false);
    }
  };

  if (currentStatus === 'ready') {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCheckStatus}
      disabled={checking}
      className="flex items-center gap-2"
    >
      <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
      {checking ? 'Checking...' : 'Check Status'}
    </Button>
  );
};

export default VideoStatusChecker;
