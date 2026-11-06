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
      academic_calendar: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          start_date: string
          target_semester: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          start_date: string
          target_semester?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          start_date?: string
          target_semester?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          module: string
          role_context: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module?: string
          role_context?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          role_context?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tokens: number | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tokens?: number | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_quizzes: {
        Row: {
          attempts_allowed: number
          catalog_subject_id: string | null
          created_at: string
          created_by: string
          department_id: string | null
          difficulty: string
          due_at: string | null
          id: string
          is_published: boolean
          publish_at: string | null
          question_count: number
          questions: Json
          randomize_options: boolean
          section_id: string | null
          semester: number | null
          show_correct_answers: boolean
          shuffle_questions: boolean
          status: string
          subject_id: string | null
          subject_label: string | null
          time_limit_minutes: number | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          attempts_allowed?: number
          catalog_subject_id?: string | null
          created_at?: string
          created_by: string
          department_id?: string | null
          difficulty?: string
          due_at?: string | null
          id?: string
          is_published?: boolean
          publish_at?: string | null
          question_count?: number
          questions: Json
          randomize_options?: boolean
          section_id?: string | null
          semester?: number | null
          show_correct_answers?: boolean
          shuffle_questions?: boolean
          status?: string
          subject_id?: string | null
          subject_label?: string | null
          time_limit_minutes?: number | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          attempts_allowed?: number
          catalog_subject_id?: string | null
          created_at?: string
          created_by?: string
          department_id?: string | null
          difficulty?: string
          due_at?: string | null
          id?: string
          is_published?: boolean
          publish_at?: string | null
          question_count?: number
          questions?: Json
          randomize_options?: boolean
          section_id?: string | null
          semester?: number | null
          show_correct_answers?: boolean
          shuffle_questions?: boolean
          status?: string
          subject_id?: string | null
          subject_label?: string | null
          time_limit_minutes?: number | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_quizzes_catalog_subject_id_fkey"
            columns: ["catalog_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_quizzes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_quizzes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_uploaded_files: {
        Row: {
          conversation_id: string | null
          created_at: string
          extracted_text: string | null
          file_name: string
          file_size: number
          id: string
          message_id: string | null
          mime_type: string
          storage_path: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          extracted_text?: string | null
          file_name: string
          file_size: number
          id?: string
          message_id?: string | null
          mime_type: string
          storage_path: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          extracted_text?: string | null
          file_name?: string
          file_size?: number
          id?: string
          message_id?: string | null
          mime_type?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_uploaded_files_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_uploaded_files_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          audience_type: string
          catalog_subject_id: string | null
          category: Database["public"]["Enums"]["announcement_category"]
          created_at: string
          created_by: string
          department_id: string | null
          description: string
          expiry_date: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          is_pinned: boolean
          pinned_at: string | null
          priority: Database["public"]["Enums"]["announcement_priority"]
          publish_date: string | null
          publish_status: string
          scheduled_for: string | null
          target_semester: number | null
          title: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          audience_type?: string
          catalog_subject_id?: string | null
          category?: Database["public"]["Enums"]["announcement_category"]
          created_at?: string
          created_by: string
          department_id?: string | null
          description: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_pinned?: boolean
          pinned_at?: string | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          publish_date?: string | null
          publish_status?: string
          scheduled_for?: string | null
          target_semester?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          audience_type?: string
          catalog_subject_id?: string | null
          category?: Database["public"]["Enums"]["announcement_category"]
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_pinned?: boolean
          pinned_at?: string | null
          priority?: Database["public"]["Enums"]["announcement_priority"]
          publish_date?: string | null
          publish_status?: string
          scheduled_for?: string | null
          target_semester?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_catalog_subject_id_fkey"
            columns: ["catalog_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      aptitude_attempts: {
        Row: {
          answers: Json
          category: string
          created_at: string
          difficulty: string
          id: string
          score: number
          set_number: number
          time_taken_seconds: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          category: string
          created_at?: string
          difficulty: string
          id?: string
          score: number
          set_number: number
          time_taken_seconds?: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          category?: string
          created_at?: string
          difficulty?: string
          id?: string
          score?: number
          set_number?: number
          time_taken_seconds?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          assessment_date: string | null
          assessment_type: string
          catalog_subject_id: string
          created_at: string
          created_by: string
          department_id: string | null
          id: string
          max_marks: number
          publish_status: string
          semester: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assessment_date?: string | null
          assessment_type: string
          catalog_subject_id: string
          created_at?: string
          created_by: string
          department_id?: string | null
          id?: string
          max_marks: number
          publish_status?: string
          semester?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assessment_date?: string | null
          assessment_type?: string
          catalog_subject_id?: string
          created_at?: string
          created_by?: string
          department_id?: string | null
          id?: string
          max_marks?: number
          publish_status?: string
          semester?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_catalog_subject_id_fkey"
            columns: ["catalog_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_reminders: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          is_dismissed: boolean
          notified: boolean
          reminder_date: string
          reminder_time: string | null
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          student_id: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          notified?: boolean
          reminder_date: string
          reminder_time?: string | null
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          student_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          is_dismissed?: boolean
          notified?: boolean
          reminder_date?: string
          reminder_time?: string | null
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_reminders_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          file_name: string | null
          file_url: string | null
          id: string
          marks: number | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          student_comment: string | null
          student_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          marks?: number | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          student_comment?: string | null
          student_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          marks?: number | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          student_comment?: string | null
          student_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          allow_late_submission: boolean
          attachment_name: string | null
          attachment_url: string | null
          catalog_subject_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          due_date: string
          faculty_id: string | null
          id: string
          instructions: string | null
          is_shared: boolean
          max_marks: number | null
          priority: Database["public"]["Enums"]["assignment_priority"]
          publish_status: string
          semester: number | null
          status: Database["public"]["Enums"]["assignment_status"]
          student_id: string | null
          subject_code: string | null
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_late_submission?: boolean
          attachment_name?: string | null
          attachment_url?: string | null
          catalog_subject_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date: string
          faculty_id?: string | null
          id?: string
          instructions?: string | null
          is_shared?: boolean
          max_marks?: number | null
          priority?: Database["public"]["Enums"]["assignment_priority"]
          publish_status?: string
          semester?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id?: string | null
          subject_code?: string | null
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_late_submission?: boolean
          attachment_name?: string | null
          attachment_url?: string | null
          catalog_subject_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string
          faculty_id?: string | null
          id?: string
          instructions?: string | null
          is_shared?: boolean
          max_marks?: number | null
          priority?: Database["public"]["Enums"]["assignment_priority"]
          publish_status?: string
          semester?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id?: string | null
          subject_code?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_catalog_subject_id_fkey"
            columns: ["catalog_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_percentage: number
          classes_attended: number
          created_at: string
          id: string
          last_updated: string
          student_id: string
          subject_id: string
          total_classes: number
          updated_at: string
        }
        Insert: {
          attendance_percentage?: number
          classes_attended?: number
          created_at?: string
          id?: string
          last_updated?: string
          student_id: string
          subject_id: string
          total_classes?: number
          updated_at?: string
        }
        Update: {
          attendance_percentage?: number
          classes_attended?: number
          created_at?: string
          id?: string
          last_updated?: string
          student_id?: string
          subject_id?: string
          total_classes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_history: {
        Row: {
          catalog_subject_id: string | null
          class_date: string
          created_at: string
          department_id: string | null
          faculty_id: string | null
          id: string
          marked_by: string | null
          notes: string | null
          semester: number | null
          status: string
          student_id: string
          subject_code: string | null
          subject_id: string | null
          subject_name: string | null
          updated_at: string
        }
        Insert: {
          catalog_subject_id?: string | null
          class_date: string
          created_at?: string
          department_id?: string | null
          faculty_id?: string | null
          id?: string
          marked_by?: string | null
          notes?: string | null
          semester?: number | null
          status: string
          student_id: string
          subject_code?: string | null
          subject_id?: string | null
          subject_name?: string | null
          updated_at?: string
        }
        Update: {
          catalog_subject_id?: string | null
          class_date?: string
          created_at?: string
          department_id?: string | null
          faculty_id?: string | null
          id?: string
          marked_by?: string | null
          notes?: string | null
          semester?: number | null
          status?: string
          student_id?: string
          subject_code?: string | null
          subject_id?: string | null
          subject_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_history_catalog_subject_id_fkey"
            columns: ["catalog_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_history_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_history_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          building: string | null
          capacity: number | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          building?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          building?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
          submitted_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
          submitted_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
          submitted_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_editors: {
        Row: {
          created_at: string
          event_id: string
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_editors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          is_active: boolean
          is_cancelled: boolean
          is_featured: boolean
          organizer: string | null
          registration_link: string | null
          registration_required: boolean
          start_time: string | null
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          is_active?: boolean
          is_cancelled?: boolean
          is_featured?: boolean
          organizer?: string | null
          registration_link?: string | null
          registration_required?: boolean
          start_time?: string | null
          title: string
          updated_at?: string
          venue: string
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          is_active?: boolean
          is_cancelled?: boolean
          is_featured?: boolean
          organizer?: string | null
          registration_link?: string | null
          registration_required?: boolean
          start_time?: string | null
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      faculty_invites: {
        Row: {
          code: string
          created_at: string
          department_id: string | null
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          redeemed_at: string | null
          redeemed_by: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department_id?: string | null
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department_id?: string | null
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_invites_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_subject_assignments: {
        Row: {
          assigned_at: string
          faculty_id: string
          id: string
          subject_id: string
        }
        Insert: {
          assigned_at?: string
          faculty_id: string
          id?: string
          subject_id: string
        }
        Update: {
          assigned_at?: string
          faculty_id?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_subject_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_attempts: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_sql: string | null
          question_id: string
          solved_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_sql?: string | null
          question_id: string
          solved_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_sql?: string | null
          question_id?: string
          solved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lab_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_datasets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          setup_sql: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          setup_sql: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          setup_sql?: string
        }
        Relationships: []
      }
      lab_questions: {
        Row: {
          created_at: string
          dataset_key: string
          difficulty: string
          expected_ordered: boolean
          expected_output: Json
          hint: string | null
          id: string
          is_published: boolean
          question_number: number
          solution: string | null
          statement: string
          title: string
          topic: string
        }
        Insert: {
          created_at?: string
          dataset_key: string
          difficulty: string
          expected_ordered?: boolean
          expected_output: Json
          hint?: string | null
          id?: string
          is_published?: boolean
          question_number: number
          solution?: string | null
          statement: string
          title: string
          topic: string
        }
        Update: {
          created_at?: string
          dataset_key?: string
          difficulty?: string
          expected_ordered?: boolean
          expected_output?: Json
          hint?: string | null
          id?: string
          is_published?: boolean
          question_number?: number
          solution?: string | null
          statement?: string
          title?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_questions_dataset_key_fkey"
            columns: ["dataset_key"]
            isOneToOne: false
            referencedRelation: "lab_datasets"
            referencedColumns: ["key"]
          },
        ]
      }
      marks: {
        Row: {
          assessment_id: string
          created_at: string
          entered_by: string | null
          faculty_comment: string | null
          id: string
          obtained_marks: number | null
          remarks: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          entered_by?: string | null
          faculty_comment?: string | null
          id?: string
          obtained_marks?: number | null
          remarks?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          entered_by?: string | null
          faculty_comment?: string | null
          id?: string
          obtained_marks?: number | null
          remarks?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      note_summaries: {
        Row: {
          created_at: string
          id: string
          note_id: string
          summary: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          summary: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          summary?: Json
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          is_shared: boolean
          student_id: string | null
          subject_code: string | null
          subject_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number
          file_type: string
          file_url: string
          id?: string
          is_shared?: boolean
          student_id?: string | null
          subject_code?: string | null
          subject_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          is_shared?: boolean
          student_id?: string | null
          subject_code?: string | null
          subject_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          student_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          student_id: string
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          student_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          college_name: string | null
          created_at: string
          deleted_at: string | null
          department: string | null
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          must_change_password: boolean
          role_updated_by: string | null
          roll_number: string | null
          section: string | null
          semester: number | null
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          college_name?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          must_change_password?: boolean
          role_updated_by?: string | null
          roll_number?: string | null
          section?: string | null
          semester?: number | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          college_name?: string | null
          created_at?: string
          deleted_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          role_updated_by?: string | null
          roll_number?: string | null
          section?: string | null
          semester?: number | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_assignments: {
        Row: {
          created_at: string
          id: string
          quiz_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_assignments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "ai_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempt_no: number
          auto_score: number | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          manual_score: number | null
          quiz_id: string
          score: number | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string
          total: number | null
        }
        Insert: {
          answers?: Json
          attempt_no?: number
          auto_score?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          manual_score?: number | null
          quiz_id: string
          score?: number | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string
          total?: number | null
        }
        Update: {
          answers?: Json
          attempt_no?: number
          auto_score?: number | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          manual_score?: number | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "ai_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          created_at: string
          filters: Json
          format: string
          generated_by_name: string | null
          id: string
          kind: string
          name: string
          role: string
          row_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          format: string
          generated_by_name?: string | null
          id?: string
          kind: string
          name: string
          role: string
          row_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          format?: string
          generated_by_name?: string | null
          id?: string
          kind?: string
          name?: string
          role?: string
          row_count?: number
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          department_id: string
          id: string
          name: string
          semester: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          name: string
          semester: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          name?: string
          semester?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          goals: string | null
          id: string
          is_favorite: boolean
          plan: Json
          title: string
          updated_at: string
          user_id: string
          weekly_hours: number | null
        }
        Insert: {
          created_at?: string
          goals?: string | null
          id?: string
          is_favorite?: boolean
          plan: Json
          title?: string
          updated_at?: string
          user_id: string
          weekly_hours?: number | null
        }
        Update: {
          created_at?: string
          goals?: string | null
          id?: string
          is_favorite?: boolean
          plan?: Json
          title?: string
          updated_at?: string
          user_id?: string
          weekly_hours?: number | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          credits: number | null
          department: string | null
          department_id: string | null
          description: string | null
          faculty_email: string | null
          faculty_id: string | null
          faculty_name: string | null
          id: string
          is_catalog: boolean
          semester: number | null
          status: string
          student_id: string | null
          subject_code: string | null
          subject_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number | null
          department?: string | null
          department_id?: string | null
          description?: string | null
          faculty_email?: string | null
          faculty_id?: string | null
          faculty_name?: string | null
          id?: string
          is_catalog?: boolean
          semester?: number | null
          status?: string
          student_id?: string | null
          subject_code?: string | null
          subject_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number | null
          department?: string | null
          department_id?: string | null
          description?: string | null
          faculty_email?: string | null
          faculty_id?: string | null
          faculty_name?: string | null
          id?: string
          is_catalog?: boolean
          semester?: number | null
          status?: string
          student_id?: string | null
          subject_code?: string | null
          subject_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          label: string
          sort_order: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          label: string
          sort_order?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          label?: string
          sort_order?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      timetable: {
        Row: {
          building: string | null
          created_at: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id: string
          room_number: string | null
          start_time: string
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          building?: string | null
          created_at?: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          id?: string
          room_number?: string | null
          start_time: string
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          building?: string | null
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          id?: string
          room_number?: string | null
          start_time?: string
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          catalog_subject_id: string
          classroom_id: string | null
          created_at: string
          day_of_week: string
          department_id: string
          end_time: string
          faculty_id: string | null
          id: string
          section_id: string | null
          semester: number
          start_time: string
          updated_at: string
        }
        Insert: {
          catalog_subject_id: string
          classroom_id?: string | null
          created_at?: string
          day_of_week: string
          department_id: string
          end_time: string
          faculty_id?: string | null
          id?: string
          section_id?: string | null
          semester: number
          start_time: string
          updated_at?: string
        }
        Update: {
          catalog_subject_id?: string
          classroom_id?: string | null
          created_at?: string
          day_of_week?: string
          department_id?: string
          end_time?: string
          faculty_id?: string | null
          id?: string
          section_id?: string | null
          semester?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_catalog_subject_id_fkey"
            columns: ["catalog_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assignment_overview: { Args: never; Returns: Json }
      admin_attendance_overview: { Args: never; Returns: Json }
      admin_attendance_report: {
        Args: {
          _catalog_subject_id?: string
          _department_id?: string
          _faculty_id?: string
          _from?: string
          _semester?: number
          _student_id?: string
          _to?: string
        }
        Returns: {
          catalog_subject_id: string
          class_date: string
          department_id: string
          department_name: string
          faculty_id: string
          faculty_name: string
          id: string
          semester: number
          status: string
          student_id: string
          student_name: string
          subject_code: string
          subject_name: string
        }[]
      }
      admin_catalog_subjects: {
        Args: never
        Returns: {
          created_at: string
          credits: number
          department_id: string
          department_name: string
          description: string
          faculty_email: string
          faculty_id: string
          faculty_name: string
          id: string
          semester: number
          status: string
          subject_code: string
          subject_name: string
        }[]
      }
      admin_department_stats: {
        Args: never
        Returns: {
          code: string
          created_at: string
          description: string
          faculty_count: number
          id: string
          name: string
          status: string
          student_count: number
          subject_count: number
        }[]
      }
      admin_faculty_options: {
        Args: never
        Returns: {
          department_id: string
          email: string
          full_name: string
          id: string
        }[]
      }
      admin_grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_list_faculty: {
        Args: never
        Returns: {
          college_name: string
          created_at: string
          department_id: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      admin_platform_stats: { Args: never; Returns: Json }
      admin_quiz_stats: { Args: never; Returns: Json }
      admin_results_overview: { Args: never; Returns: Json }
      admin_revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_timetable_grid: {
        Args: {
          _department_id?: string
          _faculty_id?: string
          _section_id?: string
          _semester?: number
        }
        Returns: {
          classroom_id: string
          classroom_name: string
          day_of_week: string
          department_id: string
          department_name: string
          end_time: string
          faculty_id: string
          faculty_name: string
          id: string
          section_id: string
          section_name: string
          semester: number
          start_time: string
          subject_code: string
          subject_id: string
          subject_name: string
        }[]
      }
      can_edit_event: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      can_read_assignment_attachment: {
        Args: { _path: string }
        Returns: boolean
      }
      can_read_note_file: { Args: { _path: string }; Returns: boolean }
      clear_must_change_password: { Args: never; Returns: undefined }
      faculty_assessment_students: {
        Args: { _assessment_id: string }
        Returns: {
          email: string
          faculty_comment: string
          full_name: string
          obtained_marks: number
          remarks: string
          roll_number: string
          student_id: string
        }[]
      }
      faculty_assignment_dashboard: { Args: never; Returns: Json }
      faculty_attendance_dashboard: { Args: never; Returns: Json }
      faculty_can_view_profile: {
        Args: { _faculty_id: string; _profile_id: string }
        Returns: boolean
      }
      faculty_catalog_attendance_for_date: {
        Args: { _catalog_subject_id: string; _date: string }
        Returns: {
          status: string
          student_id: string
        }[]
      }
      faculty_catalog_students: {
        Args: { _catalog_subject_id: string }
        Returns: {
          branch: string
          email: string
          full_name: string
          roll_number: string
          semester: number
          student_id: string
        }[]
      }
      faculty_catalog_subjects: {
        Args: never
        Returns: {
          department_id: string
          department_name: string
          id: string
          semester: number
          student_count: number
          subject_code: string
          subject_name: string
        }[]
      }
      faculty_dashboard_stats: { Args: never; Returns: Json }
      faculty_grade_submission: {
        Args: {
          _feedback: string
          _marks: number
          _status: string
          _submission_id: string
        }
        Returns: Json
      }
      faculty_list_assessments: {
        Args: never
        Returns: {
          assessment_date: string
          assessment_type: string
          catalog_subject_id: string
          created_at: string
          department_id: string
          department_name: string
          entered_count: number
          id: string
          max_marks: number
          publish_status: string
          semester: number
          subject_code: string
          subject_name: string
          title: string
          total_students: number
        }[]
      }
      faculty_list_assignments: {
        Args: never
        Returns: {
          allow_late_submission: boolean
          attachment_name: string
          attachment_url: string
          catalog_subject_id: string
          created_at: string
          department_id: string
          department_name: string
          description: string
          due_date: string
          id: string
          instructions: string
          max_marks: number
          pending_review: number
          publish_status: string
          reviewed_count: number
          semester: number
          subject_code: string
          subject_name: string
          submission_count: number
          title: string
          total_students: number
        }[]
      }
      faculty_list_submissions: {
        Args: { _assignment_id: string }
        Returns: {
          feedback: string
          file_name: string
          file_url: string
          id: string
          is_late: boolean
          marks: number
          review_status: string
          reviewed_at: string
          roll_number: string
          student_comment: string
          student_email: string
          student_id: string
          student_name: string
          submitted_at: string
        }[]
      }
      faculty_my_stats: { Args: never; Returns: Json }
      faculty_my_subjects: {
        Args: never
        Returns: {
          department: string
          sample_subject_id: string
          semester: number
          student_count: number
          subject_code: string
          subject_key: string
          subject_name: string
        }[]
      }
      faculty_owns_catalog_subject: {
        Args: { _catalog_subject_id: string; _faculty_id: string }
        Returns: boolean
      }
      faculty_quiz_analytics: { Args: never; Returns: Json }
      faculty_save_catalog_attendance: {
        Args: { _catalog_subject_id: string; _date: string; _marks: Json }
        Returns: Json
      }
      faculty_save_marks: {
        Args: { _assessment_id: string; _entries: Json }
        Returns: Json
      }
      faculty_students_in_subject: {
        Args: { _subject_key: string }
        Returns: {
          branch: string
          email: string
          full_name: string
          semester: number
          student_id: string
          subject_id: string
        }[]
      }
      faculty_students_overview: {
        Args: never
        Returns: {
          attendance_percentage: number
          department_id: string
          department_name: string
          email: string
          full_name: string
          roll_number: string
          section: string
          semester: number
          student_id: string
          submissions_count: number
        }[]
      }
      get_invite_by_code: {
        Args: { _code: string }
        Returns: {
          code: string
          department_id: string
          department_name: string
          email: string
          expires_at: string
          full_name: string
          invited_by_name: string
          redeemed_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_announcements_for_me: {
        Args: never
        Returns: {
          attachment_name: string
          attachment_url: string
          audience_type: string
          catalog_subject_id: string
          created_at: string
          created_by: string
          created_by_name: string
          department_id: string
          department_name: string
          description: string
          expiry_date: string
          id: string
          is_pinned: boolean
          priority: Database["public"]["Enums"]["announcement_priority"]
          publish_date: string
          publish_status: string
          subject_name: string
          target_semester: number
          title: string
        }[]
      }
      redeem_faculty_invite: { Args: { _code: string }; Returns: Json }
      redeem_pending_faculty_invite_for_me: { Args: never; Returns: Json }
      student_attendance_recent: {
        Args: { _limit?: number }
        Returns: {
          class_date: string
          id: string
          marked_at: string
          status: string
          subject_code: string
          subject_name: string
        }[]
      }
      student_attendance_summary: {
        Args: never
        Returns: {
          absent_count: number
          catalog_subject_id: string
          percentage: number
          present_count: number
          subject_code: string
          subject_name: string
          total_classes: number
        }[]
      }
      student_list_assignments: {
        Args: never
        Returns: {
          allow_late_submission: boolean
          attachment_name: string
          attachment_url: string
          description: string
          due_date: string
          faculty_name: string
          feedback: string
          file_name: string
          file_url: string
          id: string
          instructions: string
          marks: number
          max_marks: number
          publish_status: string
          review_status: string
          student_comment: string
          subject_code: string
          subject_name: string
          submission_id: string
          submitted_at: string
          title: string
        }[]
      }
      student_my_results: {
        Args: never
        Returns: {
          assessment_date: string
          assessment_id: string
          assessment_title: string
          assessment_type: string
          catalog_subject_id: string
          faculty_comment: string
          faculty_name: string
          max_marks: number
          obtained_marks: number
          remarks: string
          subject_code: string
          subject_name: string
        }[]
      }
      student_my_subjects: {
        Args: never
        Returns: {
          credits: number
          department_id: string
          department_name: string
          description: string
          faculty_id: string
          faculty_name: string
          id: string
          semester: number
          subject_code: string
          subject_name: string
        }[]
      }
      student_quiz_detail: {
        Args: { _quiz_id: string }
        Returns: {
          attempts_allowed: number
          difficulty: string
          due_at: string
          id: string
          publish_at: string
          question_count: number
          questions: Json
          randomize_options: boolean
          shuffle_questions: boolean
          status: string
          subject_label: string
          time_limit_minutes: number
          title: string
          topic: string
        }[]
      }
      student_quiz_entitled: { Args: { _quiz_id: string }; Returns: boolean }
      student_quiz_list: {
        Args: never
        Returns: {
          attempts_allowed: number
          attempts_used: number
          best_score: number
          best_total: number
          created_by: string
          difficulty: string
          due_at: string
          faculty_name: string
          id: string
          last_status: string
          publish_at: string
          question_count: number
          subject_label: string
          time_limit_minutes: number
          title: string
          topic: string
        }[]
      }
      student_submit_assignment: {
        Args: {
          _assignment_id: string
          _comment: string
          _file_name: string
          _file_url: string
        }
        Returns: Json
      }
      timetable_for_faculty: {
        Args: never
        Returns: {
          classroom_building: string
          classroom_id: string
          classroom_name: string
          day_of_week: string
          department_id: string
          department_name: string
          end_time: string
          id: string
          section_id: string
          section_name: string
          semester: number
          start_time: string
          subject_code: string
          subject_id: string
          subject_name: string
        }[]
      }
      timetable_for_student: {
        Args: never
        Returns: {
          classroom_building: string
          classroom_id: string
          classroom_name: string
          day_of_week: string
          end_time: string
          faculty_id: string
          faculty_name: string
          id: string
          section_id: string
          section_name: string
          start_time: string
          subject_code: string
          subject_id: string
          subject_name: string
        }[]
      }
    }
    Enums: {
      announcement_category:
        | "Academic"
        | "Examination"
        | "Placement"
        | "Workshop"
        | "Holiday"
        | "General"
      announcement_priority: "High" | "Medium" | "Low"
      app_role: "student" | "faculty" | "admin" | "parent"
      assignment_priority: "Low" | "Medium" | "High"
      assignment_status: "Pending" | "In Progress" | "Completed"
      day_of_week:
        | "Monday"
        | "Tuesday"
        | "Wednesday"
        | "Thursday"
        | "Friday"
        | "Saturday"
        | "Sunday"
      event_category:
        | "Workshop"
        | "Seminar"
        | "Hackathon"
        | "Placement Drive"
        | "Cultural"
        | "Sports"
        | "General"
      notification_type:
        | "Announcement"
        | "Assignment"
        | "Attendance"
        | "Event"
        | "System"
        | "Quiz"
      profile_status: "active" | "inactive" | "deleted"
      reminder_type:
        | "1 day before"
        | "3 days before"
        | "7 days before"
        | "Custom"
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
      announcement_category: [
        "Academic",
        "Examination",
        "Placement",
        "Workshop",
        "Holiday",
        "General",
      ],
      announcement_priority: ["High", "Medium", "Low"],
      app_role: ["student", "faculty", "admin", "parent"],
      assignment_priority: ["Low", "Medium", "High"],
      assignment_status: ["Pending", "In Progress", "Completed"],
      day_of_week: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      event_category: [
        "Workshop",
        "Seminar",
        "Hackathon",
        "Placement Drive",
        "Cultural",
        "Sports",
        "General",
      ],
      notification_type: [
        "Announcement",
        "Assignment",
        "Attendance",
        "Event",
        "System",
        "Quiz",
      ],
      profile_status: ["active", "inactive", "deleted"],
      reminder_type: [
        "1 day before",
        "3 days before",
        "7 days before",
        "Custom",
      ],
    },
  },
} as const
