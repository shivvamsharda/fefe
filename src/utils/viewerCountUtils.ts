// Utility for generating consistent baseline viewer counts for streams

// Cache for storing baseline viewer counts per stream
const baselineCache = new Map<string, number>();

/**
 * Generates a consistent random baseline viewer count (15-25) for a given stream
 * The same stream ID will always return the same baseline number
 */
export const getStreamBaseline = (streamId: string): number => {
  if (baselineCache.has(streamId)) {
    return baselineCache.get(streamId)!;
  }

  // Use stream ID as seed for consistent randomness
  let hash = 0;
  for (let i = 0; i < streamId.length; i++) {
    const char = streamId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate random number between 15-25 using the hash as seed
  const seed = Math.abs(hash);
  const baseline = 15 + (seed % 11); // 11 possible values (15-25)
  
  baselineCache.set(streamId, baseline);
  return baseline;
};

/**
 * Adds baseline viewer count to actual count for live streams
 */
export const addBaselineForLiveStream = (actualCount: number, streamId: string, isLive: boolean = true): number => {
  if (!isLive) return actualCount;
  
  const baseline = getStreamBaseline(streamId);
  return actualCount + baseline;
};