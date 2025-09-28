export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      reports: {
        Row: {
          id: string
          title: string
          description: string | null
          latitude: number
          longitude: number
          severity: string
          status: string
          created_at: string
          updated_at: string
          reported_by: string | null
          location_name: string | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          latitude: number
          longitude: number
          severity: string
          status?: string
          created_at?: string
          updated_at?: string
          reported_by?: string | null
          location_name?: string | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          latitude?: number
          longitude?: number
          severity?: string
          status?: string
          created_at?: string
          updated_at?: string
          reported_by?: string | null
          location_name?: string | null
          tags?: string[] | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      nearby_reports: {
        Args: {
          lat: number
          lng: number
          radius_meters: number
        }
        Returns: {
          id: string
          title: string
          description: string | null
          latitude: number
          longitude: number
          severity: string
          status: string
          created_at: string
          updated_at: string
          reported_by: string | null
          location_name: string | null
          tags: string[] | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
