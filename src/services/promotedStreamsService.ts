
import { supabase } from '@/integrations/supabase/client';

export interface PromotedStreamData {
  id: string;
  streamTitle: string;
  streamUrl: string;
  description?: string;
  thumbnailUrl: string;
  category: string;
  tags: string[];
  placementType: string;
  totalAmountPaidSol: number;
  placementFeeSol: number;
  paymentConfirmedAt: string;
  basePaymentExpiresAt: string;
  isActive: boolean;
  createdAt: string;
  transactionSignature: string;
  discountApplied?: boolean;
  discountType?: string;
  originalPriceSol?: number;
  viewerCount?: number;
  embedUrl?: string;
  streamPlatform?: string;
  walletAddress: string;
  creatorProfile?: {
    id?: string;
    display_name?: string;
    avatar_url?: string;
    profile_picture_url?: string;
    wallet_address?: string;
  };
}

export const hasActivePromotedStream = async (walletAddress: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('promoted_streams')
    .select('id')
    .eq('wallet_address', walletAddress)
    .eq('is_active', true)
    .limit(1);

  if (error) {
    console.error('Error checking active promoted streams:', error);
    return false;
  }

  return (data || []).length > 0;
};

export const getEarliestActiveStreamExpiration = async (walletAddress: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('promoted_streams')
    .select('base_payment_expires_at')
    .eq('wallet_address', walletAddress)
    .eq('is_active', true)
    .order('base_payment_expires_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('Error getting earliest stream expiration:', error);
    return null;
  }

  return data && data.length > 0 ? data[0].base_payment_expires_at : null;
};

export const getActivePromotedStreams = async (walletAddress?: string): Promise<PromotedStreamData[]> => {
  let query = supabase
    .from('promoted_streams')
    .select('*')
    .eq('is_active', true);

  if (walletAddress) {
    query = query.eq('wallet_address', walletAddress);
  }

  query = query.order('slot_position', { ascending: true, nullsFirst: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching promoted streams:', error);
    throw error;
  }

  // Map database columns to interface properties
  return (data || []).map(item => ({
    id: item.id,
    streamTitle: item.stream_title,
    streamUrl: item.stream_url,
    description: item.description,
    thumbnailUrl: item.thumbnail_url,
    category: item.category,
    tags: item.tags || [],
    placementType: item.placement_type,
    totalAmountPaidSol: item.total_amount_paid_sol,
    placementFeeSol: item.placement_fee_sol,
    paymentConfirmedAt: item.payment_confirmed_at,
    basePaymentExpiresAt: item.base_payment_expires_at,
    isActive: item.is_active,
    createdAt: item.created_at,
    transactionSignature: item.transaction_signature,
    discountApplied: item.discount_applied,
    discountType: item.discount_type,
    originalPriceSol: item.original_price_sol,
    viewerCount: item.viewer_count || 0,
    embedUrl: item.embed_url,
    streamPlatform: item.stream_platform,
    walletAddress: item.wallet_address,
    // Creator profile will be fetched separately if needed
    creatorProfile: undefined
  }));
};

export const savePromotedStream = async (streamData: any, placementData: any, walletAddress: string, transactionSignature: string) => {
  // Store both USD amount and SOL amount for record keeping
  // Find the next available slot (1-6)
  const { data: existingSlots, error: slotsError } = await supabase
    .from('promoted_streams')
    .select('slot_position')
    .eq('is_active', true)
    .not('slot_position', 'is', null)
    .order('slot_position');

  if (slotsError) {
    console.error('Error checking existing slots:', slotsError);
    throw slotsError;
  }

  // Find the first available slot
  const occupiedSlots = new Set(existingSlots?.map(s => s.slot_position) || []);
  let availableSlot = null;
  
  for (let i = 1; i <= 6; i++) {
    if (!occupiedSlots.has(i)) {
      availableSlot = i;
      break;
    }
  }

  if (!availableSlot) {
    throw new Error('All 6 featured slots are currently occupied. Please try again later.');
  }

  const promotionData = {
    creator_user_id: null, // This will be populated by the trigger
    wallet_address: walletAddress,
    stream_url: streamData.streamUrl,
    stream_title: streamData.streamTitle,
    description: streamData.description,
    thumbnail_url: streamData.thumbnailUrl,
    category: streamData.category,
    tags: streamData.tags,
    placement_type: 'featured_banner',
    placement_fee_sol: 0,
    total_amount_paid_sol: placementData.totalFee, // This is now the real-time SOL amount
    transaction_signature: transactionSignature,
    payment_confirmed_at: new Date().toISOString(),
    base_payment_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    is_active: true,
    viewer_count: 0,
    slot_position: availableSlot,
    // Remove discount fields as they're no longer used
    discount_applied: false,
    discount_type: null,
    original_price_sol: null,
  };

  const { data, error } = await supabase
    .from('promoted_streams')
    .insert([promotionData])
    .select()
    .single();

  if (error) {
    console.error('Error saving promoted stream:', error);
    throw error;
  }

  // The trigger will automatically populate creator_user_id, stream_platform and embed_url
  console.log('Promoted stream saved successfully:', data);
  return data;
};

export const endPromotedStream = async (promotionId: string, walletAddress: string) => {
  const { data, error } = await supabase
    .from('promoted_streams')
    .update({
      is_active: false,
      manually_ended_at: new Date().toISOString(),
      ended_by_creator: true
    })
    .eq('id', promotionId)
    .eq('wallet_address', walletAddress)  // Changed from creator_wallet_address to wallet_address
    .select()
    .single();

  if (error) {
    console.error('Error ending promoted stream:', error);
    throw error;
  }

  return data;
};
