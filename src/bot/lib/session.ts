import type { SupabaseClient } from '../../lib/supabase'

export async function clearSession(userId: number, supabase: SupabaseClient): Promise<void> {
  await supabase.from('bot_sessions').delete().eq('user_id', userId)
}
