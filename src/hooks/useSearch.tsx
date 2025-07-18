
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  creators: Array<{
    id: string;
    display_name: string;
    user_id_uuid?: string;
    profile_picture_url?: string;
  }>;
  liveStreams: Array<{
    id: string;
    title: string;
    user_id: string;
    thumbnail?: string;
  }>;
  vods: Array<{
    id: string;
    title: string;
    mux_playback_id: string;
    thumbnail_url?: string;
  }>;
}

export const useSearch = (query: string, delay: number = 300) => {
  const [results, setResults] = useState<SearchResult>({
    creators: [],
    liveStreams: [],
    vods: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ creators: [], liveStreams: [], vods: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('search', {
          body: { query: query.trim() }
        });

        if (error) {
          throw error;
        }

        setResults(data || { creators: [], liveStreams: [], vods: [] });
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search');
        setResults({ creators: [], liveStreams: [], vods: [] });
      } finally {
        setIsLoading(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [query, delay]);

  return { results, isLoading, error };
};
