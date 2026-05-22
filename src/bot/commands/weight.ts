import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { clearSession } from '../lib/session'

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function recordWeight(ctx: Context, supabase: SupabaseClient, kg: number): Promise<void> {
  const { error } = await supabase
    .from('weight_logs')
    .upsert({ user_id: ctx.from!.id, date: todayDate(), kg }, { onConflict: 'user_id,date' })

  if (error) {
    await ctx.reply('記錄失敗，請稍後再試')
    return
  }

  await ctx.reply(`體重 ${kg}kg 記錄成功 ✓`)
}

export async function handleWeight(ctx: Context, supabase: SupabaseClient): Promise<void> {
  await clearSession(ctx.from!.id, supabase)
  const parts = ctx.message?.text?.split(' ') ?? []
  const kg = parseFloat(parts[1] ?? '')

  if (isNaN(kg)) {
    await supabase.from('bot_sessions').upsert({
      user_id: ctx.from!.id,
      state: 'awaiting_weight',
      data: {},
      updated_at: new Date().toISOString(),
    })
    await ctx.reply('請輸入今日體重（kg），例如：65.2')
    return
  }

  await recordWeight(ctx, supabase, kg)
}
