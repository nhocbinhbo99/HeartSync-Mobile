
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {

  "private": {
          Tables: {
            "ai_generation_requests": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"error_code": string | null,"expires_at": string,"feature": string,"match_id": string | null,"period_key": string,"request_id": string,"result_json": Json | null,"status": string,"user_id": string,"ai_request_state": Json | null
                  }
                  ComputedFields: "ai_request_state"
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"error_code"?: string | null,"expires_at": string,"feature": string,"match_id"?: string | null,"period_key": string,"request_id": string,"result_json"?: Json | null,"status": string,"user_id": string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"error_code"?: string | null,"expires_at"?: string,"feature"?: string,"match_id"?: string | null,"period_key"?: string,"request_id"?: string,"result_json"?: Json | null,"status"?: string,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"call_media_cleanup": {
                  Row: {
                    "call_id": string,"callee_id": string,"caller_id": string,"queued_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "call_id": string,"callee_id": string,"caller_id": string,"queued_at"?: string
                  }
                  Update: {
                    "call_id"?: string,"callee_id"?: string,"caller_id"?: string,"queued_at"?: string
                  }
                  Relationships: [

                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "ai_period_key":
{ Args: { "p_feature": string }; Returns: string
                           },
"ai_quota_json":
{ Args: { "p_feature": string,"p_period_key": string,"p_user_id": string }; Returns: Json
                           },
"ai_request_state":
{ Args: { "p_request": Omit<Database["private"]['Tables']["ai_generation_requests"]['Row'], Database["private"]['Tables']["ai_generation_requests"]['ComputedFields']> }; Returns: Json
                           },
"can_read_match_history":
{ Args: { "p_match_id": string }; Returns: boolean
                           },
"can_use_active_match":
{ Args: { "p_match_id": string }; Returns: boolean
                           },
"can_view_profile":
{ Args: { "p_profile_id": string }; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "p_user_a": string,"p_user_b": string }; Returns: boolean
                           },
"is_eligible_profile":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"profile_public_json":
{ Args: { "p_profile_id": string }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_quota_buckets": {
                  Row: {
                    "feature": string,"period_key": string,"reserved_count": number,"updated_at": string,"used_count": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "feature": string,"period_key": string,"reserved_count"?: number,"updated_at"?: string,"used_count"?: number,"user_id": string
                  }
                  Update: {
                    "feature"?: string,"period_key"?: string,"reserved_count"?: number,"updated_at"?: string,"used_count"?: number,"user_id"?: string
                  }
                  Relationships: [

                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"calls": {
                  Row: {
                    "callee_heartbeat_at": string | null,"callee_id": string,"caller_heartbeat_at": string | null,"caller_id": string,"ended_at": string | null,"id": string,"match_id": string,"started_at": string,"status": Database["public"]['Enums']["call_status"],"type": Database["public"]['Enums']["call_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "callee_heartbeat_at"?: string | null,"callee_id": string,"caller_heartbeat_at"?: string | null,"caller_id": string,"ended_at"?: string | null,"id"?: string,"match_id": string,"started_at"?: string,"status"?: Database["public"]['Enums']["call_status"],"type": Database["public"]['Enums']["call_type"]
                  }
                  Update: {
                    "callee_heartbeat_at"?: string | null,"callee_id"?: string,"caller_heartbeat_at"?: string | null,"caller_id"?: string,"ended_at"?: string | null,"id"?: string,"match_id"?: string,"started_at"?: string,"status"?: Database["public"]['Enums']["call_status"],"type"?: Database["public"]['Enums']["call_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "calls_callee_id_fkey"
      columns: ["callee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calls_caller_id_fkey"
      columns: ["caller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "calls_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    }
                  ]
                },"interests": {
                  Row: {
                    "id": string,"label": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"label": string,"slug": string
                  }
                  Update: {
                    "id"?: string,"label"?: string,"slug"?: string
                  }
                  Relationships: [

                  ]
                },"matches": {
                  Row: {
                    "created_at": string,"id": string,"status": Database["public"]['Enums']["match_status"],"unmatched_at": string | null,"unmatched_by": string | null,"user_high_id": string,"user_low_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"status"?: Database["public"]['Enums']["match_status"],"unmatched_at"?: string | null,"unmatched_by"?: string | null,"user_high_id": string,"user_low_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"status"?: Database["public"]['Enums']["match_status"],"unmatched_at"?: string | null,"unmatched_by"?: string | null,"user_high_id"?: string,"user_low_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_unmatched_by_fkey"
      columns: ["unmatched_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_user_high_id_fkey"
      columns: ["user_high_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_user_low_id_fkey"
      columns: ["user_low_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "client_message_id": string,"content": string,"id": string,"match_id": string,"read_at": string | null,"sender_id": string,"sent_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_message_id": string,"content": string,"id"?: string,"match_id": string,"read_at"?: string | null,"sender_id": string,"sent_at"?: string
                  }
                  Update: {
                    "client_message_id"?: string,"content"?: string,"id"?: string,"match_id"?: string,"read_at"?: string | null,"sender_id"?: string,"sent_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_interests": {
                  Row: {
                    "interest_id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "interest_id": string,"profile_id": string
                  }
                  Update: {
                    "interest_id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_interests_interest_id_fkey"
      columns: ["interest_id"]
isOneToOne: false
      referencedRelation: "interests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_interests_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_languages": {
                  Row: {
                    "language_code": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "language_code": string,"profile_id": string
                  }
                  Update: {
                    "language_code"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_languages_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_photos": {
                  Row: {
                    "created_at": string,"id": string,"is_primary": boolean,"profile_id": string,"sort_order": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_primary"?: boolean,"profile_id": string,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_primary"?: boolean,"profile_id"?: string,"sort_order"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_photos_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_private": {
                  Row: {
                    "created_at": string,"date_of_birth": string,"latitude": number | null,"location_consent": boolean,"location_updated_at": string | null,"longitude": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date_of_birth": string,"latitude"?: number | null,"location_consent"?: boolean,"location_updated_at"?: string | null,"longitude"?: number | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"date_of_birth"?: string,"latitude"?: number | null,"location_consent"?: boolean,"location_updated_at"?: string | null,"longitude"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_private_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "bio": string | null,"created_at": string,"display_name": string,"education": string | null,"gender": string,"id": string,"occupation": string | null,"profile_completed_at": string | null,"public_location": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"created_at"?: string,"display_name": string,"education"?: string | null,"gender": string,"id": string,"occupation"?: string | null,"profile_completed_at"?: string | null,"public_location"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bio"?: string | null,"created_at"?: string,"display_name"?: string,"education"?: string | null,"gender"?: string,"id"?: string,"occupation"?: string | null,"profile_completed_at"?: string | null,"public_location"?: string | null,"updated_at"?: string
                  }
                  Relationships: [

                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"reason": string,"reported_id": string,"reporter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason": string,"reported_id": string,"reporter_id": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: string,"reported_id"?: string,"reporter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reported_id_fkey"
      columns: ["reported_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_profiles": {
                  Row: {
                    "created_at": string,"owner_id": string,"target_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"owner_id": string,"target_id": string
                  }
                  Update: {
                    "created_at"?: string,"owner_id"?: string,"target_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_profiles_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_profiles_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"swipes": {
                  Row: {
                    "action": Database["public"]['Enums']["swipe_action"],"actor_id": string,"created_at": string,"target_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": Database["public"]['Enums']["swipe_action"],"actor_id": string,"created_at"?: string,"target_id": string,"updated_at"?: string
                  }
                  Update: {
                    "action"?: Database["public"]['Enums']["swipe_action"],"actor_id"?: string,"created_at"?: string,"target_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "swipes_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "swipes_target_id_fkey"
      columns: ["target_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_preferences": {
                  Row: {
                    "age_max": number,"age_min": number,"distance_km": number | null,"preferred_genders": (string)[],"preferred_languages": (string)[],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age_max"?: number,"age_min"?: number,"distance_km"?: number | null,"preferred_genders"?: (string)[],"preferred_languages"?: (string)[],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "age_max"?: number,"age_min"?: number,"distance_km"?: number | null,"preferred_genders"?: (string)[],"preferred_languages"?: (string)[],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_call":
{ Args: { "p_call_id": string }; Returns: string
                           },
"ack_call_cleanup":
{ Args: { "p_call_id": string }; Returns: undefined
                           },
"ai_icebreaker_context":
{ Args: { "p_match_id": string }; Returns: {
              "partner_interests": (string)[],"self_interests": (string)[]
            }[]
                           },
"block_user":
{ Args: { "p_target_id": string }; Returns: undefined
                           },
"call_heartbeat":
{ Args: { "p_call_id": string }; Returns: string
                           },
"chat_summaries":
{ Args: Record<PropertyKey, never>; Returns: {
              "last_message_at": string,"last_read_at": string,"match_id": string,"unread_count": number
            }[]
                           },
"confirm_user_email_for_dev":
{ Args: { "target_email": string }; Returns: boolean
                           },
"end_call":
{ Args: { "p_call_id": string }; Returns: string
                           },
"fail_ai_request":
{ Args: { "p_error_code": string,"p_request_id": string }; Returns: Json
                           },
"finalize_ai_request":
{ Args: { "p_request_id": string,"p_result": Json }; Returns: Json
                           },
"get_ai_quotas":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_discovery_candidates":
{ Args: { "p_age_max": number,"p_age_min": number,"p_cursor_created_at"?: string,"p_distance_km"?: number,"p_limit"?: number,"p_preferred_genders"?: (string)[],"p_preferred_languages"?: (string)[] }; Returns: {
              "cursor_created_at": string,"profile": Json
            }[]
                           },
"get_public_profile":
{ Args: { "p_profile_id": string }; Returns: Json
                           },
"list_active_matches":
{ Args: { "p_cursor_created_at"?: string,"p_limit"?: number }; Returns: {
              "created_at": string,"cursor_created_at": string,"id": string,"last_message_preview": string,"other_profile": Json
            }[]
                           },
"list_chat_matches":
{ Args: { "p_cursor"?: string }; Returns: {
              "created_at": string,"cursor_created_at": string,"id": string,"last_message_at": string,"last_message_preview": string,"other_profile": Json,"unread_count": number
            }[]
                           },
"list_saved_profiles":
{ Args: { "p_cursor_created_at"?: string,"p_limit"?: number }; Returns: {
              "profile": Json,"saved_at": string
            }[]
                           },
"mark_messages_read":
{ Args: { "p_ids": (string)[],"p_match_id": string }; Returns: undefined
                           },
"pending_call_cleanup":
{ Args: Record<PropertyKey, never>; Returns: Database["private"]['Tables']["call_media_cleanup"]['Row'][]
                          SetofOptions: {
        from: "*"
        to: "call_media_cleanup"
        isOneToOne: false
        isSetofReturn: true
      } },
"reconcile_calls":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"record_swipe":
{ Args: { "p_action": Database["public"]['Enums']["swipe_action"],"p_target_id": string }; Returns: {
              "match_id": string,"outcome": string
            }[]
                           },
"reject_call":
{ Args: { "p_call_id": string }; Returns: string
                           },
"reorder_profile_photos":
{ Args: { "p_photo_ids": (string)[] }; Returns: Json
                           },
"reserve_ai_request":
{ Args: { "p_feature": string,"p_match_id"?: string,"p_request_id": string }; Returns: Json
                           },
"save_my_preferences":
{ Args: { "p_age_max": number,"p_age_min": number,"p_distance_km"?: number,"p_preferred_genders"?: (string)[],"p_preferred_languages"?: (string)[] }; Returns: Json
                           },
"save_my_private_location":
{ Args: { "p_latitude"?: number,"p_location_consent": boolean,"p_longitude"?: number }; Returns: undefined
                           },
"save_my_profile":
{ Args: { "p_bio"?: string,"p_date_of_birth": string,"p_display_name": string,"p_education"?: string,"p_gender": string,"p_interest_labels"?: (string)[],"p_languages"?: (string)[],"p_latitude"?: number,"p_location_consent"?: boolean,"p_longitude"?: number,"p_occupation"?: string,"p_public_location"?: string }; Returns: Json
                           },
"send_chat_message":
{ Args: { "p_client_message_id": string,"p_content": string,"p_match_id": string }; Returns: {
              "client_message_id": string,
"content": string,
"id": string,
"match_id": string,
"read_at": string | null,
"sender_id": string,
"sent_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "messages"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_primary_profile_photo":
{ Args: { "p_photo_id": string }; Returns: undefined
                           },
"start_call":
{ Args: { "p_match_id": string,"p_type": Database["public"]['Enums']["call_type"] }; Returns: string
                           },
"unmatch":
{ Args: { "p_match_id": string }; Returns: string
                           }
          }
          Enums: {
            "call_status": "ringing"|"accepted"|"rejected"|"missed"|"connecting"|"connected"|"ended"|"failed","call_type": "audio"|"video","match_status": "active"|"unmatched","swipe_action": "like"|"pass"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "private": {
          Enums: {

          }
        },"public": {
          Enums: {
            "call_status": ["ringing", "accepted", "rejected", "missed", "connecting", "connected", "ended", "failed"],"call_type": ["audio", "video"],"match_status": ["active", "unmatched"],"swipe_action": ["like", "pass"]
          }
        }
} as const
