export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          block_play: boolean
          body: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kind: string
          require_typing: boolean
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          block_play?: boolean
          body: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind: string
          require_typing?: boolean
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          block_play?: boolean
          body?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          require_typing?: boolean
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      emote_broadcasts: {
        Row: {
          created_at: string
          display_mode: string
          emote_id: string
          gif_url: string
          id: string
          room_code: string
          sender_id: string | null
          sender_name: string | null
        }
        Insert: {
          created_at?: string
          display_mode: string
          emote_id: string
          gif_url: string
          id?: string
          room_code: string
          sender_id?: string | null
          sender_name?: string | null
        }
        Update: {
          created_at?: string
          display_mode?: string
          emote_id?: string
          gif_url?: string
          id?: string
          room_code?: string
          sender_id?: string | null
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emote_broadcasts_emote_id_fkey"
            columns: ["emote_id"]
            isOneToOne: false
            referencedRelation: "shop_emotes"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_versions: {
        Row: {
          created_at: string
          created_by: string | null
          game_id: string
          id: string
          note: string
          spec: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          game_id: string
          id?: string
          note?: string
          spec: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          game_id?: string
          id?: string
          note?: string
          spec?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_versions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          category: string
          cover_color: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string
          emoji: string
          html_content: string | null
          id: string
          instructions: string | null
          max_players: number
          min_players: number
          modes: Json
          name: string
          offline_ok: boolean
          play_count: number
          play_url: string | null
          primitive: string
          slug: string
          spec: Json
          status: string
          tags: string[]
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          cover_color?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          emoji?: string
          html_content?: string | null
          id?: string
          instructions?: string | null
          max_players?: number
          min_players?: number
          modes?: Json
          name: string
          offline_ok?: boolean
          play_count?: number
          play_url?: string | null
          primitive?: string
          slug: string
          spec?: Json
          status?: string
          tags?: string[]
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          cover_color?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          emoji?: string
          html_content?: string | null
          id?: string
          instructions?: string | null
          max_players?: number
          min_players?: number
          modes?: Json
          name?: string
          offline_ok?: boolean
          play_count?: number
          play_url?: string | null
          primitive?: string
          slug?: string
          spec?: Json
          status?: string
          tags?: string[]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      invite_claims: {
        Row: {
          created_at: string
          id: string
          invited_id: string
          referrer_id: string
          reward_gems: number
        }
        Insert: {
          created_at?: string
          id?: string
          invited_id: string
          referrer_id: string
          reward_gems?: number
        }
        Update: {
          created_at?: string
          id?: string
          invited_id?: string
          referrer_id?: string
          reward_gems?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_correct: boolean
          is_system: boolean
          player_name: string
          room_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_correct?: boolean
          is_system?: boolean
          player_name: string
          room_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          is_system?: boolean
          player_name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_rooms: {
        Row: {
          code: string
          created_at: string
          game_type: string
          host_client_id: string
          id: string
          players: Json
          state: Json
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          game_type: string
          host_client_id: string
          id?: string
          players?: Json
          state?: Json
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          game_type?: string
          host_client_id?: string
          id?: string
          players?: Json
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      owned_avatars: {
        Row: {
          avatar: string
          client_id: string
          created_at: string
          id: string
        }
        Insert: {
          avatar: string
          client_id: string
          created_at?: string
          id?: string
        }
        Update: {
          avatar?: string
          client_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      owned_emotes: {
        Row: {
          created_at: string
          emote_id: string
          id: string
          price_paid: number
          user_id: string
        }
        Insert: {
          created_at?: string
          emote_id: string
          id?: string
          price_paid?: number
          user_id: string
        }
        Update: {
          created_at?: string
          emote_id?: string
          id?: string
          price_paid?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owned_emotes_emote_id_fkey"
            columns: ["emote_id"]
            isOneToOne: false
            referencedRelation: "shop_emotes"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar: string
          client_id: string
          color: string
          guessed_correctly: boolean
          id: string
          joined_at: string
          name: string
          room_id: string
          score: number
          user_id: string | null
        }
        Insert: {
          avatar?: string
          client_id: string
          color?: string
          guessed_correctly?: boolean
          id?: string
          joined_at?: string
          name: string
          room_id: string
          score?: number
          user_id?: string | null
        }
        Update: {
          avatar?: string
          client_id?: string
          color?: string
          guessed_correctly?: boolean
          id?: string
          joined_at?: string
          name?: string
          room_id?: string
          score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string
          country: string | null
          created_at: string
          current_room_code: string | null
          id: string
          invite_code: string | null
          is_online: boolean
          language: string
          last_seen: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar?: string
          country?: string | null
          created_at?: string
          current_room_code?: string | null
          id: string
          invite_code?: string | null
          is_online?: boolean
          language?: string
          last_seen?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar?: string
          country?: string | null
          created_at?: string
          current_room_code?: string | null
          id?: string
          invite_code?: string | null
          is_online?: boolean
          language?: string
          last_seen?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      room_join_requests: {
        Row: {
          created_at: string
          id: string
          requester_avatar: string
          requester_id: string
          requester_name: string
          room_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_avatar?: string
          requester_id: string
          requester_name: string
          room_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_avatar?: string
          requester_id?: string
          requester_name?: string
          room_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_join_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          current_drawer_id: string | null
          current_word: string | null
          draw_seconds: number
          host_client_id: string
          host_user_id: string | null
          id: string
          max_rounds: number
          require_approval: boolean
          round: number
          round_ends_at: string | null
          status: string
          word_hint: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_drawer_id?: string | null
          current_word?: string | null
          draw_seconds?: number
          host_client_id: string
          host_user_id?: string | null
          id?: string
          max_rounds?: number
          require_approval?: boolean
          round?: number
          round_ends_at?: string | null
          status?: string
          word_hint?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_drawer_id?: string | null
          current_word?: string | null
          draw_seconds?: number
          host_client_id?: string
          host_user_id?: string | null
          id?: string
          max_rounds?: number
          require_approval?: boolean
          round?: number
          round_ends_at?: string | null
          status?: string
          word_hint?: string | null
        }
        Relationships: []
      }
      shop_emotes: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          display_mode: string
          gem_price: number
          gif_url: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          display_mode?: string
          gem_price: number
          gif_url: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          display_mode?: string
          gem_price?: number
          gif_url?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      strokes: {
        Row: {
          created_at: string
          data: Json
          id: string
          room_id: string
          round: number
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          room_id: string
          round?: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          room_id?: string
          round?: number
        }
        Relationships: [
          {
            foreignKeyName: "strokes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_sessions: {
        Row: {
          created_at: string
          draft_spec: Json
          folder: string
          game_id: string | null
          id: string
          messages: Json
          owner_id: string
          progress: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_spec?: Json
          folder?: string
          game_id?: string | null
          id?: string
          messages?: Json
          owner_id: string
          progress?: number
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_spec?: Json
          folder?: string
          game_id?: string | null
          id?: string
          messages?: Json
          owner_id?: string
          progress?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          client_id: string
          coins: number
          created_at: string
          gems: number
          updated_at: string
        }
        Insert: {
          client_id: string
          coins?: number
          created_at?: string
          gems?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          coins?: number
          created_at?: string
          gems?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_gems: {
        Args: { _amount: number; _client_id: string }
        Returns: number
      }
      gen_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_game_play: { Args: { _slug: string }; Returns: undefined }
      spend_gems: {
        Args: { _amount: number; _client_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
