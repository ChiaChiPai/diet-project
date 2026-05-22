import { InlineKeyboard } from 'grammy'
import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { clearSession } from '../lib/session'

const MEAL_KEYBOARD = new InlineKeyboard()
  .text('🍳 早餐', 'mt_text:breakfast').text('🍱 午餐', 'mt_text:lunch').row()
  .text('🍜 晚餐', 'mt_text:dinner').text('🍪 點心', 'mt_text:snack')

export async function handleMeal(ctx: Context, supabase: SupabaseClient): Promise<void> {
  await clearSession(ctx.from!.id, supabase)
  await ctx.reply('請選擇餐別：', { reply_markup: MEAL_KEYBOARD })
}
