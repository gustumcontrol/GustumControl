export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number;
          maintenance_mode: boolean;
        };
        Insert: {
          id?: number;
          maintenance_mode?: boolean;
        };
        Update: {
          id?: number;
          maintenance_mode?: boolean;
        };
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          description: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          description: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          description?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      board_plans: {
        Row: {
          name: string;
          price_per_person: number;
        };
        Insert: {
          name: string;
          price_per_person: number;
        };
        Update: {
          name?: string;
          price_per_person?: number;
        };
        Relationships: [];
      };
      cleaning_log: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          id: string;
          reservation_id: string;
          room_number: string;
          status: string;
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          id?: string;
          reservation_id: string;
          room_number: string;
          status: string;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          id?: string;
          reservation_id?: string;
          room_number?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cleaning_log_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cleaning_log_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_issues: {
        Row: {
          id: string;
          room_id: string;
          description: string;
          photo_urls: string[];
          status: string;
          opened_by: string | null;
          opened_at: string;
          started_at: string | null;
          closed_by: string | null;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          description: string;
          photo_urls?: string[];
          status?: string;
          opened_by?: string | null;
          opened_at?: string;
          started_at?: string | null;
          closed_by?: string | null;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          description?: string;
          photo_urls?: string[];
          status?: string;
          opened_by?: string | null;
          opened_at?: string;
          started_at?: string | null;
          closed_by?: string | null;
          closed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_issues_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_issues_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_issues_closed_by_fkey";
            columns: ["closed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      room_staff_assignments: {
        Row: {
          id: string;
          room_id: string;
          staff_name: string;
          notes: string | null;
          assigned_by: string | null;
          assigned_at: string;
          released_by: string | null;
          released_at: string | null;
        };
        Insert: {
          id?: string;
          room_id: string;
          staff_name: string;
          notes?: string | null;
          assigned_by?: string | null;
          assigned_at?: string;
          released_by?: string | null;
          released_at?: string | null;
        };
        Update: {
          id?: string;
          room_id?: string;
          staff_name?: string;
          notes?: string | null;
          assigned_by?: string | null;
          assigned_at?: string;
          released_by?: string | null;
          released_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_staff_assignments_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_staff_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_staff_assignments_released_by_fkey";
            columns: ["released_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          recipient_role: string;
          reservation_id: string | null;
          room_number: string | null;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          recipient_role: string;
          reservation_id?: string | null;
          room_number?: string | null;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          recipient_role?: string;
          reservation_id?: string | null;
          room_number?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          department: string | null;
          email: string | null;
          full_name: string;
          id: string;
          last_active: string | null;
          role: string;
          status: string;
        };
        Insert: {
          created_at?: string | null;
          department?: string | null;
          email?: string | null;
          full_name: string;
          id: string;
          last_active?: string | null;
          role: string;
          status?: string;
        };
        Update: {
          created_at?: string | null;
          department?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          last_active?: string | null;
          role?: string;
          status?: string;
        };
        Relationships: [];
      };
      reservation_history: {
        Row: {
          archived_at: string;
          board_plan: string | null;
          check_in: string;
          check_out: string;
          country: string | null;
          floor: string;
          guest_name: string;
          guests_count: number;
          id: string;
          municipio: string | null;
          nights: number;
          notes: string | null;
          original_reservation_id: string;
          payment_method: string | null;
          price_per_night: number;
          provincia: string | null;
          room_number: string;
          room_type: string;
          ticket: string | null;
          total: number;
        };
        Insert: {
          archived_at?: string;
          board_plan?: string | null;
          check_in: string;
          check_out: string;
          country?: string | null;
          floor: string;
          guest_name: string;
          guests_count: number;
          id?: string;
          municipio?: string | null;
          nights: number;
          notes?: string | null;
          original_reservation_id: string;
          payment_method?: string | null;
          price_per_night: number;
          provincia?: string | null;
          room_number: string;
          room_type: string;
          ticket?: string | null;
          total: number;
        };
        Update: {
          archived_at?: string;
          board_plan?: string | null;
          check_in?: string;
          check_out?: string;
          country?: string | null;
          floor?: string;
          guest_name?: string;
          guests_count?: number;
          id?: string;
          municipio?: string | null;
          nights?: number;
          notes?: string | null;
          original_reservation_id?: string;
          payment_method?: string | null;
          price_per_night?: number;
          provincia?: string | null;
          room_number?: string;
          room_type?: string;
          ticket?: string | null;
          total?: number;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          board_plan: string | null;
          check_in: string;
          check_out: string | null;
          cleaning_status: string;
          closed_at: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          guest_name: string;
          guests_count: number;
          id: string;
          maintenance_status: string;
          municipio: string | null;
          nights: number;
          notes: string | null;
          payment_method: string | null;
          phone: string | null;
          price_per_night: number;
          provincia: string | null;
          room_id: string;
          status: string;
          total: number | null;
        };
        Insert: {
          board_plan?: string | null;
          check_in: string;
          check_out?: string | null;
          cleaning_status?: string;
          closed_at?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          guest_name: string;
          guests_count: number;
          id?: string;
          maintenance_status?: string;
          municipio?: string | null;
          nights: number;
          notes?: string | null;
          payment_method?: string | null;
          phone?: string | null;
          price_per_night: number;
          provincia?: string | null;
          room_id: string;
          status?: string;
          total?: number | null;
        };
        Update: {
          board_plan?: string | null;
          check_in?: string;
          check_out?: string | null;
          cleaning_status?: string;
          closed_at?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          guest_name?: string;
          guests_count?: number;
          id?: string;
          maintenance_status?: string;
          municipio?: string | null;
          nights?: number;
          notes?: string | null;
          payment_method?: string | null;
          phone?: string | null;
          price_per_night?: number;
          provincia?: string | null;
          room_id?: string;
          status?: string;
          total?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_board_plan_fkey";
            columns: ["board_plan"];
            isOneToOne: false;
            referencedRelation: "board_plans";
            referencedColumns: ["name"];
          },
          {
            foreignKeyName: "reservations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "room_status";
            referencedColumns: ["room_id"];
          },
          {
            foreignKeyName: "reservations_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_types: {
        Row: {
          name: string;
          price_per_night: number;
        };
        Insert: {
          name: string;
          price_per_night: number;
        };
        Update: {
          name?: string;
          price_per_night?: number;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          active: boolean;
          capacity: number;
          floor: string;
          id: string;
          number: string;
          type: string;
        };
        Insert: {
          active?: boolean;
          capacity: number;
          floor: string;
          id?: string;
          number: string;
          type: string;
        };
        Update: {
          active?: boolean;
          capacity?: number;
          floor?: string;
          id?: string;
          number?: string;
          type?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      room_status: {
        Row: {
          capacity: number | null;
          check_in: string | null;
          check_out: string | null;
          cleaning_status: string | null;
          computed_status: string | null;
          floor: string | null;
          guest_name: string | null;
          maintenance_issue_id: string | null;
          maintenance_description: string | null;
          staff_assignment_id: string | null;
          staff_name: string | null;
          number: string | null;
          reservation_id: string | null;
          room_id: string | null;
          type: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      check_long_cleanings: {
        Args: { p_threshold_minutes?: number };
        Returns: undefined;
      };
      close_reservation: {
        Args: { p_reservation_id: string };
        Returns: undefined;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      update_cleaning_status: {
        Args: { p_reservation_id: string; p_status: string };
        Returns: undefined;
      };
      open_maintenance_issue: {
        Args: { p_room_id: string; p_description: string; p_photo_urls?: string[] };
        Returns: string;
      };
      update_maintenance_issue_status: {
        Args: { p_issue_id: string; p_status: string };
        Returns: undefined;
      };
      edit_maintenance_issue: {
        Args: {
          p_issue_id: string;
          p_description?: string | null;
          p_new_photo_urls?: string[];
        };
        Returns: undefined;
      };
      assign_room_to_staff: {
        Args: { p_room_id: string; p_staff_name: string; p_notes?: string | null };
        Returns: string;
      };
      release_staff_room: {
        Args: { p_assignment_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type BoardPlan = Database["public"]["Tables"]["board_plans"]["Row"];
export type Room = Database["public"]["Tables"]["rooms"]["Row"];
export type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
export type ReservationHistory =
  Database["public"]["Tables"]["reservation_history"]["Row"];
export type CleaningLogEntry = Database["public"]["Tables"]["cleaning_log"]["Row"];
export type MaintenanceIssue = Database["public"]["Tables"]["maintenance_issues"]["Row"];
export type ActivityLogEntry = Database["public"]["Tables"]["activity_log"]["Row"];
export type RoomStaffAssignment =
  Database["public"]["Tables"]["room_staff_assignments"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type RoomStatus = Database["public"]["Views"]["room_status"]["Row"];

export type Role = "recepcion" | "limpieza" | "mantenimiento" | "admin";
export type NavItem = { href: string; label: string; icon: string; count?: number };
export type NavCategory = { category: string; items: NavItem[] };
export type UserStatus = "active" | "inactive" | "suspended";
export type CleaningStatus = "NO" | "PENDIENTE" | "EN PROCESO" | "LIMPIADO";
export type MaintenanceStatus = "NO" | "PENDIENTE" | "EN PROCESO" | "REALIZADO";
export type ComputedRoomStatus =
  | "LIBRE"
  | "OCUPADA"
  | "PENDIENTE LIMPIEZA"
  | "MANTENIMIENTO"
  | "EMPLEADO"
  | "RESERVADA";
