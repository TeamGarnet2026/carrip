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
      external_prices: {
        Row: {
          id: string
          key: string
          ttl_days: number
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          id?: string
          key: string
          ttl_days?: number
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          id?: string
          key?: string
          ttl_days?: number
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      gasoline_price_national: {
        Row: {
          diesel_price: number | null
          id: number
          premium_price: number | null
          regular_price: number
          survey_date: string
          updated_at: string
        }
        Insert: {
          diesel_price?: number | null
          id?: number
          premium_price?: number | null
          regular_price: number
          survey_date: string
          updated_at?: string
        }
        Update: {
          diesel_price?: number | null
          id?: number
          premium_price?: number | null
          regular_price?: number
          survey_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      gasoline_prices: {
        Row: {
          diesel_price: number | null
          id: string
          prefecture_code: string
          prefecture_name: string
          premium_price: number | null
          regular_price: number
          survey_date: string
          updated_at: string
        }
        Insert: {
          diesel_price?: number | null
          id?: string
          prefecture_code: string
          prefecture_name: string
          premium_price?: number | null
          regular_price: number
          survey_date: string
          updated_at?: string
        }
        Update: {
          diesel_price?: number | null
          id?: string
          prefecture_code?: string
          prefecture_name?: string
          premium_price?: number | null
          regular_price?: number
          survey_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      pois: {
        Row: {
          category: string | null
          created_at: string
          google_place_id: string
          id: string
          lat: number
          lng: number
          name: string
          opening_hours_json: Json | null
          parking_info: Json | null
          prefecture: string | null
          rating: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          google_place_id: string
          id?: string
          lat: number
          lng: number
          name: string
          opening_hours_json?: Json | null
          parking_info?: Json | null
          prefecture?: string | null
          rating?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          google_place_id?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          opening_hours_json?: Json | null
          parking_info?: Json | null
          prefecture?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      route_stops: {
        Row: {
          admission_fee: number | null
          created_at: string
          day_number: number
          id: string
          is_rest_stop: boolean
          parking_cost: number | null
          poi_id: string
          route_id: string
          stay_minutes: number
          stop_order: number
        }
        Insert: {
          admission_fee?: number | null
          created_at?: string
          day_number: number
          id?: string
          is_rest_stop?: boolean
          parking_cost?: number | null
          poi_id: string
          route_id: string
          stay_minutes?: number
          stop_order: number
        }
        Update: {
          admission_fee?: number | null
          created_at?: string
          day_number?: number
          id?: string
          is_rest_stop?: boolean
          parking_cost?: number | null
          poi_id?: string
          route_id?: string
          stay_minutes?: number
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "pois"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          cost_breakdown_json: Json | null
          cost_per_person: number | null
          created_at: string
          id: string
          is_confirmed: boolean | null
          rank: number
          score: number | null
          total_cost: number | null
          total_distance_km: number | null
          total_duration_min: number | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          cost_breakdown_json?: Json | null
          cost_per_person?: number | null
          created_at?: string
          id?: string
          is_confirmed?: boolean | null
          rank: number
          score?: number | null
          total_cost?: number | null
          total_distance_km?: number | null
          total_duration_min?: number | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          cost_breakdown_json?: Json | null
          cost_per_person?: number | null
          created_at?: string
          id?: string
          is_confirmed?: boolean | null
          rank?: number
          score?: number | null
          total_cost?: number | null
          total_distance_km?: number | null
          total_duration_min?: number | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          route_id: string
          short_code: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          route_id: string
          short_code: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          route_id?: string
          short_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "shares_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          days: number
          departure_date: string
          id: string
          last_accessed_at: string
          origin: string
          owner_id: string | null
          people: number
          prefecture: string[]
          vehicle_json: Json | null
        }
        Insert: {
          created_at?: string
          days?: number
          departure_date: string
          id?: string
          last_accessed_at?: string
          origin: string
          owner_id?: string | null
          people?: number
          prefecture: string[]
          vehicle_json?: Json | null
        }
        Update: {
          created_at?: string
          days?: number
          departure_date?: string
          id?: string
          last_accessed_at?: string
          origin?: string
          owner_id?: string | null
          people?: number
          prefecture?: string[]
          vehicle_json?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
