import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { isValidBackfillDate } from '../../lib/date'

export async function handleDate(ctx: Context, supabase: SupabaseClient): Promise<void> {
  const userId = ctx.from!.id
  const parts = ctx.message?.text?.trim().split(' ') ?? []
  const dateArg = parts[1]

  if (!dateArg) {
    await supabase.from('user_date_context').delete().eq('user_id', userId)
    await ctx.reply('✓ 回到今日模式')
    return
  }

  const validation = isValidBackfillDate(dateArg)
  if (!validation.valid) {
    await ctx.reply(validation.error!)
    return
  }

  await supabase
    .from('user_date_context')
    .upsert({ user_id: userId, date_override: dateArg })
  await ctx.reply(`📅 補記模式：${dateArg}，輸入 /date 回到今日`)
}
