export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  booking: {
    Tables: {
      api_client: {
        Row: {
          active: boolean;
          business_id: string | null;
          created_at: string;
          id: string;
          key_hash: string;
          name: string;
          scopes: string[];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          key_hash: string;
          name: string;
          scopes?: string[];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          key_hash?: string;
          name?: string;
          scopes?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_client_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
        ];
      };
      booking: {
        Row: {
          business_id: string;
          cancel_reason: string | null;
          created_at: string;
          created_by_ref: string | null;
          currency: string;
          customer_id: string;
          customer_notes: string | null;
          ends_at: string;
          event_id: string | null;
          hold_expires_at: string | null;
          id: string;
          idempotency_key: string | null;
          internal_notes: string | null;
          manage_token_hash: string | null;
          metadata: NonNullable<Json>;
          party_size: number;
          payment_status: Database["booking"]["Enums"]["payment_status"] | null;
          reference: string;
          respond_by: string | null;
          source: Database["booking"]["Enums"]["booking_source"];
          starts_at: string;
          status: Database["booking"]["Enums"]["booking_status"];
          total_minor: number;
          updated_at: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          cancel_reason?: string | null;
          created_at?: string;
          created_by_ref?: string | null;
          currency: string;
          customer_id: string;
          customer_notes?: string | null;
          ends_at: string;
          event_id?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          internal_notes?: string | null;
          manage_token_hash?: string | null;
          metadata?: NonNullable<Json>;
          party_size?: number;
          payment_status?: Database["booking"]["Enums"]["payment_status"] | null;
          reference: string;
          respond_by?: string | null;
          source: Database["booking"]["Enums"]["booking_source"];
          starts_at: string;
          status: Database["booking"]["Enums"]["booking_status"];
          total_minor?: number;
          updated_at?: string;
          venue_id: string;
        };
        Update: {
          business_id?: string;
          cancel_reason?: string | null;
          created_at?: string;
          created_by_ref?: string | null;
          currency?: string;
          customer_id?: string;
          customer_notes?: string | null;
          ends_at?: string;
          event_id?: string | null;
          hold_expires_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          internal_notes?: string | null;
          manage_token_hash?: string | null;
          metadata?: NonNullable<Json>;
          party_size?: number;
          payment_status?: Database["booking"]["Enums"]["payment_status"] | null;
          reference?: string;
          respond_by?: string | null;
          source?: Database["booking"]["Enums"]["booking_source"];
          starts_at?: string;
          status?: Database["booking"]["Enums"]["booking_status"];
          total_minor?: number;
          updated_at?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_customer_fk";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customer";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_event_id_fk";
            columns: ["business_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "event";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_venue_fk";
            columns: ["business_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "venue";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      booking_allocation: {
        Row: {
          active: boolean;
          booking_id: string;
          booking_item_id: string;
          business_id: string;
          created_at: string;
          ends_at: string;
          id: string;
          resource_id: string;
          starts_at: string;
          unit: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          booking_id: string;
          booking_item_id: string;
          business_id: string;
          created_at?: string;
          ends_at: string;
          id?: string;
          resource_id: string;
          starts_at: string;
          unit?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          booking_id?: string;
          booking_item_id?: string;
          business_id?: string;
          created_at?: string;
          ends_at?: string;
          id?: string;
          resource_id?: string;
          starts_at?: string;
          unit?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_allocation_booking_fk";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "booking";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_allocation_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_allocation_item_fk";
            columns: ["business_id", "booking_id", "booking_item_id"];
            isOneToOne: false;
            referencedRelation: "booking_item";
            referencedColumns: ["business_id", "booking_id", "id"];
          },
          {
            foreignKeyName: "booking_allocation_resource_fk";
            columns: ["business_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resource";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      booking_answer: {
        Row: {
          booking_id: string;
          business_id: string;
          created_at: string;
          question_id: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          business_id: string;
          created_at?: string;
          question_id: string;
          updated_at?: string;
          value: NonNullable<Json>;
        };
        Update: {
          booking_id?: string;
          business_id?: string;
          created_at?: string;
          question_id?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "booking_answer_booking_fk";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "booking";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_answer_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_answer_question_fk";
            columns: ["business_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "question";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      booking_event: {
        Row: {
          actor_ref: string | null;
          actor_type: Database["booking"]["Enums"]["actor_type"];
          at: string;
          booking_id: string;
          business_id: string;
          created_at: string;
          data: NonNullable<Json>;
          from_status: Database["booking"]["Enums"]["booking_status"] | null;
          id: string;
          to_status: Database["booking"]["Enums"]["booking_status"] | null;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          actor_ref?: string | null;
          actor_type: Database["booking"]["Enums"]["actor_type"];
          at?: string;
          booking_id: string;
          business_id: string;
          created_at?: string;
          data?: NonNullable<Json>;
          from_status?: Database["booking"]["Enums"]["booking_status"] | null;
          id?: string;
          to_status?: Database["booking"]["Enums"]["booking_status"] | null;
          type: string;
          updated_at?: string;
        };
        Update: {
          actor_ref?: string | null;
          actor_type?: Database["booking"]["Enums"]["actor_type"];
          at?: string;
          booking_id?: string;
          business_id?: string;
          created_at?: string;
          data?: NonNullable<Json>;
          from_status?: Database["booking"]["Enums"]["booking_status"] | null;
          id?: string;
          to_status?: Database["booking"]["Enums"]["booking_status"] | null;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_event_booking_fk";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "booking";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_event_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_item: {
        Row: {
          booking_id: string;
          business_id: string;
          created_at: string;
          currency: string;
          ends_at: string;
          id: string;
          offering_id: string;
          party_size: number;
          price_minor: number | null;
          sort: number;
          starts_at: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          booking_id: string;
          business_id: string;
          created_at?: string;
          currency: string;
          ends_at: string;
          id?: string;
          offering_id: string;
          party_size?: number;
          price_minor?: number | null;
          sort?: number;
          starts_at: string;
          updated_at?: string;
        };
        Update: {
          booking_id?: string;
          business_id?: string;
          created_at?: string;
          currency?: string;
          ends_at?: string;
          id?: string;
          offering_id?: string;
          party_size?: number;
          price_minor?: number | null;
          sort?: number;
          starts_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_item_booking_fk";
            columns: ["business_id", "booking_id"];
            isOneToOne: false;
            referencedRelation: "booking";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "booking_item_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_item_offering_fk";
            columns: ["business_id", "offering_id"];
            isOneToOne: false;
            referencedRelation: "offering";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      booking_policy: {
        Row: {
          approval_mode: Database["booking"]["Enums"]["approval_mode"];
          business_id: string;
          cancel_cutoff_hours: number | null;
          created_at: string;
          hold_minutes: number;
          id: string;
          max_advance_days: number | null;
          min_lead_minutes: number;
          name: string;
          pending_counts_capacity: boolean;
          reminder_offsets_min: number[];
          reschedule_cutoff_hours: number | null;
          respond_within_hours: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          approval_mode?: Database["booking"]["Enums"]["approval_mode"];
          business_id: string;
          cancel_cutoff_hours?: number | null;
          created_at?: string;
          hold_minutes?: number;
          id?: string;
          max_advance_days?: number | null;
          min_lead_minutes?: number;
          name: string;
          pending_counts_capacity?: boolean;
          reminder_offsets_min?: number[];
          reschedule_cutoff_hours?: number | null;
          respond_within_hours?: number | null;
          updated_at?: string;
        };
        Update: {
          approval_mode?: Database["booking"]["Enums"]["approval_mode"];
          business_id?: string;
          cancel_cutoff_hours?: number | null;
          created_at?: string;
          hold_minutes?: number;
          id?: string;
          max_advance_days?: number | null;
          min_lead_minutes?: number;
          name?: string;
          pending_counts_capacity?: boolean;
          reminder_offsets_min?: number[];
          reschedule_cutoff_hours?: number | null;
          respond_within_hours?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_policy_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
        ];
      };
      business: {
        Row: {
          created_at: string;
          currency: string;
          default_policy_id: string | null;
          external_ref: string | null;
          id: string;
          locale: string;
          name: string;
          slot_interval_min: number;
          slug: string;
          status: Database["booking"]["Enums"]["business_status"];
          timezone: string;
          updated_at: string;
          vertical: Database["booking"]["Enums"]["vertical"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          currency: string;
          default_policy_id?: string | null;
          external_ref?: string | null;
          id?: string;
          locale: string;
          name: string;
          slot_interval_min?: number;
          slug: string;
          status?: Database["booking"]["Enums"]["business_status"];
          timezone: string;
          updated_at?: string;
          vertical?: Database["booking"]["Enums"]["vertical"];
        };
        Update: {
          created_at?: string;
          currency?: string;
          default_policy_id?: string | null;
          external_ref?: string | null;
          id?: string;
          locale?: string;
          name?: string;
          slot_interval_min?: number;
          slug?: string;
          status?: Database["booking"]["Enums"]["business_status"];
          timezone?: string;
          updated_at?: string;
          vertical?: Database["booking"]["Enums"]["vertical"];
        };
        Relationships: [
          {
            foreignKeyName: "business_default_policy_fk";
            columns: ["id", "default_policy_id"];
            isOneToOne: false;
            referencedRelation: "booking_policy";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      capacity_rule: {
        Row: {
          business_id: string;
          created_at: string;
          event_id: string | null;
          id: string;
          max_count: number;
          offering_id: string | null;
          per_customer: boolean;
          period: Database["booking"]["Enums"]["capacity_period"];
          resource_id: string | null;
          unit: Database["booking"]["Enums"]["capacity_unit"];
          updated_at: string;
          venue_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          max_count: number;
          offering_id?: string | null;
          per_customer?: boolean;
          period: Database["booking"]["Enums"]["capacity_period"];
          resource_id?: string | null;
          unit?: Database["booking"]["Enums"]["capacity_unit"];
          updated_at?: string;
          venue_id?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          max_count?: number;
          offering_id?: string | null;
          per_customer?: boolean;
          period?: Database["booking"]["Enums"]["capacity_period"];
          resource_id?: string | null;
          unit?: Database["booking"]["Enums"]["capacity_unit"];
          updated_at?: string;
          venue_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "capacity_rule_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "capacity_rule_event_fk";
            columns: ["business_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "event";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "capacity_rule_offering_fk";
            columns: ["business_id", "offering_id"];
            isOneToOne: false;
            referencedRelation: "offering";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "capacity_rule_resource_fk";
            columns: ["business_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resource";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "capacity_rule_venue_fk";
            columns: ["business_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "venue";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      customer: {
        Row: {
          business_id: string;
          created_at: string;
          email: string | null;
          external_ref: string | null;
          id: string;
          locale: string | null;
          marketing_opt_in_at: string | null;
          name: string;
          notes: string | null;
          phone_e164: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          email?: string | null;
          external_ref?: string | null;
          id?: string;
          locale?: string | null;
          marketing_opt_in_at?: string | null;
          name: string;
          notes?: string | null;
          phone_e164?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          email?: string | null;
          external_ref?: string | null;
          id?: string;
          locale?: string | null;
          marketing_opt_in_at?: string | null;
          name?: string;
          notes?: string | null;
          phone_e164?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
        ];
      };
      event: {
        Row: {
          business_id: string;
          closes_at: string | null;
          created_at: string;
          description: string | null;
          ends_on: string;
          external_ref: string | null;
          id: string;
          policy_id: string | null;
          publish_at: string | null;
          slot_interval_min: number | null;
          slot_mode: Database["booking"]["Enums"]["slot_mode"];
          slug: string;
          starts_on: string;
          status: Database["booking"]["Enums"]["event_status"];
          title: string;
          updated_at: string;
          venue_id: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          closes_at?: string | null;
          created_at?: string;
          description?: string | null;
          ends_on: string;
          external_ref?: string | null;
          id?: string;
          policy_id?: string | null;
          publish_at?: string | null;
          slot_interval_min?: number | null;
          slot_mode?: Database["booking"]["Enums"]["slot_mode"];
          slug: string;
          starts_on: string;
          status?: Database["booking"]["Enums"]["event_status"];
          title: string;
          updated_at?: string;
          venue_id: string;
        };
        Update: {
          business_id?: string;
          closes_at?: string | null;
          created_at?: string;
          description?: string | null;
          ends_on?: string;
          external_ref?: string | null;
          id?: string;
          policy_id?: string | null;
          publish_at?: string | null;
          slot_interval_min?: number | null;
          slot_mode?: Database["booking"]["Enums"]["slot_mode"];
          slug?: string;
          starts_on?: string;
          status?: Database["booking"]["Enums"]["event_status"];
          title?: string;
          updated_at?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_policy_fk";
            columns: ["business_id", "policy_id"];
            isOneToOne: false;
            referencedRelation: "booking_policy";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "event_venue_fk";
            columns: ["business_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "venue";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      event_offering: {
        Row: {
          active: boolean;
          business_id: string;
          created_at: string;
          duration_min: number | null;
          event_id: string;
          offering_id: string;
          policy_id: string | null;
          price_minor: number | null;
          sort: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          business_id: string;
          created_at?: string;
          duration_min?: number | null;
          event_id: string;
          offering_id: string;
          policy_id?: string | null;
          price_minor?: number | null;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          created_at?: string;
          duration_min?: number | null;
          event_id?: string;
          offering_id?: string;
          policy_id?: string | null;
          price_minor?: number | null;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_offering_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_offering_event_fk";
            columns: ["business_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "event";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "event_offering_offering_fk";
            columns: ["business_id", "offering_id"];
            isOneToOne: false;
            referencedRelation: "offering";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "event_offering_policy_fk";
            columns: ["business_id", "policy_id"];
            isOneToOne: false;
            referencedRelation: "booking_policy";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      offering: {
        Row: {
          active: boolean;
          buffer_after_min: number;
          buffer_before_min: number;
          business_id: string;
          category_id: string | null;
          created_at: string;
          currency: string;
          description: string | null;
          duration_min: number;
          id: string;
          max_party: number;
          min_party: number;
          name: string;
          policy_id: string | null;
          price_minor: number | null;
          price_type: Database["booking"]["Enums"]["price_type"];
          slot_interval_min: number | null;
          sort: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          buffer_after_min?: number;
          buffer_before_min?: number;
          business_id: string;
          category_id?: string | null;
          created_at?: string;
          currency: string;
          description?: string | null;
          duration_min: number;
          id?: string;
          max_party?: number;
          min_party?: number;
          name: string;
          policy_id?: string | null;
          price_minor?: number | null;
          price_type?: Database["booking"]["Enums"]["price_type"];
          slot_interval_min?: number | null;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          buffer_after_min?: number;
          buffer_before_min?: number;
          business_id?: string;
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string | null;
          duration_min?: number;
          id?: string;
          max_party?: number;
          min_party?: number;
          name?: string;
          policy_id?: string | null;
          price_minor?: number | null;
          price_type?: Database["booking"]["Enums"]["price_type"];
          slot_interval_min?: number | null;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offering_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offering_category_fk";
            columns: ["business_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "offering_category";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "offering_policy_fk";
            columns: ["business_id", "policy_id"];
            isOneToOne: false;
            referencedRelation: "booking_policy";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      offering_category: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          name: string;
          sort: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          name: string;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offering_category_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
        ];
      };
      offering_requirement: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          length_min: number | null;
          link_key: string | null;
          offering_id: string;
          offset_min: number;
          pool_id: string | null;
          quantity: number;
          resource_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          length_min?: number | null;
          link_key?: string | null;
          offering_id: string;
          offset_min?: number;
          pool_id?: string | null;
          quantity?: number;
          resource_id?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          length_min?: number | null;
          link_key?: string | null;
          offering_id?: string;
          offset_min?: number;
          pool_id?: string | null;
          quantity?: number;
          resource_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offering_requirement_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offering_requirement_offering_fk";
            columns: ["business_id", "offering_id"];
            isOneToOne: false;
            referencedRelation: "offering";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "offering_requirement_pool_fk";
            columns: ["business_id", "pool_id"];
            isOneToOne: false;
            referencedRelation: "resource_pool";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "offering_requirement_resource_fk";
            columns: ["business_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resource";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      outbox_event: {
        Row: {
          attempts: number;
          business_id: string;
          created_at: string;
          delivered_at: string | null;
          id: string;
          payload: NonNullable<Json>;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          business_id: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          payload: NonNullable<Json>;
          type: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          business_id?: string;
          created_at?: string;
          delivered_at?: string | null;
          id?: string;
          payload?: NonNullable<Json>;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outbox_event_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
        ];
      };
      question: {
        Row: {
          business_id: string;
          created_at: string;
          event_id: string | null;
          id: string;
          kind: Database["booking"]["Enums"]["question_kind"];
          label: string;
          offering_id: string | null;
          options: NonNullable<Json>;
          required: boolean;
          sort: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          kind: Database["booking"]["Enums"]["question_kind"];
          label: string;
          offering_id?: string | null;
          options?: NonNullable<Json>;
          required?: boolean;
          sort?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          kind?: Database["booking"]["Enums"]["question_kind"];
          label?: string;
          offering_id?: string | null;
          options?: NonNullable<Json>;
          required?: boolean;
          sort?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_event_fk";
            columns: ["business_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "event";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "question_offering_fk";
            columns: ["business_id", "offering_id"];
            isOneToOne: false;
            referencedRelation: "offering";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      resource: {
        Row: {
          active: boolean;
          business_id: string;
          capacity: number;
          created_at: string;
          external_user_ref: string | null;
          id: string;
          kind: Database["booking"]["Enums"]["resource_kind"];
          name: string;
          sort: number;
          updated_at: string;
          venue_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          business_id: string;
          capacity?: number;
          created_at?: string;
          external_user_ref?: string | null;
          id?: string;
          kind: Database["booking"]["Enums"]["resource_kind"];
          name: string;
          sort?: number;
          updated_at?: string;
          venue_id?: string | null;
        };
        Update: {
          active?: boolean;
          business_id?: string;
          capacity?: number;
          created_at?: string;
          external_user_ref?: string | null;
          id?: string;
          kind?: Database["booking"]["Enums"]["resource_kind"];
          name?: string;
          sort?: number;
          updated_at?: string;
          venue_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "resource_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_venue_fk";
            columns: ["business_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "venue";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      resource_pool: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          name: string;
          selection: Database["booking"]["Enums"]["pool_selection"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          name: string;
          selection?: Database["booking"]["Enums"]["pool_selection"];
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          selection?: Database["booking"]["Enums"]["pool_selection"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_pool_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
        ];
      };
      resource_pool_member: {
        Row: {
          business_id: string;
          created_at: string;
          pool_id: string;
          resource_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          pool_id: string;
          resource_id: string;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          pool_id?: string;
          resource_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_pool_member_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_pool_member_pool_fk";
            columns: ["business_id", "pool_id"];
            isOneToOne: false;
            referencedRelation: "resource_pool";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "resource_pool_member_resource_fk";
            columns: ["business_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resource";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      schedule: {
        Row: {
          business_id: string;
          created_at: string;
          event_id: string | null;
          id: string;
          resource_id: string | null;
          updated_at: string;
          valid_from: string | null;
          valid_to: string | null;
          venue_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          resource_id?: string | null;
          updated_at?: string;
          valid_from?: string | null;
          valid_to?: string | null;
          venue_id?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          resource_id?: string | null;
          updated_at?: string;
          valid_from?: string | null;
          valid_to?: string | null;
          venue_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_event_fk";
            columns: ["business_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "event";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "schedule_resource_fk";
            columns: ["business_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resource";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "schedule_venue_fk";
            columns: ["business_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "venue";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      schedule_exception: {
        Row: {
          business_id: string;
          created_at: string;
          date: string;
          end_time: string | null;
          id: string;
          kind: Database["booking"]["Enums"]["schedule_exception_kind"];
          schedule_id: string;
          start_time: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          date: string;
          end_time?: string | null;
          id?: string;
          kind: Database["booking"]["Enums"]["schedule_exception_kind"];
          schedule_id: string;
          start_time?: string | null;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          date?: string;
          end_time?: string | null;
          id?: string;
          kind?: Database["booking"]["Enums"]["schedule_exception_kind"];
          schedule_id?: string;
          start_time?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_exception_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_exception_schedule_fk";
            columns: ["business_id", "schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedule";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      schedule_rule: {
        Row: {
          business_id: string;
          created_at: string;
          end_time: string;
          id: string;
          schedule_id: string;
          start_time: string;
          updated_at: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          end_time: string;
          id?: string;
          schedule_id: string;
          start_time: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          end_time?: string;
          id?: string;
          schedule_id?: string;
          start_time?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_rule_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_rule_schedule_fk";
            columns: ["business_id", "schedule_id"];
            isOneToOne: false;
            referencedRelation: "schedule";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      time_off: {
        Row: {
          business_id: string;
          created_at: string;
          created_by_ref: string | null;
          ends_at: string;
          event_id: string | null;
          id: string;
          reason: string | null;
          resource_id: string | null;
          starts_at: string;
          updated_at: string;
          venue_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          created_at?: string;
          created_by_ref?: string | null;
          ends_at: string;
          event_id?: string | null;
          id?: string;
          reason?: string | null;
          resource_id?: string | null;
          starts_at: string;
          updated_at?: string;
          venue_id?: string | null;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by_ref?: string | null;
          ends_at?: string;
          event_id?: string | null;
          id?: string;
          reason?: string | null;
          resource_id?: string | null;
          starts_at?: string;
          updated_at?: string;
          venue_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "time_off_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_off_event_fk";
            columns: ["business_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "event";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "time_off_resource_fk";
            columns: ["business_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resource";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "time_off_venue_fk";
            columns: ["business_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "venue";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      venue: {
        Row: {
          active: boolean;
          address: Json | null;
          business_id: string;
          created_at: string;
          id: string;
          instructions: string | null;
          kind: Database["booking"]["Enums"]["venue_kind"];
          lat: number | null;
          lng: number | null;
          name: string;
          sort: number;
          timezone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          address?: Json | null;
          business_id: string;
          created_at?: string;
          id?: string;
          instructions?: string | null;
          kind?: Database["booking"]["Enums"]["venue_kind"];
          lat?: number | null;
          lng?: number | null;
          name: string;
          sort?: number;
          timezone?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          address?: Json | null;
          business_id?: string;
          created_at?: string;
          id?: string;
          instructions?: string | null;
          kind?: Database["booking"]["Enums"]["venue_kind"];
          lat?: number | null;
          lng?: number | null;
          name?: string;
          sort?: number;
          timezone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venue_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist_entry: {
        Row: {
          business_id: string;
          claim_token_hash: string | null;
          created_at: string;
          customer_id: string;
          event_id: string | null;
          id: string;
          offer_expires_at: string | null;
          offering_id: string | null;
          preferred: NonNullable<Json>;
          resource_id: string | null;
          status: Database["booking"]["Enums"]["waitlist_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          business_id: string;
          claim_token_hash?: string | null;
          created_at?: string;
          customer_id: string;
          event_id?: string | null;
          id?: string;
          offer_expires_at?: string | null;
          offering_id?: string | null;
          preferred?: NonNullable<Json>;
          resource_id?: string | null;
          status?: Database["booking"]["Enums"]["waitlist_status"];
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          claim_token_hash?: string | null;
          created_at?: string;
          customer_id?: string;
          event_id?: string | null;
          id?: string;
          offer_expires_at?: string | null;
          offering_id?: string | null;
          preferred?: NonNullable<Json>;
          resource_id?: string | null;
          status?: Database["booking"]["Enums"]["waitlist_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_entry_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entry_customer_fk";
            columns: ["business_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customer";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "waitlist_entry_event_fk";
            columns: ["business_id", "event_id"];
            isOneToOne: false;
            referencedRelation: "event";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "waitlist_entry_offering_fk";
            columns: ["business_id", "offering_id"];
            isOneToOne: false;
            referencedRelation: "offering";
            referencedColumns: ["business_id", "id"];
          },
          {
            foreignKeyName: "waitlist_entry_resource_fk";
            columns: ["business_id", "resource_id"];
            isOneToOne: false;
            referencedRelation: "resource";
            referencedColumns: ["business_id", "id"];
          },
        ];
      };
      webhook_endpoint: {
        Row: {
          active: boolean;
          api_client_id: string;
          business_id: string | null;
          created_at: string;
          event_types: string[];
          id: string;
          secret: string;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          api_client_id: string;
          business_id?: string | null;
          created_at?: string;
          event_types?: string[];
          id?: string;
          secret: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          active?: boolean;
          api_client_id?: string;
          business_id?: string | null;
          created_at?: string;
          event_types?: string[];
          id?: string;
          secret?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_endpoint_api_client_id_fkey";
            columns: ["api_client_id"];
            isOneToOne: false;
            referencedRelation: "api_client";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "webhook_endpoint_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "business";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_active_status: { Args: { s: Database["booking"]["Enums"]["booking_status"] }; Returns: boolean };
      is_valid_timezone: { Args: { tz: string }; Returns: boolean };
      resolve_policy: {
        Args: { p_business_id: string; p_event_id?: string; p_offering_id: string };
        Returns: {
          approval_mode: Database["booking"]["Enums"]["approval_mode"];
          business_id: string;
          cancel_cutoff_hours: number | null;
          created_at: string;
          hold_minutes: number;
          id: string;
          max_advance_days: number | null;
          min_lead_minutes: number;
          name: string;
          pending_counts_capacity: boolean;
          reminder_offsets_min: number[];
          reschedule_cutoff_hours: number | null;
          respond_within_hours: number | null;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "booking_policy";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      actor_type: "customer" | "staff" | "system" | "api";
      approval_mode: "manual" | "instant";
      booking_source: "online" | "manual" | "walk_in" | "api";
      booking_status:
        "hold" | "pending" | "confirmed" | "declined" | "expired" | "cancelled" | "completed" | "no_show" | "released";
      business_status: "active" | "suspended" | "archived";
      capacity_period: "slot" | "day" | "week" | "total";
      capacity_unit: "bookings" | "people";
      event_status: "draft" | "scheduled" | "published" | "closed" | "archived";
      payment_status: "unpaid" | "partially_paid" | "paid" | "refunded";
      pool_selection: "any" | "customer_choice";
      price_type: "fixed" | "from" | "free" | "on_request";
      question_kind: "text" | "number" | "select" | "checkbox" | "date";
      resource_kind: "staff" | "space" | "equipment";
      schedule_exception_kind: "closed" | "open";
      slot_mode: "grid" | "flexible";
      venue_kind: "on_site" | "customer_address" | "online";
      vertical: "photography" | "barbershop" | "hair_salon" | "nail_salon" | "spa" | "other";
      waitlist_status: "waiting" | "offered" | "claimed" | "expired" | "removed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "booking">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  booking: {
    Enums: {
      actor_type: ["customer", "staff", "system", "api"],
      approval_mode: ["manual", "instant"],
      booking_source: ["online", "manual", "walk_in", "api"],
      booking_status: [
        "hold",
        "pending",
        "confirmed",
        "declined",
        "expired",
        "cancelled",
        "completed",
        "no_show",
        "released",
      ],
      business_status: ["active", "suspended", "archived"],
      capacity_period: ["slot", "day", "week", "total"],
      capacity_unit: ["bookings", "people"],
      event_status: ["draft", "scheduled", "published", "closed", "archived"],
      payment_status: ["unpaid", "partially_paid", "paid", "refunded"],
      pool_selection: ["any", "customer_choice"],
      price_type: ["fixed", "from", "free", "on_request"],
      question_kind: ["text", "number", "select", "checkbox", "date"],
      resource_kind: ["staff", "space", "equipment"],
      schedule_exception_kind: ["closed", "open"],
      slot_mode: ["grid", "flexible"],
      venue_kind: ["on_site", "customer_address", "online"],
      vertical: ["photography", "barbershop", "hair_salon", "nail_salon", "spa", "other"],
      waitlist_status: ["waiting", "offered", "claimed", "expired", "removed"],
    },
  },
} as const;
