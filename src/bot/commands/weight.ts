import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function handleWeight(ctx: Context, supabase: SupabaseClient): Promise<void> {
  const parts = ctx.message?.text?.split(' ') ?? []
  const kg = parseFloat(parts[1] ?? '')

  if (isNaN(kg)) {
    await ctx.reply('格式：/weight 65.2')
    return
  }

  const { error } = await supabase
    .from('weight_logs')
    .upsert({ user_id: ctx.from!.id, date: todayDate(), kg })

  if (error) {
    await ctx.reply('記錄失敗，請稍後再試')
    return
  }

  await ctx.reply(`體重 ${kg}kg 記錄成功 ✓`)
}
