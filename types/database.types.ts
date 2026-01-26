export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'client' | 'admin' | 'designer'
          company_name: string | null
          contact_name: string | null
          email: string
          phone: string | null
          siret: string | null
          vat_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'client' | 'admin' | 'designer'
          company_name?: string | null
          contact_name?: string | null
          email: string
          phone?: string | null
          siret?: string | null
          vat_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'client' | 'admin' | 'designer'
          company_name?: string | null
          contact_name?: string | null
          email?: string
          phone?: string | null
          siret?: string | null
          vat_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          size: string
          width: number | null
          height: number | null
          depth: number | null
          base_price: number
          paper_weight: string | null
          handle_type: string | null
          category: 'standard' | 'window' | 'special' | 'seasonal'
          is_seasonal: boolean
          season_name: string | null
          is_active: boolean
          image_url: string | null
          description: string | null
          min_order_quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          size: string
          width?: number | null
          height?: number | null
          depth?: number | null
          base_price: number
          paper_weight?: string | null
          handle_type?: string | null
          category?: 'standard' | 'window' | 'special' | 'seasonal'
          is_seasonal?: boolean
          season_name?: string | null
          is_active?: boolean
          image_url?: string | null
          description?: string | null
          min_order_quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      client_products: {
        Row: {
          id: string
          client_id: string
          product_id: string
          custom_name: string | null
          custom_design_url: string | null
          logo_url: string | null
          print_color: string
          print_colors_count: number
          paper_weight: string
          handle_type: string
          is_active: boolean
          last_order_date: string | null
          total_ordered: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          product_id: string
          custom_name?: string | null
          custom_design_url?: string | null
          logo_url?: string | null
          print_color?: string
          print_colors_count?: number
          paper_weight?: string
          handle_type?: string
          is_active?: boolean
          last_order_date?: string | null
          total_ordered?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['client_products']['Insert']>
      }
      inventory: {
        Row: {
          id: string
          client_product_id: string
          quantity: number
          alert_threshold: number
          critical_threshold: number
          last_updated: string
          notes: string | null
        }
        Insert: {
          id?: string
          client_product_id: string
          quantity?: number
          alert_threshold?: number
          critical_threshold?: number
          last_updated?: string
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>
      }
      orders: {
        Row: {
          id: string
          order_number: string
          client_id: string
          client_product_id: string | null
          quantity: number
          unit_price: number
          total_ht: number
          total_ttc: number
          tva_rate: number
          status: 'quote' | 'confirmed' | 'production' | 'delivered_eonite' | 'available' | 'cancelled'
          production_progress: number
          estimated_completion: string | null
          actual_completion: string | null
          invoice_url: string | null
          bat_url: string | null
          payment_status: 'pending' | 'paid' | 'refunded'
          payment_method: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          client_id: string
          client_product_id?: string | null
          quantity: number
          unit_price: number
          total_ht: number
          total_ttc: number
          tva_rate?: number
          status?: 'quote' | 'confirmed' | 'production' | 'delivered_eonite' | 'available' | 'cancelled'
          production_progress?: number
          estimated_completion?: string | null
          actual_completion?: string | null
          invoice_url?: string | null
          bat_url?: string | null
          payment_status?: 'pending' | 'paid' | 'refunded'
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          client_product_id: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          client_product_id?: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          is_read: boolean
          read_at: string | null
          attachment_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          is_read?: boolean
          read_at?: string | null
          attachment_url?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
      conversations: {
        Row: {
          id: string
          client_id: string
          admin_id: string | null
          subject: string
          status: 'open' | 'closed'
          last_message_at: string
          unread_count: number
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          admin_id?: string | null
          subject?: string
          status?: 'open' | 'closed'
          last_message_at?: string
          unread_count?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'stock_alert' | 'order_update' | 'promotion' | 'message' | 'delivery' | 'system'
          is_read: boolean
          read_at: string | null
          link: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'stock_alert' | 'order_update' | 'promotion' | 'message' | 'delivery' | 'system'
          is_read?: boolean
          read_at?: string | null
          link?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
