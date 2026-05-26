import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import type { MealType } from '../../types'
import { todayTaipei } from '../../lib/date'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
}

export async function handleToday(ctx: Context, supabase: SupabaseClient): Promise<void> {
  const userId = ctx.from!.id
  const today = todayTaipei()

  const [{ data: weight }, { data: meals }, { data: exercises }] = await Promise.all([
    supabase.from('weight_logs').select('kg').eq('user_id', userId).eq('date', today).single(),
    supabase
      .from('meal_logs')
      .select('meal_type, description')
      .eq('user_id', userId)
      .eq('date', today)
      .eq('confirmed', true),
    supabase
      .from('exercise_logs')
      .select('exercise_type, duration_minutes')
      .eq('user_id', userId)
      .eq('date', today),
  ])

  const lines: string[] = [`今日紀錄（${today}）\n`]

  lines.push(`⚖️ 體重：${weight?.kg != null ? `${weight.kg}kg` : '—'}`)

  for (const type of ['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]) {
    const meal = meals?.find(m => m.meal_type === type)
    lines.push(`${MEAL_LABELS[type]}：${meal ? meal.description || '（已記錄）' : '—'}`)
  }

  if (exercises && exercises.length > 0) {
    lines.push(`🏃 運動：${exercises.map(e => `${e.exercise_type} ${e.duration_minutes}分`).join('、')}`)
  } else {
    lines.push('🏃 運動：—')
  }

  await ctx.reply(lines.join('\n'))
}
