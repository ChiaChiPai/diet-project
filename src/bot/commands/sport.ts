import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function handleSport(ctx: Context, supabase: SupabaseClient): Promise<void> {
  // /sport 跑步 30  →  parts = ['/sport', '跑步', '30']
  // /sport 重量訓練 60  →  parts = ['/sport', '重量訓練', '60']
  const parts = ctx.message?.text?.split(' ') ?? []

  if (parts.length < 3) {
    await ctx.reply('格式：/sport 跑步 30')
    return
  }

  const minutes = parseInt(parts[parts.length - 1], 10)
  if (isNaN(minutes)) {
    await ctx.reply('格式：/sport 跑步 30')
    return
  }

  const exerciseType = parts.slice(1, parts.length - 1).join(' ')

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
