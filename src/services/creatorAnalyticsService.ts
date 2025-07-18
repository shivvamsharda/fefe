
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CreatorDonation {
  id: string;
  amount_sol: number;
  token_type: string;
  message?: string;
  donor_wallet_address: string;
  created_at: string;
  stream_title?: string;
  // Add computed fields for proper token handling
  actual_token_type?: string;
  cleaned_message?: string;
  actual_amount?: number;
}

export interface DonationSummary {
  totalSol: number;
  totalWenlive: number;
  totalCount: number;
  averageAmount: number;
  averageSol: number;
  averageWenlive: number;
}

export interface StreamAnalytics {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  category?: string;
  language?: string;
  live_duration_minutes?: number;
  peak_viewers: number;
  avg_viewers: number;
  tips_received: number;
  vod_views: number;
  status: string;
}

export interface VodAnalytics {
  id: string;
  title: string;
  created_at: string;
  duration: number;
  views: number;
  completion_rate: number;
  avg_watch_time: number;
  category?: string;
  language?: string;
}

export interface ViewsOverTimeData {
  date: string;
  stream_views: number;
  vod_views: number;
  total_views: number;
}

export interface TipsOverTimeData {
  date: string;
  tips_count: number;
  tips_amount: number;
}

export interface CreatorOverallStats {
  total_streams: number;
  total_vods: number;
  total_views: number;
  total_watch_time_hours: number;
  total_tips_received: number;
  avg_completion_rate: number;
  follower_count: number;
}

export type TimePeriod = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

export const getPeriodDays = (period: TimePeriod): number | null => {
  switch (period) {
    case '24h': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    case 'all': return null;
    default: return 30;
  }
};

export const getDataGranularity = (period: TimePeriod): 'hour' | 'day' | 'week' => {
  switch (period) {
    case '24h': return 'hour';
    case '7d': 
    case '30d': return 'day';
    case '90d':
    case '1y':
    case 'all': return 'week';
    default: return 'day';
  }
};

export const getCreatorDonations = async (userUuid: string): Promise<CreatorDonation[]> => {
  try {
    const { data, error } = await supabase
      .from('donations')
      .select(`
        id,
        amount_sol,
        token_type,
        message,
        donor_wallet_address,
        created_at,
        streams (
          title
        )
      `)
      .eq('creator_user_id', userUuid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching creator donations:', error);
      toast.error("Failed to load donations", { description: error.message });
      return [];
    }

    return (data || []).map(donation => {
      // Parse the message to determine actual token type and clean message
      let actualTokenType = donation.token_type;
      let cleanedMessage = donation.message;
      let actualAmount = donation.amount_sol;

      if (donation.message && donation.message.includes('DONATION_TOKEN_TYPE:WENLIVE')) {
        actualTokenType = 'WENLIVE';
        // Extract the actual message after the token type indicator
        const messageParts = donation.message.split('DONATION_TOKEN_TYPE:WENLIVE|');
        if (messageParts.length > 1) {
          cleanedMessage = messageParts[1].trim();
          // Remove any trailing token info like "(1277.53 WENLI..."
          cleanedMessage = cleanedMessage.replace(/\s*\(\d+\.?\d*\s+WENLI.*\)?\s*$/, '').trim();
        }
      } else if (donation.message && donation.message.includes('DONATION_TOKEN_TYPE:SOL')) {
        actualTokenType = 'SOL';
        const messageParts = donation.message.split('DONATION_TOKEN_TYPE:SOL|');
        if (messageParts.length > 1) {
          cleanedMessage = messageParts[1].trim();
        }
      }

      // If no clean message remains, set to null
      if (cleanedMessage === '' || cleanedMessage === donation.message) {
        cleanedMessage = donation.message;
      }

      return {
        id: donation.id,
        amount_sol: donation.amount_sol,
        token_type: donation.token_type,
        message: donation.message,
        donor_wallet_address: donation.donor_wallet_address,
        created_at: donation.created_at,
        stream_title: donation.streams?.title,
        // Add computed fields
        actual_token_type: actualTokenType,
        cleaned_message: cleanedMessage,
        actual_amount: actualAmount,
      };
    });
  } catch (error: any) {
    console.error('Unexpected error fetching creator donations:', error);
    toast.error("Failed to load donations", { description: error.message });
    return [];
  }
};

