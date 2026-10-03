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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bets: {
        Row: {
          created_at: string
          details: Json
          game: string
          id: string
          payout: number
          username: string
          wager: number
        }
        Insert: {
          created_at?: string
          details?: Json
          game: string
          id?: string
          payout?: number
          username: string
          wager: number
        }
        Update: {
          created_at?: string
          details?: Json
          game?: string
          id?: string
          payout?: number
          username?: string
          wager?: number
        }
        Relationships: [
          {
            foreignKeyName: "bets_username_fkey"
            columns: ["username"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["username"]
          },
        ]
      }
      blackjack_games: {
        Row: {
          created_at: string
          dealer: number[]
          deck: number[]
          id: string
          player: number[]
          status: string
          username: string
          wager: number
        }
        Insert: {
          created_at?: string
          dealer: number[]
          deck: number[]
          id?: string
          player: number[]
          status?: string
          username: string
          wager: number
        }
        Update: {
          created_at?: string
          dealer?: number[]
          deck?: number[]
          id?: string
          player?: number[]
          status?: string
          username?: string
          wager?: number
        }
        Relationships: [
          {
            foreignKeyName: "blackjack_games_username_fkey"
            columns: ["username"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["username"]
          },
        ]
      }
      deposits: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          id: string
          status: string
          username: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          username: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_username_fkey"
            columns: ["username"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["username"]
          },
        ]
      }
      mines_games: {
        Row: {
          bombs: number[]
          created_at: string
          id: string
          mines: number
          revealed: number[]
          status: string
          username: string
          wager: number
        }
        Insert: {
          bombs: number[]
          created_at?: string
          id?: string
          mines: number
          revealed?: number[]
          status?: string
          username: string
          wager: number
        }
        Update: {
          bombs?: number[]
          created_at?: string
          id?: string
          mines?: number
          revealed?: number[]
          status?: string
          username?: string
          wager?: number
        }
        Relationships: [
          {
            foreignKeyName: "mines_games_username_fkey"
            columns: ["username"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["username"]
          },
        ]
      }
      players: {
        Row: {
          balance: number
          created_at: string
          user_id: string | null
          username: string
          withdrawals_banned: boolean
        }
        Insert: {
          balance?: number
          created_at?: string
          user_id?: string | null
          username: string
          withdrawals_banned?: boolean
        }
        Update: {
          balance?: number
          created_at?: string
          user_id?: string | null
          username?: string
          withdrawals_banned?: boolean
        }
        Relationships: []
      }
      verifications: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          user_id: string
          username: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          user_id: string
          username: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          user_id?: string
          username?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          status: string
          username: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          username: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_username_fkey"
            columns: ["username"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["username"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_balance: {
        Args: { _delta: number; _username: string }
        Returns: number
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
