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
      ad_campaigns: {
        Row: {
          advertiser_id: string
          blurb: string
          budget_cents: number
          clicks: number
          company_name: string
          created_at: string
          cta: string
          ends_on: string
          gradient_from: string
          gradient_to: string
          id: string
          image_shape: string
          image_url: string
          impressions: number
          link_url: string
          spent_cents: number
          starts_on: string
          status: Database["public"]["Enums"]["ad_campaign_status"]
          tag: string
          title: string
        }
        Insert: {
          advertiser_id?: string
          blurb?: string
          budget_cents?: number
          clicks?: number
          company_name?: string
          created_at?: string
          cta?: string
          ends_on?: string
          gradient_from?: string
          gradient_to?: string
          id?: string
          image_shape?: string
          image_url?: string
          impressions?: number
          link_url?: string
          spent_cents?: number
          starts_on?: string
          status?: Database["public"]["Enums"]["ad_campaign_status"]
          tag?: string
          title?: string
        }
        Update: {
          advertiser_id?: string
          blurb?: string
          budget_cents?: number
          clicks?: number
          company_name?: string
          created_at?: string
          cta?: string
          ends_on?: string
          gradient_from?: string
          gradient_to?: string
          id?: string
          image_shape?: string
          image_url?: string
          impressions?: number
          link_url?: string
          spent_cents?: number
          starts_on?: string
          status?: Database["public"]["Enums"]["ad_campaign_status"]
          tag?: string
          title?: string
        }
        Relationships: []
      }
      ad_packages: {
        Row: {
          active: boolean
          created_at: string
          days: number
          id: string
          name: string
          price_cents: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          days: number
          id?: string
          name: string
          price_cents: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          days?: number
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
        }
        Relationships: []
      }
      animal_records: {
        Row: {
          animal_id: string
          app: string
          completed: Json
          crop_id: string
          detail: string
          due_on: string | null
          ends_on: string | null
          farm_id: string | null
          field_id: string
          id: string
          qty: string
          recorded_at: string
          repeat_days: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          animal_id?: string
          app?: string
          completed?: Json
          crop_id?: string
          detail?: string
          due_on?: string | null
          ends_on?: string | null
          farm_id?: string | null
          field_id?: string
          id: string
          qty?: string
          recorded_at?: string
          repeat_days?: number | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          animal_id?: string
          app?: string
          completed?: Json
          crop_id?: string
          detail?: string
          due_on?: string | null
          ends_on?: string | null
          farm_id?: string | null
          field_id?: string
          id?: string
          qty?: string
          recorded_at?: string
          repeat_days?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_actions: {
        Row: {
          assigned_to: string | null
          cooperative_id: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          meeting_id: string | null
          status: Database["public"]["Enums"]["coop_action_status"]
        }
        Insert: {
          assigned_to?: string | null
          cooperative_id: string
          created_at?: string
          created_by?: string
          description: string
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          status?: Database["public"]["Enums"]["coop_action_status"]
        }
        Update: {
          assigned_to?: string | null
          cooperative_id?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          status?: Database["public"]["Enums"]["coop_action_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_actions_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooperative_actions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "cooperative_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_asset_bookings: {
        Row: {
          asset_id: string
          created_at: string
          end_date: string
          id: string
          notes: string
          operating_cost: number | null
          start_date: string
          status: Database["public"]["Enums"]["coop_booking_status"]
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          end_date: string
          id?: string
          notes?: string
          operating_cost?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["coop_booking_status"]
          user_id?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          end_date?: string
          id?: string
          notes?: string
          operating_cost?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["coop_booking_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_asset_bookings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cooperative_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_assets: {
        Row: {
          category: string
          cooperative_id: string
          created_at: string
          description: string
          id: string
          name: string
          responsible_user_id: string | null
          status: Database["public"]["Enums"]["coop_asset_status"]
        }
        Insert: {
          category?: string
          cooperative_id: string
          created_at?: string
          description?: string
          id?: string
          name: string
          responsible_user_id?: string | null
          status?: Database["public"]["Enums"]["coop_asset_status"]
        }
        Update: {
          category?: string
          cooperative_id?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          responsible_user_id?: string | null
          status?: Database["public"]["Enums"]["coop_asset_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_assets_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_committee_members: {
        Row: {
          committee_id: string
          title: string
          user_id: string
        }
        Insert: {
          committee_id: string
          title?: string
          user_id: string
        }
        Update: {
          committee_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "cooperative_committees"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_committees: {
        Row: {
          cooperative_id: string
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          cooperative_id: string
          created_at?: string
          description?: string
          id?: string
          name: string
        }
        Update: {
          cooperative_id?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_committees_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_invites: {
        Row: {
          cooperative_id: string
          created_at: string
          created_by: string
          email: string
          id: string
          role: Database["public"]["Enums"]["coop_role"]
        }
        Insert: {
          cooperative_id: string
          created_at?: string
          created_by?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["coop_role"]
        }
        Update: {
          cooperative_id?: string
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["coop_role"]
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_invites_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_ledger_entries: {
        Row: {
          amount: number
          cooperative_id: string
          created_at: string
          created_by: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["coop_ledger_kind"]
          user_id: string | null
        }
        Insert: {
          amount: number
          cooperative_id: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          kind: Database["public"]["Enums"]["coop_ledger_kind"]
          user_id?: string | null
        }
        Update: {
          amount?: number
          cooperative_id?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["coop_ledger_kind"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_ledger_entries_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_meeting_attendance: {
        Row: {
          attended: boolean
          meeting_id: string
          user_id: string
        }
        Insert: {
          attended?: boolean
          meeting_id: string
          user_id: string
        }
        Update: {
          attended?: boolean
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "cooperative_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_meetings: {
        Row: {
          agenda: string
          cooperative_id: string
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          minutes: string
          status: Database["public"]["Enums"]["coop_meeting_status"]
          title: string
        }
        Insert: {
          agenda?: string
          cooperative_id: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_date: string
          minutes?: string
          status?: Database["public"]["Enums"]["coop_meeting_status"]
          title: string
        }
        Update: {
          agenda?: string
          cooperative_id?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_date?: string
          minutes?: string
          status?: Database["public"]["Enums"]["coop_meeting_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_meetings_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_members: {
        Row: {
          cooperative_id: string
          email: string
          joined_at: string
          role: Database["public"]["Enums"]["coop_role"]
          status: Database["public"]["Enums"]["coop_member_status"]
          user_id: string
        }
        Insert: {
          cooperative_id: string
          email?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["coop_role"]
          status?: Database["public"]["Enums"]["coop_member_status"]
          user_id: string
        }
        Update: {
          cooperative_id?: string
          email?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["coop_role"]
          status?: Database["public"]["Enums"]["coop_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_members_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_opportunities: {
        Row: {
          cooperative_id: string
          created_at: string
          created_by: string
          deadline: string | null
          description: string
          id: string
          notes: string
          opp_type: Database["public"]["Enums"]["coop_opportunity_type"]
          provider: string
          status: Database["public"]["Enums"]["coop_opportunity_status"]
          title: string
        }
        Insert: {
          cooperative_id: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string
          id?: string
          notes?: string
          opp_type?: Database["public"]["Enums"]["coop_opportunity_type"]
          provider?: string
          status?: Database["public"]["Enums"]["coop_opportunity_status"]
          title: string
        }
        Update: {
          cooperative_id?: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string
          id?: string
          notes?: string
          opp_type?: Database["public"]["Enums"]["coop_opportunity_type"]
          provider?: string
          status?: Database["public"]["Enums"]["coop_opportunity_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_opportunities_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_purchase_allocations: {
        Row: {
          cost: number
          delivered: boolean
          order_id: string
          paid: boolean
          qty: number
          user_id: string
        }
        Insert: {
          cost: number
          delivered?: boolean
          order_id: string
          paid?: boolean
          qty: number
          user_id: string
        }
        Update: {
          cost?: number
          delivered?: boolean
          order_id?: string
          paid?: boolean
          qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_purchase_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cooperative_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_purchase_orders: {
        Row: {
          cooperative_id: string
          created_at: string
          created_by: string
          id: string
          item: string
          status: Database["public"]["Enums"]["coop_order_status"]
          supplier_name: string
          unit: string
          unit_price: number
        }
        Insert: {
          cooperative_id: string
          created_at?: string
          created_by?: string
          id?: string
          item: string
          status?: Database["public"]["Enums"]["coop_order_status"]
          supplier_name?: string
          unit?: string
          unit_price?: number
        }
        Update: {
          cooperative_id?: string
          created_at?: string
          created_by?: string
          id?: string
          item?: string
          status?: Database["public"]["Enums"]["coop_order_status"]
          supplier_name?: string
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_purchase_orders_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_purchase_requests: {
        Row: {
          category: string
          cooperative_id: string
          created_at: string
          id: string
          item: string
          needed_by: string | null
          notes: string
          order_id: string | null
          qty: number
          status: Database["public"]["Enums"]["coop_request_status"]
          unit: string
          user_id: string
        }
        Insert: {
          category?: string
          cooperative_id: string
          created_at?: string
          id?: string
          item: string
          needed_by?: string | null
          notes?: string
          order_id?: string | null
          qty: number
          status?: Database["public"]["Enums"]["coop_request_status"]
          unit?: string
          user_id?: string
        }
        Update: {
          category?: string
          cooperative_id?: string
          created_at?: string
          id?: string
          item?: string
          needed_by?: string | null
          notes?: string
          order_id?: string | null
          qty?: number
          status?: Database["public"]["Enums"]["coop_request_status"]
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_purchase_requests_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooperative_purchase_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cooperative_purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_resolutions: {
        Row: {
          cooperative_id: string
          created_at: string
          created_by: string
          decided_at: string | null
          description: string
          id: string
          meeting_id: string | null
          status: Database["public"]["Enums"]["coop_resolution_status"]
          title: string
        }
        Insert: {
          cooperative_id: string
          created_at?: string
          created_by?: string
          decided_at?: string | null
          description?: string
          id?: string
          meeting_id?: string | null
          status?: Database["public"]["Enums"]["coop_resolution_status"]
          title: string
        }
        Update: {
          cooperative_id?: string
          created_at?: string
          created_by?: string
          decided_at?: string | null
          description?: string
          id?: string
          meeting_id?: string | null
          status?: Database["public"]["Enums"]["coop_resolution_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_resolutions_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooperative_resolutions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "cooperative_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_sale_allocations: {
        Row: {
          delivered: boolean
          order_id: string
          paid: boolean
          proceeds: number
          qty: number
          user_id: string
        }
        Insert: {
          delivered?: boolean
          order_id: string
          paid?: boolean
          proceeds: number
          qty: number
          user_id: string
        }
        Update: {
          delivered?: boolean
          order_id?: string
          paid?: boolean
          proceeds?: number
          qty?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_sale_allocations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cooperative_sale_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_sale_listings: {
        Row: {
          available_from: string | null
          commodity: string
          cooperative_id: string
          created_at: string
          grade: string
          id: string
          notes: string
          order_id: string | null
          qty: number
          status: Database["public"]["Enums"]["coop_listing_status"]
          unit: string
          user_id: string
        }
        Insert: {
          available_from?: string | null
          commodity: string
          cooperative_id: string
          created_at?: string
          grade?: string
          id?: string
          notes?: string
          order_id?: string | null
          qty: number
          status?: Database["public"]["Enums"]["coop_listing_status"]
          unit?: string
          user_id?: string
        }
        Update: {
          available_from?: string | null
          commodity?: string
          cooperative_id?: string
          created_at?: string
          grade?: string
          id?: string
          notes?: string
          order_id?: string | null
          qty?: number
          status?: Database["public"]["Enums"]["coop_listing_status"]
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_sale_listings_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cooperative_sale_listings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "cooperative_sale_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_sale_orders: {
        Row: {
          buyer_name: string
          commodity: string
          cooperative_id: string
          created_at: string
          created_by: string
          id: string
          status: Database["public"]["Enums"]["coop_order_status"]
          unit: string
          unit_price: number
        }
        Insert: {
          buyer_name?: string
          commodity: string
          cooperative_id: string
          created_at?: string
          created_by?: string
          id?: string
          status?: Database["public"]["Enums"]["coop_order_status"]
          unit?: string
          unit_price?: number
        }
        Update: {
          buyer_name?: string
          commodity?: string
          cooperative_id?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: Database["public"]["Enums"]["coop_order_status"]
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_sale_orders_cooperative_id_fkey"
            columns: ["cooperative_id"]
            isOneToOne: false
            referencedRelation: "cooperatives"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperative_votes: {
        Row: {
          choice: Database["public"]["Enums"]["coop_vote_choice"]
          resolution_id: string
          user_id: string
          voted_at: string
        }
        Insert: {
          choice: Database["public"]["Enums"]["coop_vote_choice"]
          resolution_id: string
          user_id?: string
          voted_at?: string
        }
        Update: {
          choice?: Database["public"]["Enums"]["coop_vote_choice"]
          resolution_id?: string
          user_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cooperative_votes_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "cooperative_resolutions"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperatives: {
        Row: {
          bio: string
          commodities: string
          contact_email: string
          contact_phone: string
          coop_type: string
          created_at: string
          id: string
          location: string
          name: string
          owner_id: string
          province: string
          registration_number: string
          sector: string
        }
        Insert: {
          bio?: string
          commodities?: string
          contact_email?: string
          contact_phone?: string
          coop_type?: string
          created_at?: string
          id?: string
          location?: string
          name: string
          owner_id?: string
          province?: string
          registration_number?: string
          sector?: string
        }
        Update: {
          bio?: string
          commodities?: string
          contact_email?: string
          contact_phone?: string
          coop_type?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          owner_id?: string
          province?: string
          registration_number?: string
          sector?: string
        }
        Relationships: []
      }
      farm_invites: {
        Row: {
          created_at: string
          created_by: string
          email: string
          farm_id: string
          id: string
          role: Database["public"]["Enums"]["farm_role"]
        }
        Insert: {
          created_at?: string
          created_by?: string
          email: string
          farm_id: string
          id?: string
          role?: Database["public"]["Enums"]["farm_role"]
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          farm_id?: string
          id?: string
          role?: Database["public"]["Enums"]["farm_role"]
        }
        Relationships: [
          {
            foreignKeyName: "farm_invites_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_members: {
        Row: {
          created_at: string
          email: string
          farm_id: string
          role: Database["public"]["Enums"]["farm_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          farm_id: string
          role?: Database["public"]["Enums"]["farm_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          farm_id?: string
          role?: Database["public"]["Enums"]["farm_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_profiles: {
        Row: {
          bio: string
          created_at: string
          crops: string
          farm_name: string
          hectares: number | null
          id: string
          name: string
          province: string
          role: string
        }
        Insert: {
          bio?: string
          created_at?: string
          crops?: string
          farm_name?: string
          hectares?: number | null
          id?: string
          name: string
          province?: string
          role?: string
        }
        Update: {
          bio?: string
          created_at?: string
          crops?: string
          farm_name?: string
          hectares?: number | null
          id?: string
          name?: string
          province?: string
          role?: string
        }
        Relationships: []
      }
      farms: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      shared_listings: {
        Row: {
          created_at: string
          data: Json
          id: string
          kind: string
          owner_id: string | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          kind: string
          owner_id?: string | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          owner_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_listings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "farmer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_data: {
        Row: {
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          user_id?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_ads: {
        Row: {
          blurb: string | null
          company_name: string | null
          cta: string | null
          gradient_from: string | null
          gradient_to: string | null
          id: string | null
          image_shape: string | null
          image_url: string | null
          link_url: string | null
          tag: string | null
          title: string | null
        }
        Insert: {
          blurb?: string | null
          company_name?: string | null
          cta?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          id?: string | null
          image_shape?: string | null
          image_url?: string | null
          link_url?: string | null
          tag?: string | null
          title?: string | null
        }
        Update: {
          blurb?: string | null
          company_name?: string | null
          cta?: string | null
          gradient_from?: string | null
          gradient_to?: string | null
          id?: string | null
          image_shape?: string | null
          image_url?: string | null
          link_url?: string | null
          tag?: string | null
          title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_cooperative_invite: { Args: { _invite: string }; Returns: string }
      accept_farm_invite: { Args: { _invite: string }; Returns: string }
      coop_can_finance: { Args: { _coop: string }; Returns: boolean }
      coop_can_govern: { Args: { _coop: string }; Returns: boolean }
      coop_can_manage_resources: { Args: { _coop: string }; Returns: boolean }
      coop_can_trade: { Args: { _coop: string }; Returns: boolean }
      coop_intelligence_demand: {
        Args: { _coop: string }
        Returns: {
          coop_qty: number
          item: string
          other_coops: number
          other_qty: number
          unit: string
        }[]
      }
      coop_intelligence_supply: {
        Args: { _coop: string }
        Returns: {
          commodity: string
          coop_qty: number
          other_coops: number
          other_qty: number
          unit: string
        }[]
      }
      coop_is_admin: { Args: { _coop: string }; Returns: boolean }
      coop_role_of: {
        Args: { _coop: string }
        Returns: Database["public"]["Enums"]["coop_role"]
      }
      create_cooperative: {
        Args: {
          _bio?: string
          _commodities?: string
          _contact_email?: string
          _contact_phone?: string
          _coop_type?: string
          _location?: string
          _name: string
          _province?: string
          _registration_number?: string
          _sector?: string
        }
        Returns: string
      }
      create_farm: { Args: { _name: string }; Returns: string }
      create_purchase_order: {
        Args: {
          _coop: string
          _request_ids: string[]
          _supplier_name: string
          _unit_price: number
        }
        Returns: string
      }
      create_sale_order: {
        Args: {
          _buyer_name: string
          _coop: string
          _listing_ids: string[]
          _unit_price: number
        }
        Returns: string
      }
      farm_role_of: {
        Args: { _farm: string }
        Returns: Database["public"]["Enums"]["farm_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      launch_ad_campaign: { Args: { _campaign: string }; Returns: undefined }
      record_ad_event: {
        Args: { _campaign: string; _kind: string }
        Returns: undefined
      }
      request_join_cooperative: { Args: { _coop: string }; Returns: undefined }
      review_join_request: {
        Args: { _approve: boolean; _coop: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ad_campaign_status:
        | "draft"
        | "pending_payment"
        | "active"
        | "paused"
        | "completed"
      app_role: "admin" | "user"
      coop_action_status: "open" | "done"
      coop_asset_status: "available" | "maintenance" | "retired"
      coop_booking_status: "requested" | "approved" | "rejected" | "completed"
      coop_ledger_kind:
        | "contribution"
        | "subscription"
        | "share_capital"
        | "loan"
        | "expense"
        | "other"
      coop_listing_status: "available" | "sold" | "cancelled"
      coop_meeting_status: "scheduled" | "held" | "cancelled"
      coop_member_status: "pending" | "active" | "left" | "removed"
      coop_opportunity_status:
        | "open"
        | "applied"
        | "awarded"
        | "rejected"
        | "closed"
      coop_opportunity_type:
        | "funding"
        | "grant"
        | "training"
        | "mentorship"
        | "other"
      coop_order_status: "draft" | "confirmed" | "delivered" | "cancelled"
      coop_request_status: "open" | "ordered" | "cancelled"
      coop_resolution_status: "proposed" | "passed" | "rejected"
      coop_role:
        | "administrator"
        | "chairperson"
        | "board_member"
        | "treasurer"
        | "secretary"
        | "operations_manager"
        | "member"
        | "auditor"
      coop_vote_choice: "for" | "against" | "abstain"
      farm_role: "owner" | "manager" | "worker" | "viewer"
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
    Enums: {
      ad_campaign_status: [
        "draft",
        "pending_payment",
        "active",
        "paused",
        "completed",
      ],
      app_role: ["admin", "user"],
      coop_action_status: ["open", "done"],
      coop_asset_status: ["available", "maintenance", "retired"],
      coop_booking_status: ["requested", "approved", "rejected", "completed"],
      coop_ledger_kind: [
        "contribution",
        "subscription",
        "share_capital",
        "loan",
        "expense",
        "other",
      ],
      coop_listing_status: ["available", "sold", "cancelled"],
      coop_meeting_status: ["scheduled", "held", "cancelled"],
      coop_member_status: ["pending", "active", "left", "removed"],
      coop_opportunity_status: [
        "open",
        "applied",
        "awarded",
        "rejected",
        "closed",
      ],
      coop_opportunity_type: [
        "funding",
        "grant",
        "training",
        "mentorship",
        "other",
      ],
      coop_order_status: ["draft", "confirmed", "delivered", "cancelled"],
      coop_request_status: ["open", "ordered", "cancelled"],
      coop_resolution_status: ["proposed", "passed", "rejected"],
      coop_role: [
        "administrator",
        "chairperson",
        "board_member",
        "treasurer",
        "secretary",
        "operations_manager",
        "member",
        "auditor",
      ],
      coop_vote_choice: ["for", "against", "abstain"],
      farm_role: ["owner", "manager", "worker", "viewer"],
    },
  },
} as const
