import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { clearSession } from '../lib/session'
import { getActiveDate, todayTaipei } from '../../lib/date'

export async function recordSport(
  ctx: Context,
  supabase: SupabaseClient,
  exerciseType: string,
  minutes: number
): Promise<void> {
  const date = await getActiveDate(ctx.from!.id, supabase)
  const { error } = await supabase.from('exercise_logs').insert({
    user_id: ctx.from!.id,
    date,
    exercise_type: exerciseType,
    duration_minutes: minutes,
  })

  if (error) {
    await ctx.reply('記錄失敗，請稍後再試')
    return
  }

  const suffix = date !== todayTaipei() ? `（補記 ${date}）` : ''
  await ctx.reply(`${exerciseType} ${minutes} 分鐘記錄成功 ✓${suffix}`)
}

export async function handleSport(ctx: Context, supabase: SupabaseClient): Promise<void> {
  await clearSession(ctx.from!.id, supabase)
  const parts = ctx.message?.text?.split(' ') ?? []

  if (parts.length < 3) {
    const date = await getActiveDate(ctx.from!.id, supabase)
    const prompt = date !== todayTaipei()
      ? `補記 ${date} — 請輸入運動類型和時間，例如：跑步 30`
      : '請輸入運動類型和時間，例如：跑步 30'
    await supabase.from('bot_sessions').upsert({
      user_id: ctx.from!.id,
      state: 'awaiting_sport',
      data: {},
      updated_at: new Date().toISOString(),
    })
    await ctx.reply(prompt)
    return
  }

  const minutes = parseInt(parts[parts.length - 1], 10)
  if (isNaN(minutes)) {
    await ctx.reply('格式：/sport 跑步 30')
    return
  }

  const exerciseType = parts.slice(1, parts.length - 1).join(' ')
  await recordSport(ctx, supabase, exerciseType, minutes)
}
