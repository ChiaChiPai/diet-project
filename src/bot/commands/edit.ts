import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import type { MealType } from '../../types'
import { todayTaipei } from '../../lib/date'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
}

export async function handleEdit(ctx: Context, supabase: SupabaseClient): Promise<void> {
  const userId = ctx.from!.id
  const today = todayTaipei()

  const { data: meals } = await supabase
    .from('meal_logs')
    .select('id, meal_type, description')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('confirmed', true)

  if (!meals || meals.length === 0) {
    await ctx.reply('今日尚無已確認的飲食記錄')
    return
  }

  const keyboard = new InlineKeyboard()
  for (const meal of meals) {
    const label = MEAL_LABELS[meal.meal_type as MealType] ?? meal.meal_type
    const preview = (meal.description || '（無描述）').slice(0, 12)
    keyboard.text(`${label}：${preview}`, `sedit:${meal.id}`).row()
  }

  await ctx.reply('選擇要修改的餐別：', { reply_markup: keyboard })
}
