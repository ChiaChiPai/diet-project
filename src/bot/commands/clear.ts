import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { clearSession } from '../lib/session'

export async function handleClear(ctx: Context, supabase: SupabaseClient): Promise<void> {
  await clearSession(ctx.from!.id, supabase)
  await ctx.reply('已取消 ✓')
}
