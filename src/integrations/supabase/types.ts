export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by_wallet_address: string | null
          donation_amount: number | null
          donation_transaction_signature: string | null
          id: string
          is_deleted: boolean
          is_donation: boolean
          is_reply: boolean
          message_content: string
          reply_to_message_id: string | null
          sender_display_name: string
          sender_wallet_address: string | null
          stream_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by_wallet_address?: string | null
          donation_amount?: number | null
          donation_transaction_signature?: string | null
          id?: string
          is_deleted?: boolean
          is_donation?: boolean
          is_reply?: boolean
          message_content: string
          reply_to_message_id?: string | null
          sender_display_name: string
          sender_wallet_address?: string | null
          stream_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by_wallet_address?: string | null
          donation_amount?: number | null
          donation_transaction_signature?: string | null
          id?: string
          is_deleted?: boolean
          is_donation?: boolean
          is_reply?: boolean
          message_content?: string
          reply_to_message_id?: string | null
          sender_display_name?: string
          sender_wallet_address?: string | null
          stream_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          bio: string | null
          content_categories: string[] | null
          created_at: string
          display_name: string
          email: string | null
          full_name: string | null
          language_preference: string | null
          persistent_ingress_id: string | null
          persistent_room_name: string | null
          persistent_rtmp_url: string | null
          persistent_stream_key: string | null
          profile_picture_url: string | null
          social_instagram_url: string | null
          social_kick_url: string | null
          social_telegram_url: string | null
          social_twitch_url: string | null
          social_x_url: string | null
          social_youtube_url: string | null
          subscription_enabled: boolean
          subscription_price_sol: number | null
          updated_at: string
          wallet_address: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          content_categories?: string[] | null
          created_at?: string
          display_name: string
          email?: string | null
          full_name?: string | null
          language_preference?: string | null
          persistent_ingress_id?: string | null
          persistent_room_name?: string | null
          persistent_rtmp_url?: string | null
          persistent_stream_key?: string | null
          profile_picture_url?: string | null
          social_instagram_url?: string | null
          social_kick_url?: string | null
          social_telegram_url?: string | null
          social_twitch_url?: string | null
          social_x_url?: string | null
          social_youtube_url?: string | null
          subscription_enabled?: boolean
          subscription_price_sol?: number | null
          updated_at?: string
          wallet_address: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          content_categories?: string[] | null
          created_at?: string
          display_name?: string
          email?: string | null
          full_name?: string | null
          language_preference?: string | null
          persistent_ingress_id?: string | null
          persistent_room_name?: string | null
          persistent_rtmp_url?: string | null
          persistent_stream_key?: string | null
          profile_picture_url?: string | null
          social_instagram_url?: string | null
          social_kick_url?: string | null
          social_telegram_url?: string | null
          social_twitch_url?: string | null
          social_x_url?: string | null
          social_youtube_url?: string | null
          subscription_enabled?: boolean
          subscription_price_sol?: number | null
          updated_at?: string
          wallet_address?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      creator_tokens: {
        Row: {
          bonding_curve_address: string | null
          created_at: string | null
          creator_user_id: string | null
          creator_wallet_address: string
          current_price_sol: number | null
          current_sol_reserves: number | null
          current_token_reserves: number | null
          graduated_at: string | null
          holder_count: number | null
          id: string
          initial_virtual_sol_reserves: number | null
          initial_virtual_token_reserves: number | null
          is_graduated: boolean | null
          market_cap_sol: number | null
          metadata_uri: string | null
          raydium_pool_address: string | null
          status: string | null
          telegram_url: string | null
          token_description: string | null
          token_image_url: string | null
          token_mint: string
          token_name: string
          token_symbol: string
          total_supply: number
          twitter_url: string | null
          updated_at: string | null
          volume_24h_sol: number | null
          website_url: string | null
        }
        Insert: {
          bonding_curve_address?: string | null
          created_at?: string | null
          creator_user_id?: string | null
          creator_wallet_address: string
          current_price_sol?: number | null
          current_sol_reserves?: number | null
          current_token_reserves?: number | null
          graduated_at?: string | null
          holder_count?: number | null
          id?: string
          initial_virtual_sol_reserves?: number | null
          initial_virtual_token_reserves?: number | null
          is_graduated?: boolean | null
          market_cap_sol?: number | null
          metadata_uri?: string | null
          raydium_pool_address?: string | null
          status?: string | null
          telegram_url?: string | null
          token_description?: string | null
          token_image_url?: string | null
          token_mint: string
          token_name: string
          token_symbol: string
          total_supply: number
          twitter_url?: string | null
          updated_at?: string | null
          volume_24h_sol?: number | null
          website_url?: string | null
        }
        Update: {
          bonding_curve_address?: string | null
          created_at?: string | null
          creator_user_id?: string | null
          creator_wallet_address?: string
          current_price_sol?: number | null
          current_sol_reserves?: number | null
          current_token_reserves?: number | null
          graduated_at?: string | null
          holder_count?: number | null
          id?: string
          initial_virtual_sol_reserves?: number | null
          initial_virtual_token_reserves?: number | null
          is_graduated?: boolean | null
          market_cap_sol?: number | null
          metadata_uri?: string | null
          raydium_pool_address?: string | null
          status?: string | null
          telegram_url?: string | null
          token_description?: string | null
          token_image_url?: string | null
          token_mint?: string
          token_name?: string
          token_symbol?: string
          total_supply?: number
          twitter_url?: string | null
          updated_at?: string | null
          volume_24h_sol?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_tokens_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_uploaded_videos: {
        Row: {
          bitrate: number | null
          bunny_encoding_status: string | null
          bunny_library_id: string
          bunny_playback_url: string
          bunny_thumbnail_url: string | null
          bunny_video_id: string
          category: string | null
          created_at: string
          deleted_at: string | null
          deleted_by_user: boolean | null
          deleted_by_wallet_address: string | null
          description: string | null
          duration: number | null
          file_size_bytes: number | null
          id: string
          language: string | null
          original_filename: string
          tags: string[] | null
          title: string
          updated_at: string
          upload_metadata: Json | null
          upload_status: string | null
          user_id: string
          video_format: string | null
          video_height: number | null
          video_width: number | null
          visibility: string | null
        }
        Insert: {
          bitrate?: number | null
          bunny_encoding_status?: string | null
          bunny_library_id: string
          bunny_playback_url: string
          bunny_thumbnail_url?: string | null
          bunny_video_id: string
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user?: boolean | null
          deleted_by_wallet_address?: string | null
          description?: string | null
          duration?: number | null
          file_size_bytes?: number | null
          id?: string
          language?: string | null
          original_filename: string
          tags?: string[] | null
          title: string
          updated_at?: string
          upload_metadata?: Json | null
          upload_status?: string | null
          user_id: string
          video_format?: string | null
          video_height?: number | null
          video_width?: number | null
          visibility?: string | null
        }
        Update: {
          bitrate?: number | null
          bunny_encoding_status?: string | null
          bunny_library_id?: string
          bunny_playback_url?: string
          bunny_thumbnail_url?: string | null
          bunny_video_id?: string
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user?: boolean | null
          deleted_by_wallet_address?: string | null
          description?: string | null
          duration?: number | null
          file_size_bytes?: number | null
          id?: string
          language?: string | null
          original_filename?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          upload_metadata?: Json | null
          upload_status?: string | null
          user_id?: string
          video_format?: string | null
          video_height?: number | null
          video_width?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_uploaded_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_sol: number
          created_at: string
          creator_user_id: string | null
          creator_wallet_address: string
          donor_user_id: string | null
          donor_wallet_address: string
          id: string
          message: string | null
          stream_id: string | null
          token_mint_address: string | null
          token_type: string
          transaction_signature: string
        }
        Insert: {
          amount_sol: number
          created_at?: string
          creator_user_id?: string | null
          creator_wallet_address: string
          donor_user_id?: string | null
          donor_wallet_address: string
          id?: string
          message?: string | null
          stream_id?: string | null
          token_mint_address?: string | null
          token_type?: string
          transaction_signature: string
        }
        Update: {
          amount_sol?: number
          created_at?: string
          creator_user_id?: string | null
          creator_wallet_address?: string
          donor_user_id?: string | null
          donor_wallet_address?: string
          id?: string
          message?: string | null
          stream_id?: string | null
          token_mint_address?: string | null
          token_type?: string
          transaction_signature?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_donor_user_id_fkey"
            columns: ["donor_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          email: string | null
          feedback_text: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          feedback_text: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          feedback_text?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      following: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
          id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
          id?: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "following_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "following_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          meeting_id: string
          participant_type: string | null
          permissions: Json
          role: string
          updated_at: string
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          meeting_id: string
          participant_type?: string | null
          permissions?: Json
          role?: string
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          meeting_id?: string
          participant_type?: string | null
          permissions?: Json
          role?: string
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          hls_egress_url: string | null
          host_user_id: string
          host_wallet_address: string | null
          id: string
          is_live: boolean | null
          is_livestreaming: boolean | null
          is_public: boolean
          is_recording: boolean | null
          livekit_egress_id: string | null
          livekit_room_name: string | null
          livekit_web_stream_url: string | null
          max_participants: number | null
          meeting_id: string
          mux_playback_id: string | null
          mux_stream_id: string | null
          mux_stream_key: string | null
          recording_url: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
          viewer_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          hls_egress_url?: string | null
          host_user_id: string
          host_wallet_address?: string | null
          id?: string
          is_live?: boolean | null
          is_livestreaming?: boolean | null
          is_public?: boolean
          is_recording?: boolean | null
          livekit_egress_id?: string | null
          livekit_room_name?: string | null
          livekit_web_stream_url?: string | null
          max_participants?: number | null
          meeting_id: string
          mux_playback_id?: string | null
          mux_stream_id?: string | null
          mux_stream_key?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          viewer_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          hls_egress_url?: string | null
          host_user_id?: string
          host_wallet_address?: string | null
          id?: string
          is_live?: boolean | null
          is_livestreaming?: boolean | null
          is_public?: boolean
          is_recording?: boolean | null
          livekit_egress_id?: string | null
          livekit_room_name?: string | null
          livekit_web_stream_url?: string | null
          max_participants?: number | null
          meeting_id?: string
          mux_playback_id?: string | null
          mux_stream_id?: string | null
          mux_stream_key?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      pinned_messages: {
        Row: {
          id: string
          message_id: string
          pinned_at: string
          pinned_by_wallet_address: string
          stream_id: string
        }
        Insert: {
          id?: string
          message_id: string
          pinned_at?: string
          pinned_by_wallet_address: string
          stream_id: string
        }
        Update: {
          id?: string
          message_id?: string
          pinned_at?: string
          pinned_by_wallet_address?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_configs: {
        Row: {
          created_at: string
          fee_rate_bps: number
          id: string
          is_active: boolean
          metadata: Json | null
          platform_authority: string
          platform_description: string | null
          platform_name: string
          platform_pda: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_rate_bps?: number
          id?: string
          is_active?: boolean
          metadata?: Json | null
          platform_authority: string
          platform_description?: string | null
          platform_name: string
          platform_pda: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_rate_bps?: number
          id?: string
          is_active?: boolean
          metadata?: Json | null
          platform_authority?: string
          platform_description?: string | null
          platform_name?: string
          platform_pda?: string
          updated_at?: string
        }
        Relationships: []
      }
      promoted_stream_viewer_heartbeats: {
        Row: {
          created_at: string
          first_seen_at: string
          ip_address: string
          last_seen_at: string
          promoted_stream_id: string
          total_heartbeats: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          first_seen_at?: string
          ip_address: string
          last_seen_at?: string
          promoted_stream_id: string
          total_heartbeats?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          first_seen_at?: string
          ip_address?: string
          last_seen_at?: string
          promoted_stream_id?: string
          total_heartbeats?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      promoted_stream_viewer_points: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: string
          points_earned: number
          promoted_stream_id: string
          updated_at: string
          user_id: string | null
          watch_time_seconds: number | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address: string
          points_earned?: number
          promoted_stream_id: string
          updated_at?: string
          user_id?: string | null
          watch_time_seconds?: number | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string
          points_earned?: number
          promoted_stream_id?: string
          updated_at?: string
          user_id?: string | null
          watch_time_seconds?: number | null
        }
        Relationships: []
      }
      promoted_stream_whitelist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      promoted_streams: {
        Row: {
          auto_expired_at: string | null
          base_payment_expires_at: string
          category: string
          created_at: string
          creator_user_id: string | null
          description: string | null
          discount_applied: boolean | null
          discount_type: string | null
          embed_url: string | null
          ended_by_creator: boolean
          id: string
          is_active: boolean
          manually_ended_at: string | null
          original_price_sol: number | null
          payment_confirmed_at: string
          placement_fee_sol: number
          placement_type: string
          slot_position: number | null
          stream_platform: string | null
          stream_title: string
          stream_url: string
          tags: string[] | null
          thumbnail_url: string
          total_amount_paid_sol: number
          transaction_signature: string
          updated_at: string
          viewer_count: number | null
          wallet_address: string
        }
        Insert: {
          auto_expired_at?: string | null
          base_payment_expires_at: string
          category: string
          created_at?: string
          creator_user_id?: string | null
          description?: string | null
          discount_applied?: boolean | null
          discount_type?: string | null
          embed_url?: string | null
          ended_by_creator?: boolean
          id?: string
          is_active?: boolean
          manually_ended_at?: string | null
          original_price_sol?: number | null
          payment_confirmed_at?: string
          placement_fee_sol?: number
          placement_type: string
          slot_position?: number | null
          stream_platform?: string | null
          stream_title: string
          stream_url: string
          tags?: string[] | null
          thumbnail_url: string
          total_amount_paid_sol: number
          transaction_signature: string
          updated_at?: string
          viewer_count?: number | null
          wallet_address: string
        }
        Update: {
          auto_expired_at?: string | null
          base_payment_expires_at?: string
          category?: string
          created_at?: string
          creator_user_id?: string | null
          description?: string | null
          discount_applied?: boolean | null
          discount_type?: string | null
          embed_url?: string | null
          ended_by_creator?: boolean
          id?: string
          is_active?: boolean
          manually_ended_at?: string | null
          original_price_sol?: number | null
          payment_confirmed_at?: string
          placement_fee_sol?: number
          placement_type?: string
          slot_position?: number | null
          stream_platform?: string | null
          stream_title?: string
          stream_url?: string
          tags?: string[] | null
          thumbnail_url?: string
          total_amount_paid_sol?: number
          transaction_signature?: string
          updated_at?: string
          viewer_count?: number | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoted_streams_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_access_passes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          transaction_signature: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          transaction_signature: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          transaction_signature?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      referral_statistics: {
        Row: {
          created_at: string
          id: string
          last_updated: string
          referrals_total: number
          referrals_valid: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated?: string
          referrals_total?: number
          referrals_valid?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_updated?: string
          referrals_total?: number
          referrals_valid?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      space_participants: {
        Row: {
          created_at: string
          display_name: string
          hand_raised: boolean | null
          hand_raised_at: string | null
          id: string
          is_active: boolean
          joined_at: string
          left_at: string | null
          role: string
          role_changed_at: string | null
          role_changed_by: string | null
          space_id: string
          updated_at: string
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          hand_raised?: boolean | null
          hand_raised_at?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          role_changed_at?: string | null
          role_changed_by?: string | null
          space_id: string
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          hand_raised?: boolean | null
          hand_raised_at?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          left_at?: string | null
          role?: string
          role_changed_at?: string | null
          role_changed_by?: string | null
          space_id?: string
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_participants_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces_v2: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          host_user_id: string | null
          host_wallet: string
          id: string
          is_live: boolean
          is_public: boolean
          max_participants: number | null
          participant_count: number
          room_name: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_user_id?: string | null
          host_wallet: string
          id?: string
          is_live?: boolean
          is_public?: boolean
          max_participants?: number | null
          participant_count?: number
          room_name: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_user_id?: string | null
          host_wallet?: string
          id?: string
          is_live?: boolean
          is_public?: boolean
          max_participants?: number | null
          participant_count?: number
          room_name?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_v2_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          hls_url: string | null
          id: string
          language: string | null
          livekit_egress_id: string | null
          livekit_ingress_id: string | null
          livekit_room_name: string | null
          livekit_rtmp_url: string | null
          livekit_stream_key: string | null
          livekit_web_stream_url: string | null
          livepeer_stream_id: string | null
          meeting_id: string | null
          mux_playback_id: string | null
          mux_stream_id: string | null
          mux_stream_key: string | null
          playback_id: string | null
          recording_status: string | null
          source: string | null
          source_type: string | null
          started_at: string | null
          status: string | null
          stream_key: string | null
          stream_method: string | null
          stream_type: string | null
          tags: string[] | null
          thumbnail: string | null
          thumbnail_generation_status: string | null
          thumbnail_updated_at: string | null
          title: string
          token_contract_address: string | null
          twitter_posted_at: string | null
          updated_at: string
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          hls_url?: string | null
          id?: string
          language?: string | null
          livekit_egress_id?: string | null
          livekit_ingress_id?: string | null
          livekit_room_name?: string | null
          livekit_rtmp_url?: string | null
          livekit_stream_key?: string | null
          livekit_web_stream_url?: string | null
          livepeer_stream_id?: string | null
          meeting_id?: string | null
          mux_playback_id?: string | null
          mux_stream_id?: string | null
          mux_stream_key?: string | null
          playback_id?: string | null
          recording_status?: string | null
          source?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          stream_method?: string | null
          stream_type?: string | null
          tags?: string[] | null
          thumbnail?: string | null
          thumbnail_generation_status?: string | null
          thumbnail_updated_at?: string | null
          title: string
          token_contract_address?: string | null
          twitter_posted_at?: string | null
          updated_at?: string
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          hls_url?: string | null
          id?: string
          language?: string | null
          livekit_egress_id?: string | null
          livekit_ingress_id?: string | null
          livekit_room_name?: string | null
          livekit_rtmp_url?: string | null
          livekit_stream_key?: string | null
          livekit_web_stream_url?: string | null
          livepeer_stream_id?: string | null
          meeting_id?: string | null
          mux_playback_id?: string | null
          mux_stream_id?: string | null
          mux_stream_key?: string | null
          playback_id?: string | null
          recording_status?: string | null
          source?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          stream_method?: string | null
          stream_type?: string | null
          tags?: string[] | null
          thumbnail?: string | null
          thumbnail_generation_status?: string | null
          thumbnail_updated_at?: string | null
          title?: string
          token_contract_address?: string | null
          twitter_posted_at?: string | null
          updated_at?: string
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "streams_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_holdings: {
        Row: {
          average_cost_sol: number | null
          balance: number
          created_at: string | null
          id: string
          last_updated: string | null
          token_mint: string | null
          total_invested_sol: number | null
          user_id: string | null
          user_wallet_address: string
        }
        Insert: {
          average_cost_sol?: number | null
          balance?: number
          created_at?: string | null
          id?: string
          last_updated?: string | null
          token_mint?: string | null
          total_invested_sol?: number | null
          user_id?: string | null
          user_wallet_address: string
        }
        Update: {
          average_cost_sol?: number | null
          balance?: number
          created_at?: string | null
          id?: string
          last_updated?: string | null
          token_mint?: string | null
          total_invested_sol?: number | null
          user_id?: string | null
          user_wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_holdings_token_mint_fkey"
            columns: ["token_mint"]
            isOneToOne: false
            referencedRelation: "creator_tokens"
            referencedColumns: ["token_mint"]
          },
          {
            foreignKeyName: "token_holdings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_transactions: {
        Row: {
          block_time: string | null
          created_at: string | null
          id: string
          price_per_token: number
          sol_amount: number
          token_amount: number
          token_mint: string | null
          transaction_signature: string
          transaction_type: string
          user_id: string | null
          user_wallet_address: string
        }
        Insert: {
          block_time?: string | null
          created_at?: string | null
          id?: string
          price_per_token: number
          sol_amount: number
          token_amount: number
          token_mint?: string | null
          transaction_signature: string
          transaction_type: string
          user_id?: string | null
          user_wallet_address: string
        }
        Update: {
          block_time?: string | null
          created_at?: string | null
          id?: string
          price_per_token?: number
          sol_amount?: number
          token_amount?: number
          token_mint?: string | null
          transaction_signature?: string
          transaction_type?: string
          user_id?: string | null
          user_wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_token_mint_fkey"
            columns: ["token_mint"]
            isOneToOne: false
            referencedRelation: "creator_tokens"
            referencedColumns: ["token_mint"]
          },
          {
            foreignKeyName: "token_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          appearance_settings: Json | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          google_id: string | null
          id: string
          location: string | null
          notification_preferences: Json | null
          privacy_settings: Json | null
          private_key_encrypted: string | null
          referral_code: string | null
          referral_code_used: string | null
          referred_by_wallet: string | null
          username: string
          wallet_address: string | null
        }
        Insert: {
          appearance_settings?: Json | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          google_id?: string | null
          id?: string
          location?: string | null
          notification_preferences?: Json | null
          privacy_settings?: Json | null
          private_key_encrypted?: string | null
          referral_code?: string | null
          referral_code_used?: string | null
          referred_by_wallet?: string | null
          username: string
          wallet_address?: string | null
        }
        Update: {
          appearance_settings?: Json | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          google_id?: string | null
          id?: string
          location?: string | null
          notification_preferences?: Json | null
          privacy_settings?: Json | null
          private_key_encrypted?: string | null
          referral_code?: string | null
          referral_code_used?: string | null
          referred_by_wallet?: string | null
          username?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          creator_wallet_address: string
          expires_at: string
          id: string
          price_paid_sol: number
          subscribed_at: string
          transaction_signature: string
          updated_at: string
          user_wallet_address: string
        }
        Insert: {
          created_at?: string
          creator_wallet_address: string
          expires_at: string
          id?: string
          price_paid_sol: number
          subscribed_at?: string
          transaction_signature: string
          updated_at?: string
          user_wallet_address: string
        }
        Update: {
          created_at?: string
          creator_wallet_address?: string
          expires_at?: string
          id?: string
          price_paid_sol?: number
          subscribed_at?: string
          transaction_signature?: string
          updated_at?: string
          user_wallet_address?: string
        }
        Relationships: []
      }
      user_watch_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          is_active: boolean
          last_heartbeat_at: string
          session_type: string
          started_at: string
          stream_id: string | null
          updated_at: string
          user_id: string
          vod_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat_at?: string
          session_type: string
          started_at?: string
          stream_id?: string | null
          updated_at?: string
          user_id: string
          vod_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat_at?: string
          session_type?: string
          started_at?: string
          stream_id?: string | null
          updated_at?: string
          user_id?: string
          vod_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_watch_sessions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watch_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watch_sessions_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "vods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_watch_statistics: {
        Row: {
          average_session_duration_seconds: number | null
          created_at: string
          current_streak_days: number | null
          id: string
          last_streak_date: string | null
          last_watched_at: string | null
          longest_session_duration_seconds: number | null
          longest_streak_days: number | null
          show_on_leaderboard: boolean
          total_sessions: number
          total_streams_watched: number
          total_vods_watched: number
          total_watch_time_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_session_duration_seconds?: number | null
          created_at?: string
          current_streak_days?: number | null
          id?: string
          last_streak_date?: string | null
          last_watched_at?: string | null
          longest_session_duration_seconds?: number | null
          longest_streak_days?: number | null
          show_on_leaderboard?: boolean
          total_sessions?: number
          total_streams_watched?: number
          total_vods_watched?: number
          total_watch_time_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_session_duration_seconds?: number | null
          created_at?: string
          current_streak_days?: number | null
          id?: string
          last_streak_date?: string | null
          last_watched_at?: string | null
          longest_session_duration_seconds?: number | null
          longest_streak_days?: number | null
          show_on_leaderboard?: boolean
          total_sessions?: number
          total_streams_watched?: number
          total_vods_watched?: number
          total_watch_time_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watch_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viewer_heartbeats: {
        Row: {
          created_at: string
          first_seen_at: string
          id: string
          ip_address: string
          last_seen_at: string
          stream_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_seen_at?: string
          id?: string
          ip_address: string
          last_seen_at?: string
          stream_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_seen_at?: string
          id?: string
          ip_address?: string
          last_seen_at?: string
          stream_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewer_heartbeats_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      vod_viewer_heartbeats: {
        Row: {
          created_at: string
          first_seen_at: string
          id: string
          ip_address: string
          last_seen_at: string
          updated_at: string
          vod_id: string
        }
        Insert: {
          created_at?: string
          first_seen_at?: string
          id?: string
          ip_address: string
          last_seen_at?: string
          updated_at?: string
          vod_id: string
        }
        Update: {
          created_at?: string
          first_seen_at?: string
          id?: string
          ip_address?: string
          last_seen_at?: string
          updated_at?: string
          vod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vod_viewer_heartbeats_vod_id_fkey"
            columns: ["vod_id"]
            isOneToOne: false
            referencedRelation: "vods"
            referencedColumns: ["id"]
          },
        ]
      }
      vods: {
        Row: {
          bunny_encoding_status: string | null
          bunny_library_id: string | null
          bunny_playback_url: string | null
          bunny_thumbnail_url: string | null
          bunny_video_id: string | null
          cloudflare_playback_url: string | null
          cloudflare_stream_uid: string | null
          created_at: string
          deleted_at: string | null
          deleted_by_user: boolean
          deleted_by_wallet_address: string | null
          description: string | null
          duration: number | null
          id: string
          livekit_egress_id: string | null
          mux_asset_created_at: string | null
          mux_asset_id: string
          mux_playback_id: string
          original_stream_id: string | null
          recording_file_path: string | null
          source: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          total_views: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bunny_encoding_status?: string | null
          bunny_library_id?: string | null
          bunny_playback_url?: string | null
          bunny_thumbnail_url?: string | null
          bunny_video_id?: string | null
          cloudflare_playback_url?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user?: boolean
          deleted_by_wallet_address?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          livekit_egress_id?: string | null
          mux_asset_created_at?: string | null
          mux_asset_id: string
          mux_playback_id: string
          original_stream_id?: string | null
          recording_file_path?: string | null
          source?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          total_views?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bunny_encoding_status?: string | null
          bunny_library_id?: string | null
          bunny_playback_url?: string | null
          bunny_thumbnail_url?: string | null
          bunny_video_id?: string | null
          cloudflare_playback_url?: string | null
          cloudflare_stream_uid?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by_user?: boolean
          deleted_by_wallet_address?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          livekit_egress_id?: string | null
          mux_asset_created_at?: string | null
          mux_asset_id?: string
          mux_playback_id?: string
          original_stream_id?: string | null
          recording_file_path?: string | null
          source?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          total_views?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vods_original_stream_id_fkey"
            columns: ["original_stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      creator_donation_summaries: {
        Row: {
          avg_donation: number | null
          creator_user_id: string | null
          last_donation_at: string | null
          total_donations: number | null
          total_sol: number | null
          total_wenlive: number | null
          unique_donors: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_expire_access_passes: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      auto_expire_promoted_streams: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      calculate_vod_total_views: {
        Args: { input_vod_id: string }
        Returns: number
      }
      calculate_vod_total_views_with_baseline: {
        Args: { vod_id_param: string }
        Returns: number
      }
      change_participant_role: {
        Args: {
          participant_id: string
          new_role: string
          changed_by_wallet: string
        }
        Returns: boolean
      }
      check_active_access_pass: {
        Args: { input_wallet_address: string }
        Returns: {
          id: string
          expires_at: string
          created_at: string
          transaction_signature: string
          hours_remaining: number
        }[]
      }
      create_access_pass: {
        Args: {
          input_wallet_address: string
          input_transaction_signature: string
        }
        Returns: string
      }
      delete_user_account: {
        Args: { requesting_user_id: string }
        Returns: Json
      }
      delete_user_uploaded_video: {
        Args: { video_id: string; requesting_wallet_address: string }
        Returns: boolean
      }
      delete_user_vod: {
        Args: { vod_id: string; requesting_wallet_address: string }
        Returns: boolean
      }
      end_inactive_user_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      end_inactive_user_watch_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      ensure_google_id_sync: {
        Args: { input_email: string; input_google_id: string }
        Returns: boolean
      }
      extract_platform_from_url: {
        Args: { stream_url: string }
        Returns: string
      }
      generate_embed_url: {
        Args: { stream_url: string; platform: string }
        Returns: string
      }
      generate_embed_url_with_config: {
        Args: {
          stream_url: string
          platform: string
          client_id?: string
          parent_domain?: string
        }
        Returns: string
      }
      generate_meeting_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_space_room_name: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_creator_analytics_fast: {
        Args: { input_creator_user_id: string }
        Returns: {
          total_donations: number
          total_sol: number
          total_wenlive: number
          avg_donation: number
          unique_donors: number
          last_donation_at: string
        }[]
      }
      get_creator_content_performance: {
        Args: { input_creator_user_id: string }
        Returns: {
          content_id: string
          content_type: string
          title: string
          created_at: string
          views: number
          watch_time_seconds: number
          duration_seconds: number
        }[]
      }
      get_creator_donation_history: {
        Args: { input_creator_user_id: string }
        Returns: {
          donation_id: string
          amount_sol: number
          message: string
          donor_wallet_address: string
          created_at: string
          stream_title: string
        }[]
      }
      get_creator_statistics: {
        Args: { input_creator_user_id: string }
        Returns: {
          total_streams: number
          total_vods: number
          total_views: number
          total_watch_time_seconds: number
          total_donations: number
          unique_viewers: number
          average_session_duration: number
        }[]
      }
      get_recent_donations_fast: {
        Args: { input_creator_user_id: string; limit_count?: number }
        Returns: {
          id: string
          amount_sol: number
          token_type: string
          message: string
          donor_wallet_address: string
          created_at: string
          stream_title: string
        }[]
      }
      get_stream_baseline_viewer_count: {
        Args: { stream_id_param: string }
        Returns: number
      }
      get_user_wallet_address: {
        Args: { user_uuid: string }
        Returns: string
      }
      handle_valid_referral_action: {
        Args: { user_wallet: string }
        Returns: undefined
      }
      increment_referral_stats: {
        Args: { referrer_wallet: string; is_valid?: boolean }
        Returns: undefined
      }
      is_current_wallet: {
        Args: { wallet_addr: string }
        Returns: boolean
      }
      is_wallet_whitelisted: {
        Args: { input_wallet_address: string }
        Returns: boolean
      }
      refresh_creator_donation_summaries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_google_user_profile: {
        Args: { user_email: string; auth_user_id: string }
        Returns: boolean
      }
      toggle_raise_hand: {
        Args: { participant_id: string; raise_hand?: boolean }
        Returns: boolean
      }
      update_promoted_stream_embed_urls: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_stream_viewer_count_with_baseline: {
        Args: { stream_id_param: string; actual_count: number }
        Returns: number
      }
      update_vod_total_views: {
        Args: { input_vod_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
