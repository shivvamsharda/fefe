import { supabase } from '@/integrations/supabase/client';

export interface UserPointsSummary {
  total_points: number;
  current_month_points: number;
  last_month_points: number;
  current_month_rank: number | null;
  total_rank: number | null;
}

export interface PointsHistoryEntry {
  id: string;
  points_earned: number;
  action_type: string;
  promoted_stream_id: string | null;
  created_at: string;
  stream_title?: string;
  stream_creator?: string;
}

export interface PointsHistoryResponse {
  data: PointsHistoryEntry[];
  total_count: number;
  has_more: boolean;
}

class PointsService {
  // Get user's points summary
  async getUserPointsSummary(userUuid: string): Promise<UserPointsSummary | null> {
    try {
      console.log('DEBUG: getUserPointsSummary called with userUuid:', userUuid, 'Type:', typeof userUuid);
      
      // First, check for records with null user_id that should belong to this user
      const { data: nullUserIdData, error: nullError } = await supabase
        .from('promoted_stream_viewer_points')
        .select('id, user_id, ip_address, points_earned')
        .is('user_id', null);
      
      console.log('DEBUG: Records with null user_id:', nullUserIdData?.length || 0, nullUserIdData);
      
      // If we have null user_id records, update them to the current user
      if (nullUserIdData && nullUserIdData.length > 0) {
        console.log('DEBUG: Updating null user_id records to:', userUuid);
        const { data: updateData, error: updateError } = await supabase
          .from('promoted_stream_viewer_points')
          .update({ user_id: userUuid })
          .is('user_id', null);
        
        console.log('DEBUG: Update result:', { updateData, updateError });
      }
      
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

      // Test 1: Get all records first to see what we have
      const { data: allData, error: allError } = await supabase
        .from('promoted_stream_viewer_points')
        .select('id, user_id, points_earned');
      
      console.log('DEBUG: All records in table:', allData?.length || 0, allData);
      
      // Test 2: Try the original query
      const { data: totalData, error: totalError } = await supabase
        .from('promoted_stream_viewer_points')
        .select('points_earned')
        .eq('user_id', userUuid);

      console.log('DEBUG: Original query result:', { totalData, totalError, userUuid, userUuidType: typeof userUuid });
      
      // Test 3: Try with explicit UUID casting
      const { data: castData, error: castError } = await supabase
        .from('promoted_stream_viewer_points') 
        .select('points_earned')
        .eq('user_id', `${userUuid}::uuid`);
      
      console.log('DEBUG: UUID cast query result:', { castData, castError });
      
      // Test 4: Try different comparison approaches
      const { data: filterData, error: filterError } = await supabase
        .from('promoted_stream_viewer_points')
        .select('points_earned')
        .filter('user_id', 'eq', userUuid);
      
      console.log('DEBUG: Filter query result:', { filterData, filterError });

      if (totalError) throw totalError;

      const totalPoints = totalData?.reduce((sum, row) => sum + row.points_earned, 0) || 0;

      // Get current month points
      const { data: currentMonthData, error: currentMonthError } = await supabase
        .from('promoted_stream_viewer_points')
        .select('points_earned')
        .eq('user_id', userUuid)
        .gte('created_at', currentMonthStart.toISOString());

      if (currentMonthError) throw currentMonthError;

      const currentMonthPoints = currentMonthData?.reduce((sum, row) => sum + row.points_earned, 0) || 0;

      // Get last month points
      const { data: lastMonthData, error: lastMonthError } = await supabase
        .from('promoted_stream_viewer_points')
        .select('points_earned')
        .eq('user_id', userUuid)
        .gte('created_at', lastMonthStart.toISOString())
        .lt('created_at', currentMonthStart.toISOString());

      if (lastMonthError) throw lastMonthError;

      const lastMonthPoints = lastMonthData?.reduce((sum, row) => sum + row.points_earned, 0) || 0;

      return {
        total_points: totalPoints,
        current_month_points: currentMonthPoints,
        last_month_points: lastMonthPoints,
        current_month_rank: null, // TODO: Implement ranking
        total_rank: null
      };
    } catch (error) {
      console.error('Error in getUserPointsSummary:', error);
      return null;
    }
  }

