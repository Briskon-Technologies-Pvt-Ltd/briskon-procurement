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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      approval_steps: {
        Row: {
          condition_json: Json | null
          created_at: string
          escalate_to: string | null
          id: string
          profile_id: string | null
          role_id: string | null
          sla_hours: number | null
          step_no: number
          template_id: string
        }
        Insert: {
          condition_json?: Json | null
          created_at?: string
          escalate_to?: string | null
          id?: string
          profile_id?: string | null
          role_id?: string | null
          sla_hours?: number | null
          step_no: number
          template_id: string
        }
        Update: {
          condition_json?: Json | null
          created_at?: string
          escalate_to?: string | null
          id?: string
          profile_id?: string | null
          role_id?: string | null
          sla_hours?: number | null
          step_no?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "approval_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          acted_at: string | null
          comments: Json | null
          created_at: string
          created_by: string | null
          current_step_no: number | null
          entity_id: string
          entity_type: string
          id: string
          status: string
          template_id: string | null
        }
        Insert: {
          acted_at?: string | null
          comments?: Json | null
          created_at?: string
          created_by?: string | null
          current_step_no?: number | null
          entity_id: string
          entity_type: string
          id?: string
          status?: string
          template_id?: string | null
        }
        Update: {
          acted_at?: string | null
          comments?: Json | null
          created_at?: string
          created_by?: string | null
          current_step_no?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "approval_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_items: {
        Row: {
          auction_id: string
          created_at: string
          description: string | null
          id: string
          qty: number | null
          rfq_item_id: string | null
          uom: string | null
        }
        Insert: {
          auction_id: string
          created_at?: string
          description?: string | null
          id?: string
          qty?: number | null
          rfq_item_id?: string | null
          uom?: string | null
        }
        Update: {
          auction_id?: string
          created_at?: string
          description?: string | null
          id?: string
          qty?: number | null
          rfq_item_id?: string | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_items_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_items_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_visibility: {
        Row: {
          auction_id: string
          category_id: string | null
          created_at: string
          id: string
          supplier_group_id: string | null
          supplier_id: string | null
          visibility_type: string
        }
        Insert: {
          auction_id: string
          category_id?: string | null
          created_at?: string
          id?: string
          supplier_group_id?: string | null
          supplier_id?: string | null
          visibility_type?: string
        }
        Update: {
          auction_id?: string
          category_id?: string | null
          created_at?: string
          id?: string
          supplier_group_id?: string | null
          supplier_id?: string | null
          visibility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_visibility_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_visibility_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_visibility_supplier_group_id_fkey"
            columns: ["supplier_group_id"]
            isOneToOne: false
            referencedRelation: "supplier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_visibility_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          auction_type: string
          config: Json | null
          created_at: string
          created_by: string | null
          currency: string
          end_at: string | null
          id: string
          language: string | null
          organization_id: string
          rfq_id: string | null
          start_at: string | null
          status: string
          visibility_mode: string
        }
        Insert: {
          auction_type?: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          currency: string
          end_at?: string | null
          id?: string
          language?: string | null
          organization_id: string
          rfq_id?: string | null
          start_at?: string | null
          status?: string
          visibility_mode?: string
        }
        Update: {
          auction_type?: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          currency?: string
          end_at?: string | null
          id?: string
          language?: string | null
          organization_id?: string
          rfq_id?: string | null
          start_at?: string | null
          status?: string
          visibility_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "auctions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string | null
          actor_profile_id: string | null
          created_at: string
          id: string
          payload: Json | null
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          action?: string | null
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          action?: string | null
          actor_profile_id?: string | null
          created_at?: string
          id?: string
          payload?: Json | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      awards: {
        Row: {
          auction_id: string | null
          award_summary: string | null
          awarded_at: string | null
          awarded_by: string | null
          id: string
          rfq_id: string | null
          status: string | null
          supplier_id: string | null
          winning_bid_id: string | null
        }
        Insert: {
          auction_id?: string | null
          award_summary?: string | null
          awarded_at?: string | null
          awarded_by?: string | null
          id?: string
          rfq_id?: string | null
          status?: string | null
          supplier_id?: string | null
          winning_bid_id?: string | null
        }
        Update: {
          auction_id?: string | null
          award_summary?: string | null
          awarded_at?: string | null
          awarded_by?: string | null
          id?: string
          rfq_id?: string | null
          status?: string | null
          supplier_id?: string | null
          winning_bid_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "awards_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_winning_bid_id_fkey"
            columns: ["winning_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_history: {
        Row: {
          action: string
          actor_profile_id: string | null
          amount: number | null
          bid_id: string | null
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          amount?: number | null
          bid_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          amount?: number | null
          bid_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_history_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bid_history_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          auction_item_id: string | null
          created_at: string
          currency: string
          exchange_rate_snapshot_id: string | null
          id: string
          metadata: Json | null
          placed_by_profile_id: string | null
          supplier_id: string
        }
        Insert: {
          amount: number
          auction_id: string
          auction_item_id?: string | null
          created_at?: string
          currency: string
          exchange_rate_snapshot_id?: string | null
          id?: string
          metadata?: Json | null
          placed_by_profile_id?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          auction_id?: string
          auction_item_id?: string | null
          created_at?: string
          currency?: string
          exchange_rate_snapshot_id?: string | null
          id?: string
          metadata?: Json | null
          placed_by_profile_id?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_auction_item_id_fkey"
            columns: ["auction_item_id"]
            isOneToOne: false
            referencedRelation: "auction_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_exchange_rate_snapshot_id_fkey"
            columns: ["exchange_rate_snapshot_id"]
            isOneToOne: false
            referencedRelation: "exchange_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_placed_by_profile_id_fkey"
            columns: ["placed_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          award_id: string | null
          effective_from: string | null
          expires_at: string | null
          file_id: string | null
          id: string
          metadata: Json | null
          po_id: string | null
          signed_at: string | null
        }
        Insert: {
          award_id?: string | null
          effective_from?: string | null
          expires_at?: string | null
          file_id?: string | null
          id?: string
          metadata?: Json | null
          po_id?: string | null
          signed_at?: string | null
        }
        Update: {
          award_id?: string | null
          effective_from?: string | null
          expires_at?: string | null
          file_id?: string | null
          id?: string
          metadata?: Json | null
          po_id?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          fetched_at: string
          id: string
          quote_currency: string
          rate: number
          source: string | null
        }
        Insert: {
          base_currency: string
          fetched_at?: string
          id?: string
          quote_currency: string
          rate: number
          source?: string | null
        }
        Update: {
          base_currency?: string
          fetched_at?: string
          id?: string
          quote_currency?: string
          rate?: number
          source?: string | null
        }
        Relationships: []
      }
      file_versions: {
        Row: {
          file_id: string
          id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          version_no: number
        }
        Insert: {
          file_id: string
          id?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Update: {
          file_id?: string
          id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          checksum: string | null
          content_type: string | null
          filename: string
          id: string
          language: string | null
          owner_id: string | null
          owner_type: string | null
          sensitivity_tag: string | null
          size: number | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          checksum?: string | null
          content_type?: string | null
          filename: string
          id?: string
          language?: string | null
          owner_id?: string | null
          owner_type?: string | null
          sensitivity_tag?: string | null
          size?: number | null
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          checksum?: string | null
          content_type?: string | null
          filename?: string
          id?: string
          language?: string | null
          owner_id?: string | null
          owner_type?: string | null
          sensitivity_tag?: string | null
          size?: number | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          auction_id: string | null
          id: string
          invitee_email: string | null
          rfq_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          supplier_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          auction_id?: string | null
          id?: string
          invitee_email?: string | null
          rfq_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          supplier_id?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          auction_id?: string | null
          id?: string
          invitee_email?: string | null
          rfq_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          supplier_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          entity_id: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          recipient_profile_id: string | null
          related_entity: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          recipient_profile_id?: string | null
          related_entity?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          recipient_profile_id?: string | null
          related_entity?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_info: Json | null
          created_at: string
          default_currency: string | null
          default_language: string | null
          id: string
          name: string
          settings: Json | null
          timezone: string | null
        }
        Insert: {
          billing_info?: Json | null
          created_at?: string
          default_currency?: string | null
          default_language?: string | null
          id?: string
          name: string
          settings?: Json | null
          timezone?: string | null
        }
        Update: {
          billing_info?: Json | null
          created_at?: string
          default_currency?: string | null
          default_language?: string | null
          id?: string
          name?: string
          settings?: Json | null
          timezone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          fname: string | null
          id: string
          lname: string | null
          locale: string | null
          metadata: Json | null
          organization_id: string | null
          phone: string | null
          primary_role_id: string | null
          timezone: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          fname?: string | null
          id?: string
          lname?: string | null
          locale?: string | null
          metadata?: Json | null
          organization_id?: string | null
          phone?: string | null
          primary_role_id?: string | null
          timezone?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          fname?: string | null
          id?: string
          lname?: string | null
          locale?: string | null
          metadata?: Json | null
          organization_id?: string | null
          phone?: string | null
          primary_role_id?: string | null
          timezone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_primary_role_id_fkey"
            columns: ["primary_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_documents: {
        Row: {
          document_requirement_id: string | null
          file_id: string | null
          id: string
          proposal_submission_id: string
          uploaded_at: string
        }
        Insert: {
          document_requirement_id?: string | null
          file_id?: string | null
          id?: string
          proposal_submission_id: string
          uploaded_at?: string
        }
        Update: {
          document_requirement_id?: string | null
          file_id?: string | null
          id?: string
          proposal_submission_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_documents_proposal_submission_id_fkey"
            columns: ["proposal_submission_id"]
            isOneToOne: false
            referencedRelation: "proposal_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_submissions: {
        Row: {
          auction_id: string | null
          id: string
          language: string | null
          rfq_id: string | null
          status: string
          submission_text: string | null
          submitted_at: string
          submitted_by_profile_id: string | null
          supplier_id: string
        }
        Insert: {
          auction_id?: string | null
          id?: string
          language?: string | null
          rfq_id?: string | null
          status?: string
          submission_text?: string | null
          submitted_at?: string
          submitted_by_profile_id?: string | null
          supplier_id: string
        }
        Update: {
          auction_id?: string | null
          id?: string
          language?: string | null
          rfq_id?: string | null
          status?: string
          submission_text?: string | null
          submitted_at?: string
          submitted_by_profile_id?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_submissions_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_submissions_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_submissions_submitted_by_profile_id_fkey"
            columns: ["submitted_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_submissions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          award_id: string | null
          created_at: string
          currency: string
          due_date: string | null
          id: string
          organization_id: string | null
          po_number: string
          status: string | null
          supplier_id: string | null
          total_amount: number | null
        }
        Insert: {
          award_id?: string | null
          created_at?: string
          currency: string
          due_date?: string | null
          id?: string
          organization_id?: string | null
          po_number: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Update: {
          award_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          organization_id?: string | null
          po_number?: string
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      requisitions: {
        Row: {
          cost_center: string | null
          created_at: string
          currency: string | null
          description: string | null
          estimated_value: number | null
          id: string
          organization_id: string
          requested_by: string | null
          status: string
        }
        Insert: {
          cost_center?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          organization_id: string
          requested_by?: string | null
          status?: string
        }
        Update: {
          cost_center?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          organization_id?: string
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisitions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          created_at: string
          description: string | null
          estimated_value: number | null
          id: string
          qty: number | null
          rfq_id: string
          spec: Json | null
          uom: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          qty?: number | null
          rfq_id: string
          spec?: Json | null
          uom?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          id?: string
          qty?: number | null
          rfq_id?: string
          spec?: Json | null
          uom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          language: string | null
          organization_id: string
          requisition_id: string | null
          status: string
          summary: string | null
          title: string
          visibility: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          language?: string | null
          organization_id: string
          requisition_id?: string | null
          status?: string
          summary?: string | null
          title: string
          visibility?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          language?: string | null
          organization_id?: string
          requisition_id?: string | null
          status?: string
          summary?: string | null
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_accounts: {
        Row: {
          api_key: string
          created_at: string
          created_by: string | null
          disabled: boolean | null
          id: string
          name: string
          organization_id: string | null
          scopes: string[] | null
        }
        Insert: {
          api_key: string
          created_at?: string
          created_by?: string | null
          disabled?: boolean | null
          id?: string
          name: string
          organization_id?: string | null
          scopes?: string[] | null
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string | null
          disabled?: boolean | null
          id?: string
          name?: string
          organization_id?: string | null
          scopes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "service_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_category_map: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          supplier_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          supplier_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_category_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_category_map_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          phone: string | null
          profile_id: string | null
          supplier_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          profile_id?: string | null
          supplier_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          profile_id?: string | null
          supplier_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_contacts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_contacts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_documents: {
        Row: {
          created_at: string
          doc_type: string | null
          file_id: string | null
          file_url: string | null
          id: string
          issued_by: string | null
          storage_path: string | null
          supplier_id: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          doc_type?: string | null
          file_id?: string | null
          file_url?: string | null
          id?: string
          issued_by?: string | null
          storage_path?: string | null
          supplier_id: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string | null
          file_id?: string | null
          file_url?: string | null
          id?: string
          issued_by?: string | null
          storage_path?: string | null
          supplier_id?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          company_name: string
          country: string | null
          created_at: string
          id: string
          metadata: Json | null
          org_onboarded_to: string | null
          registration_no: string | null
          status: string
        }
        Insert: {
          company_name: string
          country?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          org_onboarded_to?: string | null
          registration_no?: string | null
          status?: string
        }
        Update: {
          company_name?: string
          country?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          org_onboarded_to?: string | null
          registration_no?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_org_onboarded_to_fkey"
            columns: ["org_onboarded_to"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_auction: { Args: { a_id: string }; Returns: boolean }
      current_org_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      current_role: { Args: never; Returns: string }
      current_supplier_id: { Args: never; Returns: string }
      fn_create_notification: {
        Args: {
          p_entity_id: string
          p_message: string
          p_recipient_profile_id: string
          p_related_entity: string
          p_type?: string
        }
        Returns: undefined
      }
      get_profile_email: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_buyer: { Args: never; Returns: boolean }
      is_supplier: { Args: never; Returns: boolean }
      log_audit_event: {
        Args: {
          action: string
          payload?: Json
          resource_id: string
          resource_type: string
        }
        Returns: undefined
      }
      requisition_status_counts: {
        Args: never
        Returns: {
          approved: number
          draft: number
          pending: number
        }[]
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
