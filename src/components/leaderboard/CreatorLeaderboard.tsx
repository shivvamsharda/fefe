import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Video, Clock } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface CreatorStats {
  id: string;
  display_name: string;
  profile_picture_url: string | null;
  total_streams: number;
  total_hours_streamed: number;
}

const CreatorLeaderboard = () => {
  const { t } = useLanguage();
  const [creators, setCreators] = useState<CreatorStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Updated date filter to start from June 28, 2025 at 12:00 AM UTC
  const LEADERBOARD_START_DATE = '2025-06-28T00:00:00Z';

  useEffect(() => {
    fetchCreatorStats();
  }, []);

  const fetchCreatorStats = async () => {
    try {
      // Query to get creator statistics
      const { data: creatorsData, error } = await supabase
        .from('creator_profiles')
        .select(`
          display_name,
          profile_picture_url,
          user_profiles!inner(id)
        `);

      if (error) {
        console.error('Error fetching creators:', error);
        return;
      }

      // For each creator, get their stream statistics since June 28, 2025
      const creatorStats = await Promise.all(
        creatorsData.map(async (creator) => {
          const userId = creator.user_profiles.id;
          
          // Get VODs created since June 28, 2025 (for completed streams)
          const { data: vods, error: vodsError } = await supabase
            .from('vods')
            .select('duration, created_at')
            .eq('user_id', userId)
            .eq('deleted_by_user', false)
            .gte('created_at', LEADERBOARD_START_DATE);

          if (vodsError) {
            console.error('Error fetching VODs:', vodsError);
            return null;
          }

          // Get active streams created since June 28, 2025 (for ongoing streams)
          const { data: activeStreams, error: streamsError } = await supabase
            .from('streams')
            .select('created_at, status')
            .eq('user_id', userId)
            .in('status', ['live', 'recording', 'active'])
            .gte('created_at', LEADERBOARD_START_DATE);

          if (streamsError) {
            console.error('Error fetching active streams:', streamsError);
            return null;
          }

          // Get all streams (both completed and active) for count since June 28, 2025
          const { data: allStreams, error: allStreamsError } = await supabase
            .from('streams')
            .select('id, created_at')
            .eq('user_id', userId)
            .gte('created_at', LEADERBOARD_START_DATE);

          if (allStreamsError) {
            console.error('Error fetching all streams:', allStreamsError);
            return null;
          }

          const totalStreams = allStreams?.length || 0;
          
          // Calculate total hours from VOD durations (duration is in seconds)
          const totalSecondsFromVods = vods?.reduce((total, vod) => total + (vod.duration || 0), 0) || 0;
          const totalHoursFromVods = totalSecondsFromVods / 3600;

          // Calculate total hours from active streams (time since stream started)
          const now = new Date();
          const totalSecondsFromActiveStreams = activeStreams?.reduce((total, stream) => {
            const streamStart = new Date(stream.created_at);
            const secondsStreaming = Math.max(0, (now.getTime() - streamStart.getTime()) / 1000);
            return total + secondsStreaming;
          }, 0) || 0;
          const totalHoursFromActiveStreams = totalSecondsFromActiveStreams / 3600;

          // Total streaming hours = VOD hours + active stream hours
          const totalHoursStreamed = totalHoursFromVods + totalHoursFromActiveStreams;

          console.log(`Creator ${creator.display_name}:`, {
            totalStreams,
            vodsHours: totalHoursFromVods,
            activeStreamHours: totalHoursFromActiveStreams,
            totalHours: totalHoursStreamed,
            activeStreamsCount: activeStreams?.length || 0
          });

          return {
            id: userId,
            display_name: creator.display_name,
            profile_picture_url: creator.profile_picture_url,
            total_streams: totalStreams,
            total_hours_streamed: totalHoursStreamed
          };
        })
      );

      // Filter out null results and sort by total hours streamed (descending)
      const validStats = creatorStats
        .filter((stat): stat is CreatorStats => stat !== null)
        .sort((a, b) => b.total_hours_streamed - a.total_hours_streamed)
        .slice(0, 10); // Top 10 creators

      setCreators(validStats);
    } catch (error) {
      console.error('Error fetching creator statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-600" />;
    return <span className="text-white/70 font-bold">#{index + 1}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-solana"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">{t('leaderboard.creator_title')}</h3>
        <p className="text-white/70">{t('leaderboard.creator_subtitle')}</p>
      </div>

      {creators.length === 0 ? (
        <Card className="bg-secondary border-white/5">
          <CardContent className="text-center py-8">
            <p className="text-white/70">{t('leaderboard.no_data')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {creators.map((creator, index) => (
            <Card key={creator.id} className="bg-secondary border-white/5 hover:border-solana/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(index)}
                    </div>
                    
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={creator.profile_picture_url || ''} alt={creator.display_name} />
                      <AvatarFallback className="bg-solana/20 text-solana">
                        {creator.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">{creator.display_name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-solana" />
                      <span className="text-white/70">{t('leaderboard.streams')}:</span>
                      <Badge variant="outline" className="border-solana text-solana">
                        {creator.total_streams}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-solana" />
                      <span className="text-white/70">{t('leaderboard.total_hours')}:</span>
                      <Badge variant="outline" className="border-solana text-solana">
                        {formatHours(creator.total_hours_streamed)}h
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreatorLeaderboard;