  // Get user's points history grouped by sessions
  async getUserPointsHistory(
    userUuid: string, 
    page: number = 1, 
    pageSize: number = 20,
    actionFilter?: string
  ): Promise<PointsHistoryResponse> {
    try {
      // Get all points ordered by time to group into sessions
      let query = supabase
        .from('promoted_stream_viewer_points')
        .select('*')
        .eq('user_id', userUuid)
        .order('created_at', { ascending: false });

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group points into sessions (points within 2 minutes of each other are considered same session)
      const sessions: PointsHistoryEntry[] = [];
      const SESSION_GAP_MINUTES = 2;
      
      if (data && data.length > 0) {
        let currentSession = {
          id: data[0].id,
          points_earned: data[0].points_earned,
          action_type: data[0].action_type,
          promoted_stream_id: data[0].promoted_stream_id,
          created_at: data[0].created_at,
          stream_title: 'Promoted Stream',
          stream_creator: 'Creator',
          session_start: data[0].created_at,
          session_end: data[0].created_at
        };

        for (let i = 1; i < data.length; i++) {
          const currentTime = new Date(data[i].created_at);
          const sessionEndTime = new Date(currentSession.session_end);
          const timeDiff = Math.abs(sessionEndTime.getTime() - currentTime.getTime()) / (1000 * 60); // minutes

          if (timeDiff <= SESSION_GAP_MINUTES && 
              data[i].promoted_stream_id === currentSession.promoted_stream_id) {
            // Same session - accumulate points
            currentSession.points_earned += data[i].points_earned;
            currentSession.session_start = data[i].created_at; // Update start to earliest time
          } else {
            // New session - save current and start new one
            sessions.push({
              id: currentSession.id,
              points_earned: Math.round(currentSession.points_earned * 100) / 100, // Round to 2 decimal places
              action_type: currentSession.action_type,
              promoted_stream_id: currentSession.promoted_stream_id,
              created_at: currentSession.created_at,
              stream_title: currentSession.stream_title,
              stream_creator: currentSession.stream_creator
            });

            currentSession = {
              id: data[i].id,
              points_earned: data[i].points_earned,
              action_type: data[i].action_type,
              promoted_stream_id: data[i].promoted_stream_id,
              created_at: data[i].created_at,
              stream_title: 'Promoted Stream',
              stream_creator: 'Creator',
              session_start: data[i].created_at,
              session_end: data[i].created_at
            };
          }
        }

        // Add the last session
        sessions.push({
          id: currentSession.id,
          points_earned: Math.round(currentSession.points_earned * 100) / 100,
          action_type: currentSession.action_type,
          promoted_stream_id: currentSession.promoted_stream_id,
          created_at: currentSession.created_at,
          stream_title: currentSession.stream_title,
          stream_creator: currentSession.stream_creator
        });
      }

      // Apply pagination to sessions
      const offset = (page - 1) * pageSize;
      const paginatedSessions = sessions.slice(offset, offset + pageSize);

      return {
        data: paginatedSessions,
        total_count: sessions.length,
        has_more: sessions.length > offset + pageSize
      };
    } catch (error) {
      console.error('Error in getUserPointsHistory:', error);
      return { data: [], total_count: 0, has_more: false };
    }
  }

  // Get leaderboard data for points (placeholder implementation)
  async getPointsLeaderboard(period: 'current_month' | 'all_time' = 'current_month', limit: number = 10) {
    try {
      // Return empty array for now
      return [];
    } catch (error) {
      console.error('Error in getPointsLeaderboard:', error);
      return [];
    }
  }

  // Award points to a user (placeholder implementation)
  async awardPoints(
    userUuid: string,
    points: number,
    actionType: string,
    promotedStreamId?: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      console.log('Points would be awarded:', { userUuid, points, actionType });
      return true;
    } catch (error) {
      console.error('Error in awardPoints:', error);
      return false;
    }
  }

  // Track viewing session for points
  async trackViewingSession(
    promotedStreamId: string,
    userUuid?: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('viewer-tracking', {
        body: {
          promotedStreamId,
          userUuid
        },
        method: 'POST'
      });

      if (error) {
        console.error('Error tracking viewing session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in trackViewingSession:', error);
      return false;
    }
  }

  // Get available action types for filtering
  getActionTypes() {
    return [
      { value: 'all', label: 'All Actions' },
      { value: 'watch_time', label: 'Watch Time' },
      { value: 'like', label: 'Stream Like' },
      { value: 'follow', label: 'Creator Follow' },
      { value: 'share', label: 'Stream Share' },
      { value: 'comment', label: 'Chat Message' }
    ];
  }
}

export const pointsService = new PointsService();