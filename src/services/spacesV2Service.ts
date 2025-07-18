import { supabase } from '@/integrations/supabase/client';

export interface SpaceV2 {
  id: string;
  title: string;
  description?: string;
  host_user_id: string;
  host_wallet: string;
  room_name: string;
  is_live: boolean;
  is_public: boolean;
  participant_count: number;
  max_participants: number;
  category?: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  ended_at?: string;
}

export interface SpaceParticipant {
  id: string;
  space_id: string;
  user_id?: string;
  wallet_address?: string;
  display_name: string;
  role: 'host' | 'participant' | 'viewer';
  joined_at: string;
  left_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSpaceRequest {
  title: string;
  description?: string;
  hostWallet: string;
}

export interface JoinSpaceResponse {
  token: string;
  livekitUrl: string;
  space: SpaceV2;
  role: 'host' | 'participant' | 'viewer';
  participantIdentity?: string;
}

export const createSpaceV2 = async (request: CreateSpaceRequest): Promise<SpaceV2> => {
  const { data, error } = await supabase.functions.invoke('create-space-v2', {
    body: request,
  });

  if (error) {
    console.error('Error creating space:', error);
    throw new Error('Failed to create space');
  }

  return data.space;
};

export const joinSpaceV2 = async (
  roomName: string,
  participantName: string,
  walletAddress?: string,
  role?: 'host' | 'participant' | 'viewer',
  autoJoin?: boolean
): Promise<JoinSpaceResponse> => {
  const { data, error } = await supabase.functions.invoke('join-space-v2', {
    body: {
      roomName,
      participantName,
      walletAddress,
      role,
      autoJoin,
    },
  });

  if (error) {
    console.error('Error joining space:', error);
    throw new Error('Failed to join space');
  }

  return data;
};

export const goLiveSpaceV2 = async (
  roomName: string,
  hostWallet: string,
  category?: string
): Promise<void> => {
  const { error } = await supabase.functions.invoke('go-live-space-v2', {
    body: {
      roomName,
      hostWallet,
      category,
    },
  });

  if (error) {
    console.error('Error going live:', error);
    throw new Error('Failed to go live');
  }
};

export const endSpaceV2 = async (roomName: string, hostWallet: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('end-space-v2', {
    body: {
      roomName,
      hostWallet,
    },
  });

  if (error) {
    console.error('Error ending space:', error);
    throw new Error('Failed to end space');
  }
};

export const getSpaceV2 = async (roomName: string): Promise<SpaceV2 | null> => {
  const { data, error } = await supabase
    .from('spaces_v2')
    .select('*')
    .eq('room_name', roomName)
    .single();

  if (error) {
    console.error('Error fetching space:', error);
    return null;
  }

  return data;
};

export const getSpaceParticipants = async (spaceId: string): Promise<SpaceParticipant[]> => {
  const { data, error } = await supabase
    .from('space_participants')
    .select('*')
    .eq('space_id', spaceId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching participants:', error);
    return [];
  }

  // Type assertion to handle the role field properly
  return (data || []).map(participant => ({
    ...participant,
    role: participant.role as 'host' | 'participant' | 'viewer'
  }));
};

export const getLiveSpaces = async (): Promise<SpaceV2[]> => {
  const { data, error } = await supabase
    .from('spaces_v2')
    .select('*')
    .eq('is_live', true)
    .eq('is_public', true)
    .order('participant_count', { ascending: false });

  if (error) {
    console.error('Error fetching live spaces:', error);
    return [];
  }

  return data || [];
};

export const getUserSpaces = async (hostWallet: string): Promise<SpaceV2[]> => {
  const { data, error } = await supabase
    .from('spaces_v2')
    .select('*')
    .eq('host_wallet', hostWallet)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user spaces:', error);
    return [];
  }

  return data || [];
};
