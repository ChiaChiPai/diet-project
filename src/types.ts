export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface GeminiAnalysis {
  foods: string[]
  estimated_calories?: number
}

export interface MealLog {
  id: string
  user_id: number
  date: string
  meal_type: MealType | null
  description: string
  photo_url: string | null
  gemini_analysis: GeminiAnalysis | null
  confirmed: boolean
  created_at: string
}

export interface WeightLog {
  id: string
  user_id: number
  date: string
  kg: number
  created_at: string
}

export interface ExerciseLog {
  id: string
  user_id: number
  date: string
  exercise_type: string
  duration_minutes: number
  created_at: string
}

export interface Env {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  TELEGRAM_BOT_TOKEN: string
  GEMINI_API_KEY: string
  ADMIN_CHAT_ID: string
  REPORT_BASE_URL: string
}
