
import { useState, useEffect } from 'react';

interface OptimisticViewerState {
  count: number;
  isJoining: boolean;
  hasJoined: boolean;
}

export const useOptimisticViewer = (actualCount: number, streamId: string | undefined) => {
  const [optimisticState, setOptimisticState] = useState<OptimisticViewerState>({
    count: actualCount,
    isJoining: false,
    hasJoined: false
  });

  // Update optimistic count when actual count changes
  useEffect(() => {
    setOptimisticState(prev => ({
      ...prev,
      count: Math.max(actualCount, prev.count), // Never show decrease until actual update
      isJoining: false
    }));
  }, [actualCount]);

  // Optimistically increment viewer count when user joins
  useEffect(() => {
    if (streamId && !optimisticState.hasJoined) {
      setOptimisticState(prev => ({
        ...prev,
        count: prev.count + 1,
        isJoining: true,
        hasJoined: true
      }));
    }
  }, [streamId, optimisticState.hasJoined]);

  return {
    viewerCount: optimisticState.count,
    isJoining: optimisticState.isJoining
  };
};
