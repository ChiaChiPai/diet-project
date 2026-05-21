import type { Context, NextFunction } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'

export function createAuthMiddleware(supabase: SupabaseClient) {
  return async (ctx: Context, next: NextFunction): Promise<void> => {
    const chatId = ctx.from?.id
    if (!chatId) return

    const { data, error } = await supabase
      .from('users')
      .select('is_allowed')
      .eq('telegram_chat_id', chatId)
      .single()

    if (error || !data?.is_allowed) return

    await next()
  }
}
