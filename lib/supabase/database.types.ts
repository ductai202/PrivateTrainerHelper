
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
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
            "body_measurements": {
                  Row: {
                    "arm_cm": number | null,"body_fat_pct": number | null,"chest_cm": number | null,"created_at": string,"gym_id": string,"hip_cm": number | null,"id": string,"measured_on": string,"note": string | null,"student_id": string,"thigh_cm": number | null,"waist_cm": number | null,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "arm_cm"?: number | null,"body_fat_pct"?: number | null,"chest_cm"?: number | null,"created_at"?: string,"gym_id": string,"hip_cm"?: number | null,"id"?: string,"measured_on": string,"note"?: string | null,"student_id": string,"thigh_cm"?: number | null,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Update: {
                    "arm_cm"?: number | null,"body_fat_pct"?: number | null,"chest_cm"?: number | null,"created_at"?: string,"gym_id"?: string,"hip_cm"?: number | null,"id"?: string,"measured_on"?: string,"note"?: string | null,"student_id"?: string,"thigh_cm"?: number | null,"waist_cm"?: number | null,"weight_kg"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "body_measurements_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "body_measurements_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"gyms": {
                  Row: {
                    "created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"meal_plans": {
                  Row: {
                    "calories": number | null,"carbs_g": number | null,"content": string,"created_at": string,"effective_from": string,"fat_g": number | null,"gym_id": string,"id": string,"note": string | null,"protein_g": number | null,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calories"?: number | null,"carbs_g"?: number | null,"content": string,"created_at"?: string,"effective_from": string,"fat_g"?: number | null,"gym_id": string,"id"?: string,"note"?: string | null,"protein_g"?: number | null,"student_id": string
                  }
                  Update: {
                    "calories"?: number | null,"carbs_g"?: number | null,"content"?: string,"created_at"?: string,"effective_from"?: string,"fat_g"?: number | null,"gym_id"?: string,"id"?: string,"note"?: string | null,"protein_g"?: number | null,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_plans_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_plans_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "created_at": string,"display_name": string,"evening_review_time": string,"gym_id": string,"id": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"evening_review_time"?: string,"gym_id": string,"id"?: string,"role": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"evening_review_time"?: string,"gym_id"?: string,"id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    }
                  ]
                },"message_log": {
                  Row: {
                    "channel": string,"content": string,"gym_id": string,"id": string,"kind": string,"sent_at": string,"session_id": string | null,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"content": string,"gym_id": string,"id"?: string,"kind": string,"sent_at"?: string,"session_id"?: string | null,"student_id": string
                  }
                  Update: {
                    "channel"?: string,"content"?: string,"gym_id"?: string,"id"?: string,"kind"?: string,"sent_at"?: string,"session_id"?: string | null,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "message_log_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_log_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "message_log_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"packages": {
                  Row: {
                    "created_at": string,"expires_on": string | null,"gym_id": string,"id": string,"start_date": string,"student_id": string,"total_sessions": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_on"?: string | null,"gym_id": string,"id"?: string,"start_date": string,"student_id": string,"total_sessions": number
                  }
                  Update: {
                    "created_at"?: string,"expires_on"?: string | null,"gym_id"?: string,"id"?: string,"start_date"?: string,"student_id"?: string,"total_sessions"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "packages_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "packages_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"progress_notes": {
                  Row: {
                    "content": string,"created_at": string,"gym_id": string,"id": string,"noted_on": string,"photo_path": string | null,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"gym_id": string,"id"?: string,"noted_on": string,"photo_path"?: string | null,"student_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"gym_id"?: string,"id"?: string,"noted_on"?: string,"photo_path"?: string | null,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "progress_notes_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_notes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"push_log": {
                  Row: {
                    "created_at": string,"for_date": string,"id": string,"kind": string,"member_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"for_date": string,"id"?: string,"kind": string,"member_id": string
                  }
                  Update: {
                    "created_at"?: string,"for_date"?: string,"id"?: string,"kind"?: string,"member_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_log_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"gym_id": string,"id": string,"member_id": string,"p256dh": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"gym_id": string,"id"?: string,"member_id": string,"p256dh": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"gym_id"?: string,"id"?: string,"member_id"?: string,"p256dh"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_subscriptions_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"checklist_pushed_at": string | null,"checklist_reminded_at": string | null,"created_at": string,"end_at": string,"gym_id": string,"id": string,"package_id": string | null,"precheck_pushed_at": string | null,"pt_id": string,"rescheduled_from": string | null,"signed_at": string | null,"start_at": string,"status": string,"student_id": string,"student_signed": boolean,"workout_content": string | null,"workout_logged": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"checklist_pushed_at"?: string | null,"checklist_reminded_at"?: string | null,"created_at"?: string,"end_at": string,"gym_id": string,"id"?: string,"package_id"?: string | null,"precheck_pushed_at"?: string | null,"pt_id": string,"rescheduled_from"?: string | null,"signed_at"?: string | null,"start_at": string,"status"?: string,"student_id": string,"student_signed"?: boolean,"workout_content"?: string | null,"workout_logged"?: boolean
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"checklist_pushed_at"?: string | null,"checklist_reminded_at"?: string | null,"created_at"?: string,"end_at"?: string,"gym_id"?: string,"id"?: string,"package_id"?: string | null,"precheck_pushed_at"?: string | null,"pt_id"?: string,"rescheduled_from"?: string | null,"signed_at"?: string | null,"start_at"?: string,"status"?: string,"student_id"?: string,"student_signed"?: boolean,"workout_content"?: string | null,"workout_logged"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_package_id_fkey"
      columns: ["package_id"]
isOneToOne: false
      referencedRelation: "packages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_pt_id_fkey"
      columns: ["pt_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_rescheduled_from_fkey"
      columns: ["rescheduled_from"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"student_availability": {
                  Row: {
                    "created_at": string,"from_time": string,"gym_id": string,"id": string,"student_id": string,"to_time": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_time": string,"gym_id": string,"id"?: string,"student_id": string,"to_time": string,"weekday": number
                  }
                  Update: {
                    "created_at"?: string,"from_time"?: string,"gym_id"?: string,"id"?: string,"student_id"?: string,"to_time"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_availability_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_availability_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "archived": boolean,"birth_year": number | null,"bot_link_code": string,"created_at": string,"full_name": string,"gender": string | null,"goal": string | null,"gym_id": string,"health_notes": string | null,"height_cm": number | null,"id": string,"phone": string,"pt_id": string,"target_per_week": number,"zalo_bot_chat_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"birth_year"?: number | null,"bot_link_code"?: string,"created_at"?: string,"full_name": string,"gender"?: string | null,"goal"?: string | null,"gym_id": string,"health_notes"?: string | null,"height_cm"?: number | null,"id"?: string,"phone": string,"pt_id": string,"target_per_week"?: number,"zalo_bot_chat_id"?: string | null
                  }
                  Update: {
                    "archived"?: boolean,"birth_year"?: number | null,"bot_link_code"?: string,"created_at"?: string,"full_name"?: string,"gender"?: string | null,"goal"?: string | null,"gym_id"?: string,"health_notes"?: string | null,"height_cm"?: number | null,"id"?: string,"phone"?: string,"pt_id"?: string,"target_per_week"?: number,"zalo_bot_chat_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_gym_id_fkey"
      columns: ["gym_id"]
isOneToOne: false
      referencedRelation: "gyms"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_pt_id_fkey"
      columns: ["pt_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_access_student":
{ Args: { "sid": string }; Returns: boolean
                           },
"current_member":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,
"display_name": string,
"evening_review_time": string,
"gym_id": string,
"id": string,
"role": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "members"
        isOneToOne: true
        isSetofReturn: false
      } },
"is_owner":
{ Args: { "gym": string }; Returns: boolean
                           },
"member_in_gym":
{ Args: { "gym": string,"member": string }; Returns: boolean
                           },
"schedule_tick":
{ Args: { "app_url": string,"cron_secret": string }; Returns: undefined
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
