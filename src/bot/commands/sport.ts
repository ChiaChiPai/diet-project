import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { clearSession } from '../lib/session'

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function recordSport(
  ctx: Context,
  supabase: SupabaseClient,
  exerciseType: string,
  minutes: number
): Promise<void> {
  const { error } = await supabase.from('exercise_logs').insert({
    user_id: ctx.from!.id,
    date: todayDate(),
    exercise_type: exerciseType,
    duration_minutes: minutes,
  })

  if (error) {
    await ctx.reply('記錄失敗，請稍後再試')
    return
  }

  await ctx.reply(`${exerciseType} ${minutes} 分鐘記錄成功 ✓`)
}

export async function handleSport(ctx: Context, supabase: SupabaseClient): Promise<void> {
  await clearSession(ctx.from!.id, supabase)
  // /sport 跑步 30  →  parts = ['/sport', '跑步', '30']
  const parts = ctx.message?.text?.split(' ') ?? []

  if (parts.length < 3) {
    await supabase.from('bot_sessions').upsert({
      user_id: ctx.from!.id,
      state: 'awaiting_sport',
      data: {},
      updated_at: new Date().toISOString(),
    })
    await ctx.reply('請輸入運動類型和時間，例如：跑步 30')
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
