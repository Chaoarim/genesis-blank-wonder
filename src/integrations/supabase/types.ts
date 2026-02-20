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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_usage: {
        Row: {
          id: string
          query_count: number
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          query_count?: number
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          query_count?: number
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parts: {
        Row: {
          anos_aplicacao: string | null
          chave_de_busca: string | null
          codigo_peca: string | null
          contexto_ia: string | null
          created_at: string
          descricao: string | null
          fabricante: string | null
          id: string
          image_url: string | null
          marca_veiculo: string | null
          modelo_veiculo: string | null
        }
        Insert: {
          anos_aplicacao?: string | null
          chave_de_busca?: string | null
          codigo_peca?: string | null
          contexto_ia?: string | null
          created_at?: string
          descricao?: string | null
          fabricante?: string | null
          id?: string
          image_url?: string | null
          marca_veiculo?: string | null
          modelo_veiculo?: string | null
        }
        Update: {
          anos_aplicacao?: string | null
          chave_de_busca?: string | null
          codigo_peca?: string | null
          contexto_ia?: string | null
          created_at?: string
          descricao?: string | null
          fabricante?: string | null
          id?: string
          image_url?: string | null
          marca_veiculo?: string | null
          modelo_veiculo?: string | null
        }
        Relationships: []
      }
      popular_car_parts: {
        Row: {
          aplicacao: string | null
          car_id: string
          created_at: string
          fabricante: string | null
          fornecedor: string | null
          id: string
          produto: string
        }
        Insert: {
          aplicacao?: string | null
          car_id: string
          created_at?: string
          fabricante?: string | null
          fornecedor?: string | null
          id?: string
          produto: string
        }
        Update: {
          aplicacao?: string | null
          car_id?: string
          created_at?: string
          fabricante?: string | null
          fornecedor?: string | null
          id?: string
          produto?: string
        }
        Relationships: [
          {
            foreignKeyName: "popular_car_parts_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "popular_cars"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_cars: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      pre_registrations: {
        Row: {
          approved_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          password_hash: string | null
          status: string
          whatsapp: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          password_hash?: string | null
          status?: string
          whatsapp: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          password_hash?: string | null
          status?: string
          whatsapp?: string
        }
        Relationships: []
      }
      price_comparison_products: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          id: string
          local: string
          marca: string
          melhor_preco: string | null
          preco_dpk: number | null
          preco_real: number | null
          preco_sama: number | null
          qtde: number
          roles_dpk: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          id?: string
          local: string
          marca: string
          melhor_preco?: string | null
          preco_dpk?: number | null
          preco_real?: number | null
          preco_sama?: number | null
          qtde?: number
          roles_dpk?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          id?: string
          local?: string
          marca?: string
          melhor_preco?: string | null
          preco_dpk?: number | null
          preco_real?: number | null
          preco_sama?: number | null
          qtde?: number
          roles_dpk?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_subscriptions: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          kiwify_customer_id: string | null
          notes: string | null
          plan: string | null
          started_at: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          kiwify_customer_id?: string | null
          notes?: string | null
          plan?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          kiwify_customer_id?: string | null
          notes?: string | null
          plan?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          acao_acesso: string | null
          data_hora: string
          email: string
          evento_recebido: string
          id: string
          plano_aplicado: string | null
        }
        Insert: {
          acao_acesso?: string | null
          data_hora?: string
          email: string
          evento_recebido: string
          id?: string
          plano_aplicado?: string | null
        }
        Update: {
          acao_acesso?: string | null
          data_hora?: string
          email?: string
          evento_recebido?: string
          id?: string
          plano_aplicado?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_subscription_status: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_daily_usage: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_subscription_by_email: {
        Args: { p_email: string; p_plan: string; p_status: string }
        Returns: undefined
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