export const getCreatorStreamAnalytics = async (userUuid: string): Promise<StreamAnalytics[]> => {
  try {
    const { data, error } = await supabase
      .from('streams')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        category,
        language,
        status,
        viewer_count
      `)
      .eq('user_id', userUuid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stream analytics:', error);
      toast.error("Failed to load stream analytics", { description: error.message });
      return [];
    }

    const streamAnalytics = await Promise.all((data || []).map(async (stream) => {
      // Get viewer heartbeats for this stream
      const { data: heartbeats } = await supabase
        .from('viewer_heartbeats')
        .select('first_seen_at, last_seen_at, ip_address')
        .eq('stream_id', stream.id);

      // Get donations for this stream
      const { data: streamDonations } = await supabase
        .from('donations')
        .select('amount_sol')
        .eq('stream_id', stream.id);

      // Get VOD views for this stream
      const { data: vodViews } = await supabase
        .from('user_watch_sessions')
        .select('id')
        .in('vod_id', 
          await supabase
            .from('vods')
            .select('id')
            .eq('original_stream_id', stream.id)
            .then(({ data }) => data?.map(v => v.id) || [])
        );

      // Calculate metrics
      const peakViewers = Math.max(stream.viewer_count || 0, heartbeats?.length || 0);
      const avgViewers = heartbeats?.length || 0;
      const tipsReceived = streamDonations?.reduce((sum, d) => sum + Number(d.amount_sol), 0) || 0;
      const vodViewsCount = vodViews?.length || 0;

      // Calculate live duration from heartbeats
      let liveDurationMinutes = 0;
      if (heartbeats && heartbeats.length > 0) {
        const firstSeen = new Date(Math.min(...heartbeats.map(h => new Date(h.first_seen_at).getTime())));
        const lastSeen = new Date(Math.max(...heartbeats.map(h => new Date(h.last_seen_at).getTime())));
        liveDurationMinutes = Math.round((lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60));
      }

      return {
        id: stream.id,
        title: stream.title,
        created_at: stream.created_at,
        updated_at: stream.updated_at,
        category: stream.category,
        language: stream.language,
        live_duration_minutes: liveDurationMinutes,
        peak_viewers: peakViewers,
        avg_viewers: avgViewers,
        tips_received: tipsReceived,
        vod_views: vodViewsCount,
        status: stream.status
      };
    }));

    return streamAnalytics;
  } catch (error: any) {
    console.error('Unexpected error fetching stream analytics:', error);
    toast.error("Failed to load stream analytics", { description: error.message });
    return [];
  }
};

export const getCreatorVodAnalytics = async (userUuid: string): Promise<VodAnalytics[]> => {
  try {
    const { data, error } = await supabase
      .from('vods')
      .select(`
        id,
        title,
        created_at,
        duration,
        streams (
          category,
          language
        )
      `)
      .eq('user_id', userUuid)
      .eq('deleted_by_user', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching VOD analytics:', error);
      toast.error("Failed to load VOD analytics", { description: error.message });
      return [];
    }

    const vodAnalytics = await Promise.all((data || []).map(async (vod) => {
      // Get watch sessions for this VOD
      const { data: watchSessions } = await supabase
        .from('user_watch_sessions')
        .select('duration_seconds')
        .eq('vod_id', vod.id)
        .not('ended_at', 'is', null);

      const views = watchSessions?.length || 0;
      const totalWatchTime = watchSessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;
      const avgWatchTime = views > 0 ? totalWatchTime / views : 0;
      const completionRate = vod.duration && vod.duration > 0 ? (avgWatchTime / vod.duration) * 100 : 0;

      return {
        id: vod.id,
        title: vod.title,
        created_at: vod.created_at,
        duration: vod.duration || 0,
        views,
        completion_rate: Math.min(completionRate, 100), // Cap at 100%
        avg_watch_time: avgWatchTime,
        category: vod.streams?.category,
        language: vod.streams?.language
      };
    }));

    return vodAnalytics;
  } catch (error: any) {
    console.error('Unexpected error fetching VOD analytics:', error);
    toast.error("Failed to load VOD analytics", { description: error.message });
    return [];
  }
};

export const getCreatorViewsOverTime = async (userUuid: string, period: TimePeriod = '30d'): Promise<ViewsOverTimeData[]> => {
  try {
    const days = getPeriodDays(period);
    const granularity = getDataGranularity(period);
    
    let startDate: Date;
    if (days === null) {
      // For 'all time', get the earliest content date
      const { data: earliestStream } = await supabase
        .from('streams')
        .select('created_at')
        .eq('user_id', userUuid)
        .order('created_at', { ascending: true })
        .limit(1);
      
      const { data: earliestVod } = await supabase
        .from('vods')
        .select('created_at')
        .eq('user_id', userUuid)
        .order('created_at', { ascending: true })
        .limit(1);

      const streamDate = earliestStream?.[0]?.created_at ? new Date(earliestStream[0].created_at) : new Date();
      const vodDate = earliestVod?.[0]?.created_at ? new Date(earliestVod[0].created_at) : new Date();
      startDate = streamDate < vodDate ? streamDate : vodDate;
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Get stream views over time from viewer heartbeats
    const { data: streamViews } = await supabase
      .from('viewer_heartbeats')
      .select(`
        first_seen_at,
        streams!inner (
          user_id
        )
      `)
      .eq('streams.user_id', userUuid)
      .gte('first_seen_at', startDate.toISOString());

    // Get VOD views over time from watch sessions
    const { data: vodViews } = await supabase
      .from('user_watch_sessions')
      .select(`
        started_at,
        vods!inner (
          user_id
        )
      `)
      .eq('vods.user_id', userUuid)
      .gte('started_at', startDate.toISOString())
      .not('ended_at', 'is', null);

    // Group by date/time based on granularity
    const viewsByTime: { [key: string]: { stream_views: number; vod_views: number } } = {};

    const formatTimeKey = (date: Date): string => {
      if (granularity === 'hour') {
        return date.toISOString().slice(0, 13) + ':00:00.000Z'; // YYYY-MM-DDTHH:00:00.000Z
      } else if (granularity === 'day') {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else { // week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        return weekStart.toISOString().split('T')[0];
      }
    };

    // Process stream views
    streamViews?.forEach(view => {
      const timeKey = formatTimeKey(new Date(view.first_seen_at));
      if (!viewsByTime[timeKey]) {
        viewsByTime[timeKey] = { stream_views: 0, vod_views: 0 };
      }
      viewsByTime[timeKey].stream_views++;
    });

    // Process VOD views
    vodViews?.forEach(view => {
      const timeKey = formatTimeKey(new Date(view.started_at));
      if (!viewsByTime[timeKey]) {
        viewsByTime[timeKey] = { stream_views: 0, vod_views: 0 };
      }
      viewsByTime[timeKey].vod_views++;
    });

    // Convert to array and sort by date
    return Object.entries(viewsByTime)
      .map(([timeKey, views]) => ({
        date: timeKey,
        stream_views: views.stream_views,
        vod_views: views.vod_views,
        total_views: views.stream_views + views.vod_views
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

  } catch (error: any) {
    console.error('Error fetching views over time:', error);
    toast.error("Failed to load views over time", { description: error.message });
    return [];
  }
};

export const getCreatorTipsOverTime = async (userUuid: string, period: TimePeriod = '30d'): Promise<TipsOverTimeData[]> => {
  try {
    const days = getPeriodDays(period);
    const granularity = getDataGranularity(period);
    
    let startDate: Date;
    if (days === null) {
      // For 'all time', get the earliest donation
      const { data: earliestDonation } = await supabase
        .from('donations')
        .select('created_at')
        .eq('creator_user_id', userUuid)
        .order('created_at', { ascending: true })
        .limit(1);

      startDate = earliestDonation?.[0]?.created_at ? new Date(earliestDonation[0].created_at) : new Date();
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    const { data, error } = await supabase
      .from('donations')
      .select('created_at, amount_sol')
      .eq('creator_user_id', userUuid)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tips over time:', error);
      return [];
    }

    // Group by time based on granularity
    const tipsByTime: { [key: string]: { count: number; amount: number } } = {};

    const formatTimeKey = (date: Date): string => {
      if (granularity === 'hour') {
        return date.toISOString().slice(0, 13) + ':00:00.000Z';
      } else if (granularity === 'day') {
        return date.toISOString().split('T')[0];
      } else { // week
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      }
    };

    data?.forEach(donation => {
      const timeKey = formatTimeKey(new Date(donation.created_at));
      if (!tipsByTime[timeKey]) {
        tipsByTime[timeKey] = { count: 0, amount: 0 };
      }
      tipsByTime[timeKey].count++;
      tipsByTime[timeKey].amount += Number(donation.amount_sol);
    });

    return Object.entries(tipsByTime)
      .map(([timeKey, tips]) => ({
        date: timeKey,
        tips_count: tips.count,
        tips_amount: tips.amount
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

  } catch (error: any) {
    console.error('Error fetching tips over time:', error);
    toast.error("Failed to load tips over time", { description: error.message });
    return [];
  }
};

export const getCreatorOverallStats = async (userUuid: string): Promise<CreatorOverallStats> => {
  try {
    const [streamsData, vodsData, watchSessionsData, donationsData, followersData] = await Promise.all([
      // Total streams
      supabase
        .from('streams')
        .select('id', { count: 'exact' })
        .eq('user_id', userUuid),

      // Total VODs
      supabase
        .from('vods')
        .select('id', { count: 'exact' })
        .eq('user_id', userUuid)
        .eq('deleted_by_user', false),

      // Watch sessions for total views and watch time
      supabase
        .from('user_watch_sessions')
        .select(`
          duration_seconds,
          streams!inner (user_id),
          vods!inner (user_id)
        `)
        .or('streams.user_id.eq.' + userUuid + ',vods.user_id.eq.' + userUuid)
        .not('ended_at', 'is', null),

      // Total donations
      supabase
        .from('donations')
        .select('amount_sol')
        .eq('creator_user_id', userUuid),

      // Follower count
      supabase
        .from('following')
        .select('id', { count: 'exact' })
        .eq('followed_id', userUuid)
    ]);

    const totalStreams = streamsData.count || 0;
    const totalVods = vodsData.count || 0;
    const totalViews = watchSessionsData.data?.length || 0;
    const totalWatchTimeSeconds = watchSessionsData.data?.reduce((sum, session) => sum + (session.duration_seconds || 0), 0) || 0;
    const totalWatchTimeHours = totalWatchTimeSeconds / 3600;
    const totalTipsReceived = donationsData.data?.reduce((sum, donation) => sum + Number(donation.amount_sol), 0) || 0;
    const followerCount = followersData.count || 0;

    // Calculate average completion rate from VODs
    const vodAnalytics = await getCreatorVodAnalytics(userUuid);
    const avgCompletionRate = vodAnalytics.length > 0 
      ? vodAnalytics.reduce((sum, vod) => sum + vod.completion_rate, 0) / vodAnalytics.length 
      : 0;

    return {
      total_streams: totalStreams,
      total_vods: totalVods,
      total_views: totalViews,
      total_watch_time_hours: totalWatchTimeHours,
      total_tips_received: totalTipsReceived,
      avg_completion_rate: avgCompletionRate,
      follower_count: followerCount
    };

  } catch (error: any) {
    console.error('Error fetching overall stats:', error);
    toast.error("Failed to load overall statistics", { description: error.message });
    return {
      total_streams: 0,
      total_vods: 0,
      total_views: 0,
      total_watch_time_hours: 0,
      total_tips_received: 0,
      avg_completion_rate: 0,
      follower_count: 0
    };
  }
};

export const calculateDonationSummary = (donations: CreatorDonation[]): DonationSummary => {
  if (donations.length === 0) {
    return {
      totalSol: 0,
      totalWenlive: 0,
      totalCount: 0,
      averageAmount: 0,
      averageSol: 0,
      averageWenlive: 0,
    };
  }

  // Use actual_token_type for proper classification
  const solDonations = donations.filter(d => d.actual_token_type === 'SOL');
  const wenliveDonations = donations.filter(d => d.actual_token_type === 'WENLIVE');

  const totalSol = solDonations.reduce((sum, d) => sum + d.amount_sol, 0);
  const totalWenlive = wenliveDonations.reduce((sum, d) => sum + d.amount_sol, 0);
  const totalAmount = donations.reduce((sum, d) => sum + d.amount_sol, 0);

  const averageSol = solDonations.length > 0 ? totalSol / solDonations.length : 0;
  const averageWenlive = wenliveDonations.length > 0 ? totalWenlive / wenliveDonations.length : 0;

  return {
    totalSol,
    totalWenlive,
    totalCount: donations.length,
    averageAmount: totalAmount / donations.length,
    averageSol,
    averageWenlive,
  };
};
