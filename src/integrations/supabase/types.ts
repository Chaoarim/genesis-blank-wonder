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
      access_codes: {
        Row: {
          activated_at: string | null
          auth_user_id: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_admin: boolean
          last_login_at: string | null
          notes: string | null
          recovery_email: string | null
          revoked_at: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          auth_user_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_admin?: boolean
          last_login_at?: string | null
          notes?: string | null
          recovery_email?: string | null
          revoked_at?: string | null
          status?: string
        }
        Update: {
          activated_at?: string | null
          auth_user_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_admin?: boolean
          last_login_at?: string | null
          notes?: string | null
          recovery_email?: string | null
          revoked_at?: string | null
          status?: string
        }
        Relationships: []
      }
      accounts_payable: {
        Row: {
          amount: number
          barcode: string | null
          category: string
          created_at: string
          description: string
          document_number: string
          due_date: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          status: string
          supplier_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          barcode?: string | null
          category?: string
          created_at?: string
          description?: string
          document_number?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          status?: string
          supplier_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          barcode?: string | null
          category?: string
          created_at?: string
          description?: string
          document_number?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          status?: string
          supplier_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      catalog_customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          password_hash: string
          phone: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          password_hash: string
          phone: string
          seller_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          password_hash?: string
          phone?: string
          seller_id?: string
        }
        Relationships: []
      }
      catalog_orders: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          id: string
          items: Json
          seller_id: string
          status: string
          total: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          items?: Json
          seller_id: string
          status?: string
          total?: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          items?: Json
          seller_id?: string
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "catalog_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_pecas: {
        Row: {
          aplicacao: string | null
          codigo: string | null
          created_at: string | null
          fornecedor: string | null
          id: number
          produto: string | null
          veiculo: string | null
        }
        Insert: {
          aplicacao?: string | null
          codigo?: string | null
          created_at?: string | null
          fornecedor?: string | null
          id?: number
          produto?: string | null
          veiculo?: string | null
        }
        Update: {
          aplicacao?: string | null
          codigo?: string | null
          created_at?: string | null
          fornecedor?: string | null
          id?: number
          produto?: string | null
          veiculo?: string | null
        }
        Relationships: []
      }
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
      commission_payments: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          period_end: string
          period_start: string
          seller_auth_id: string
          seller_name: string
          total_commission: number
          total_sales: number
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          period_end: string
          period_start: string
          seller_auth_id: string
          seller_name: string
          total_commission?: number
          total_sales?: number
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          period_end?: string
          period_start?: string
          seller_auth_id?: string
          seller_name?: string
          total_commission?: number
          total_sales?: number
          user_id?: string
        }
        Relationships: []
      }
      consultas_historico: {
        Row: {
          created_at: string
          id: string
          menor_preco: number
          preco_medio: number
          termo_busca: string
          total_ofertas: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menor_preco?: number
          preco_medio?: number
          termo_busca: string
          total_ofertas?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menor_preco?: number
          preco_medio?: number
          termo_busca?: string
          total_ofertas?: number
          user_id?: string
        }
        Relationships: []
      }
      credit_approvals: {
        Row: {
          created_at: string
          credit_limit: number
          customer_id: string | null
          customer_name: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sale_id: string | null
          sale_total: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_limit?: number
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_id?: string | null
          sale_total?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_limit?: number
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sale_id?: string | null
          sale_total?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_approvals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_approvals_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          channel: string
          created_at: string
          customer_id: string
          description: string | null
          id: string
          scheduled_at: string | null
          seller_auth_id: string | null
          seller_name: string | null
          subject: string | null
          type: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          scheduled_at?: string | null
          seller_auth_id?: string | null
          seller_name?: string | null
          subject?: string | null
          type?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          scheduled_at?: string | null
          seller_auth_id?: string | null
          seller_name?: string | null
          subject?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_price_tiers: {
        Row: {
          created_at: string
          discount_percent: number
          id: string
          markup_percent: number
          name: string
          notes: string | null
          tier_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          id?: string
          markup_percent?: number
          name: string
          notes?: string | null
          tier_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          id?: string
          markup_percent?: number
          name?: string
          notes?: string | null
          tier_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          avatar_url: string | null
          code: string | null
          comprador: string | null
          cpf_cnpj: string | null
          created_at: string
          customer_type: string | null
          email: string | null
          empresa: string | null
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          limite_credito: number | null
          name: string
          notes: string | null
          phone: string | null
          seller_auth_id: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          code?: string | null
          comprador?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          limite_credito?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          seller_auth_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          code?: string | null
          comprador?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string | null
          empresa?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          limite_credito?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          seller_auth_id?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          supplier_filter: string | null
          used_count: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          supplier_filter?: string | null
          used_count?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          supplier_filter?: string | null
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
      expedition_items: {
        Row: {
          checked: boolean
          checked_at: string | null
          codigo: string
          expedition_id: string
          id: string
          notes: string | null
          produto: string
          quantidade_conferida: number
          quantidade_esperada: number
          sale_item_id: string | null
        }
        Insert: {
          checked?: boolean
          checked_at?: string | null
          codigo: string
          expedition_id: string
          id?: string
          notes?: string | null
          produto: string
          quantidade_conferida?: number
          quantidade_esperada?: number
          sale_item_id?: string | null
        }
        Update: {
          checked?: boolean
          checked_at?: string | null
          codigo?: string
          expedition_id?: string
          id?: string
          notes?: string | null
          produto?: string
          quantidade_conferida?: number
          quantidade_esperada?: number
          sale_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expedition_items_expedition_id_fkey"
            columns: ["expedition_id"]
            isOneToOne: false
            referencedRelation: "expedition_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expedition_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      expedition_orders: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          sale_id: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sale_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          sale_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expedition_orders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_rankings: {
        Row: {
          created_at: string
          id: string
          model: string
          position: number
          quantity: number
          vehicle_type: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          model: string
          position: number
          quantity?: number
          vehicle_type?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          model?: string
          position?: number
          quantity?: number
          vehicle_type?: string
          year?: number
        }
        Relationships: []
      }
      fleet_regional_data: {
        Row: {
          created_at: string
          id: string
          month: number | null
          percentage: number
          quantity: number
          region: string
          vehicle_type: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month?: number | null
          percentage?: number
          quantity?: number
          region: string
          vehicle_type?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number | null
          percentage?: number
          quantity?: number
          region?: string
          vehicle_type?: string
          year?: number
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          aplicacao: string | null
          codigo: string
          created_at: string
          fornecedor: string | null
          id: string
          image_url: string | null
          preco: number
          produto: string
          qtd_estoque: number
          updated_at: string
          user_id: string
          vendidos_display: number
          visible_catalog: boolean
        }
        Insert: {
          aplicacao?: string | null
          codigo: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          image_url?: string | null
          preco?: number
          produto: string
          qtd_estoque?: number
          updated_at?: string
          user_id: string
          vendidos_display?: number
          visible_catalog?: boolean
        }
        Update: {
          aplicacao?: string | null
          codigo?: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          image_url?: string | null
          preco?: number
          produto?: string
          qtd_estoque?: number
          updated_at?: string
          user_id?: string
          vendidos_display?: number
          visible_catalog?: boolean
        }
        Relationships: []
      }
      inventory_promotions: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          discount_percent: number
          expires_at: string
          id: string
          inventory_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount_percent?: number
          expires_at: string
          id?: string
          inventory_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount_percent?: number
          expires_at?: string
          id?: string
          inventory_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_promotions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      markup_settings: {
        Row: {
          created_at: string
          id: string
          markup_distribuidor: number
          markup_revenda: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          markup_distribuidor?: number
          markup_revenda?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          markup_distribuidor?: number
          markup_revenda?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ml_cache: {
        Row: {
          created_at: string
          disponivel_regiao: boolean
          estado_vendedor: string
          expires_at: string
          fornecedor_id: string
          fornecedor_nome: string
          fornecedor_reputacao: string
          fornecedor_total_vendas: number
          id: string
          link_anuncio: string
          menor_preco: number
          ml_item_id: string
          peca_codigo: string
          peca_nome: string
          preco_atual: number
          preco_medio: number
          regiao: string
          thumbnail: string
          titulo_ml: string
          total_vendido: number
          user_id: string
        }
        Insert: {
          created_at?: string
          disponivel_regiao?: boolean
          estado_vendedor?: string
          expires_at?: string
          fornecedor_id?: string
          fornecedor_nome?: string
          fornecedor_reputacao?: string
          fornecedor_total_vendas?: number
          id?: string
          link_anuncio?: string
          menor_preco?: number
          ml_item_id?: string
          peca_codigo?: string
          peca_nome?: string
          preco_atual?: number
          preco_medio?: number
          regiao?: string
          thumbnail?: string
          titulo_ml?: string
          total_vendido?: number
          user_id: string
        }
        Update: {
          created_at?: string
          disponivel_regiao?: boolean
          estado_vendedor?: string
          expires_at?: string
          fornecedor_id?: string
          fornecedor_nome?: string
          fornecedor_reputacao?: string
          fornecedor_total_vendas?: number
          id?: string
          link_anuncio?: string
          menor_preco?: number
          ml_item_id?: string
          peca_codigo?: string
          peca_nome?: string
          preco_atual?: number
          preco_medio?: number
          regiao?: string
          thumbnail?: string
          titulo_ml?: string
          total_vendido?: number
          user_id?: string
        }
        Relationships: []
      }
      ml_market_data: {
        Row: {
          created_at: string
          data_consulta: string
          fornecedor_lider: string
          id: string
          link_anuncio: string
          menor_preco: number
          ml_item_id: string
          peca_codigo: string
          peca_produto: string
          preco_atual: number
          regiao: string
          reputacao_vendedor: string
          thumbnail_url: string
          titulo_ml: string
          total_vendido: number
          user_id: string
        }
        Insert: {
          created_at?: string
          data_consulta?: string
          fornecedor_lider?: string
          id?: string
          link_anuncio?: string
          menor_preco?: number
          ml_item_id?: string
          peca_codigo: string
          peca_produto?: string
          preco_atual?: number
          regiao?: string
          reputacao_vendedor?: string
          thumbnail_url?: string
          titulo_ml?: string
          total_vendido?: number
          user_id: string
        }
        Update: {
          created_at?: string
          data_consulta?: string
          fornecedor_lider?: string
          id?: string
          link_anuncio?: string
          menor_preco?: number
          ml_item_id?: string
          peca_codigo?: string
          peca_produto?: string
          preco_atual?: number
          regiao?: string
          reputacao_vendedor?: string
          thumbnail_url?: string
          titulo_ml?: string
          total_vendido?: number
          user_id?: string
        }
        Relationships: []
      }
      ml_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          ml_nickname: string | null
          ml_user_id: number | null
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          ml_nickname?: string | null
          ml_user_id?: number | null
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          ml_nickname?: string | null
          ml_user_id?: number | null
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parts: {
        Row: {
          anos_aplicacao: string | null
          catalogo: string | null
          chave_de_busca: string | null
          codigo_peca: string | null
          codigos_similares: string | null
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
          catalogo?: string | null
          chave_de_busca?: string | null
          codigo_peca?: string | null
          codigos_similares?: string | null
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
          catalogo?: string | null
          chave_de_busca?: string | null
          codigo_peca?: string | null
          codigos_similares?: string | null
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
      payable_suppliers: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_term_rules: {
        Row: {
          created_at: string
          day_intervals: string
          id: string
          installments: number
          max_amount: number | null
          min_amount: number
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_intervals?: string
          id?: string
          installments?: number
          max_amount?: number | null
          min_amount?: number
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_intervals?: string
          id?: string
          installments?: number
          max_amount?: number | null
          min_amount?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      pecas: {
        Row: {
          aplicacao: string | null
          busca_ts: unknown
          codigo: string
          fornecedor: string | null
          id: number
          produto: string
        }
        Insert: {
          aplicacao?: string | null
          busca_ts?: unknown
          codigo: string
          fornecedor?: string | null
          id?: number
          produto: string
        }
        Update: {
          aplicacao?: string | null
          busca_ts?: unknown
          codigo?: string
          fornecedor?: string | null
          id?: number
          produto?: string
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
          company_name: string | null
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
          company_name?: string | null
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
          company_name?: string | null
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
      price_history: {
        Row: {
          codigo: string
          created_at: string
          id: string
          inventory_item_id: string
          preco_anterior: number
          preco_novo: number
          produto: string
          tipo: string
          user_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          inventory_item_id: string
          preco_anterior?: number
          preco_novo?: number
          produto: string
          tipo?: string
          user_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          inventory_item_id?: string
          preco_anterior?: number
          preco_novo?: number
          produto?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          fornecedor: string | null
          id: string
          preco_custo: number
          user_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          fornecedor?: string | null
          id?: string
          preco_custo?: number
          user_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          fornecedor?: string | null
          id?: string
          preco_custo?: number
          user_id?: string
        }
        Relationships: []
      }
      product_kit_items: {
        Row: {
          codigo: string
          created_at: string
          fornecedor: string | null
          id: string
          kit_id: string
          preco_unitario: number
          produto: string
          quantidade: number
        }
        Insert: {
          codigo: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          kit_id: string
          preco_unitario?: number
          produto: string
          quantidade?: number
        }
        Update: {
          codigo?: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          kit_id?: string
          preco_unitario?: number
          produto?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "product_kits"
            referencedColumns: ["id"]
          },
        ]
      }
      product_kits: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
          vehicle: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
          vehicle?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          vehicle?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      radar_cache: {
        Row: {
          created_at: string
          estado_filtro: string
          expires_at: string
          id: string
          payload_json: Json
          preco_maximo: number
          preco_medio: number
          preco_minimo: number
          termo_busca: string
          tipo_busca: string
          total_anuncios: number
          total_vendido_soma: number
          vendedor_lider_nome: string
          vendedor_lider_vendas: number
        }
        Insert: {
          created_at?: string
          estado_filtro?: string
          expires_at?: string
          id?: string
          payload_json?: Json
          preco_maximo?: number
          preco_medio?: number
          preco_minimo?: number
          termo_busca?: string
          tipo_busca?: string
          total_anuncios?: number
          total_vendido_soma?: number
          vendedor_lider_nome?: string
          vendedor_lider_vendas?: number
        }
        Update: {
          created_at?: string
          estado_filtro?: string
          expires_at?: string
          id?: string
          payload_json?: Json
          preco_maximo?: number
          preco_medio?: number
          preco_minimo?: number
          termo_busca?: string
          tipo_busca?: string
          total_anuncios?: number
          total_vendido_soma?: number
          vendedor_lider_nome?: string
          vendedor_lider_vendas?: number
        }
        Relationships: []
      }
      radar_favoritos: {
        Row: {
          created_at: string
          id: string
          label_personalizado: string | null
          termo_busca: string
          tipo_busca: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label_personalizado?: string | null
          termo_busca?: string
          tipo_busca?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label_personalizado?: string | null
          termo_busca?: string
          tipo_busca?: string
          user_id?: string
        }
        Relationships: []
      }
      radar_historico: {
        Row: {
          data_registro: string
          estado: string
          id: string
          preco_medio: number
          termo_busca: string
          total_vendido: number
        }
        Insert: {
          data_registro?: string
          estado?: string
          id?: string
          preco_medio?: number
          termo_busca?: string
          total_vendido?: number
        }
        Update: {
          data_registro?: string
          estado?: string
          id?: string
          preco_medio?: number
          termo_busca?: string
          total_vendido?: number
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          codigo: string
          created_at: string
          fornecedor: string | null
          id: string
          preco_unitario: number
          produto: string
          quantidade: number
          sale_id: string
          user_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          preco_unitario?: number
          produto: string
          quantidade?: number
          sale_id: string
          user_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          preco_unitario?: number
          produto?: string
          quantidade?: number
          sale_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          delivery_type: string
          discount: number
          id: string
          nf_chave: string | null
          nf_numero: string | null
          nf_serie: string | null
          nf_status: string
          notes: string | null
          paid_at: string | null
          payment_deadline: string | null
          payment_method: string
          seller_auth_id: string | null
          seller_name: string | null
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivery_type?: string
          discount?: number
          id?: string
          nf_chave?: string | null
          nf_numero?: string | null
          nf_serie?: string | null
          nf_status?: string
          notes?: string | null
          paid_at?: string | null
          payment_deadline?: string | null
          payment_method?: string
          seller_auth_id?: string | null
          seller_name?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          delivery_type?: string
          discount?: number
          id?: string
          nf_chave?: string | null
          nf_numero?: string | null
          nf_serie?: string | null
          nf_status?: string
          notes?: string | null
          paid_at?: string | null
          payment_deadline?: string | null
          payment_method?: string
          seller_auth_id?: string | null
          seller_name?: string | null
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_commissions: {
        Row: {
          commission_fixed: number
          commission_percent: number
          created_at: string
          id: string
          reference: string | null
          seller_auth_id: string | null
          seller_name: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_fixed?: number
          commission_percent?: number
          created_at?: string
          id?: string
          reference?: string | null
          seller_auth_id?: string | null
          seller_name?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_fixed?: number
          commission_percent?: number
          created_at?: string
          id?: string
          reference?: string | null
          seller_auth_id?: string | null
          seller_name?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_goals: {
        Row: {
          created_at: string
          goal_amount: number
          id: string
          month: number
          seller_auth_id: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          goal_amount?: number
          id?: string
          month: number
          seller_auth_id?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          goal_amount?: number
          id?: string
          month?: number
          seller_auth_id?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      saved_quotes: {
        Row: {
          converted_sale_id: string | null
          created_at: string
          created_by_user_id: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          expires_at: string | null
          id: string
          items: Json
          notes: string | null
          pipeline_stage: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          converted_sale_id?: string | null
          created_at?: string
          created_by_user_id: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          expires_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          pipeline_stage?: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          converted_sale_id?: string | null
          created_at?: string
          created_by_user_id?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          expires_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          pipeline_stage?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_quotes_converted_sale_id_fkey"
            columns: ["converted_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          seller_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          seller_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          seller_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_permissions_seller_user_id_fkey"
            columns: ["seller_user_id"]
            isOneToOne: false
            referencedRelation: "seller_users"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_users: {
        Row: {
          admin_user_id: string
          code: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          seller_auth_id: string | null
        }
        Insert: {
          admin_user_id: string
          code?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          seller_auth_id?: string | null
        }
        Update: {
          admin_user_id?: string
          code?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          seller_auth_id?: string | null
        }
        Relationships: []
      }
      supplier_catalog_items: {
        Row: {
          aplicacao: string | null
          codigo: string
          created_at: string
          fornecedor: string | null
          id: string
          produto: string
          user_id: string
        }
        Insert: {
          aplicacao?: string | null
          codigo: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          produto: string
          user_id: string
        }
        Update: {
          aplicacao?: string | null
          codigo?: string
          created_at?: string
          fornecedor?: string | null
          id?: string
          produto?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_contacts: {
        Row: {
          created_at: string
          distributor_name: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          seller_name: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          distributor_name: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          seller_name?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          distributor_name?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          seller_name?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
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
      warranty_returns: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          id: string
          items: Json
          reason: string | null
          resolution: string | null
          resolved_at: string | null
          sale_id: string | null
          status: string
          total_value: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          reason?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          status?: string
          total_value?: number
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          reason?: string | null
          resolution?: string | null
          resolved_at?: string | null
          sale_id?: string | null
          status?: string
          total_value?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
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
      _catalog_hash_password: { Args: { pw: string }; Returns: string }
      _catalog_verify_password: {
        Args: { pw: string; pw_hash: string }
        Returns: boolean
      }
      buscar_pecas: {
        Args: { p_limite?: number; p_query: string }
        Returns: {
          aplicacao: string
          codigo: string
          fornecedor: string
          id: number
          produto: string
          relevancia: number
        }[]
      }
      check_subscription_status: {
        Args: { p_user_id: string }
        Returns: string
      }
      generate_unique_access_code: { Args: never; Returns: string }
      get_admin_user_id: { Args: never; Returns: string }
      get_daily_usage: { Args: { p_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_seller_module_access: { Args: { _module: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
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
