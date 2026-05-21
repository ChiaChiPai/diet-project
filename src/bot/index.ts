import { Bot, InlineKeyboard } from 'grammy'
import type { Env } from '../types'
import { createClient } from '../lib/supabase'
import { createAuthMiddleware } from './middleware/auth'
import { handleAddUser, handleRemoveUser } from './commands/admin'
import { handleWeight } from './commands/weight'
import { handleSport } from './commands/sport'
import { handleToday } from './commands/today'
import { handleReport } from './commands/report'
import { handleEdit } from './commands/edit'
import { handlePhoto } from './handlers/photo'

function confirmKeyboard(mealLogId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('正確 ✓', `ok:${mealLogId}`)
    .text('修改 ✏️', `ed:${mealLogId}`)
}

export function setupBot(bot: Bot, env: Env): void {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  const adminChatId = parseInt(env.ADMIN_CHAT_ID, 10)

  // Admin commands — no auth gate
  bot.command('adduser', ctx => handleAddUser(ctx, supabase, adminChatId))
  bot.command('removeuser', ctx => handleRemoveUser(ctx, supabase, adminChatId))

  // Auth middleware for all subsequent handlers
  bot.use(createAuthMiddleware(supabase))

  // Commands
  bot.command('weight', ctx => handleWeight(ctx, supabase))
  bot.command('sport', ctx => handleSport(ctx, supabase))
  bot.command('today', ctx => handleToday(ctx, supabase))
  bot.command('report', ctx => handleReport(ctx, supabase, env.REPORT_BASE_URL))
  bot.command('edit', ctx => handleEdit(ctx, supabase))

  // Photo → Gemini → meal type selection
  bot.on('message:photo', ctx => handlePhoto(ctx, supabase, env.GEMINI_API_KEY))

  // Meal type selected (callback: mt:{mealType}:{mealLogId})
  bot.callbackQuery(/^mt:/, async ctx => {
    const [, mealType, mealLogId] = ctx.callbackQuery.data.split(':')

    // Update meal_log with selected meal type
    await supabase
      .from('meal_logs')
      .update({ meal_type: mealType })
      .eq('id', mealLogId)
      .eq('user_id', ctx.from.id)

    const { data: meal } = await supabase
      .from('meal_logs')
      .select('description')
      .eq('id', mealLogId)
      .single()

    const description = meal?.description || '（無描述）'
    const mealLabel = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' }[mealType] ?? mealType

    await ctx.answerCallbackQuery()
    await ctx.reply(
      `${mealLabel}：${description}\n記錄成功！內容有誤嗎？`,
      { reply_markup: confirmKeyboard(mealLogId) }
    )
  })

  // User confirms meal log (callback: ok:{mealLogId})
  bot.callbackQuery(/^ok:/, async ctx => {
    const mealLogId = ctx.callbackQuery.data.slice(3)

    await supabase
      .from('meal_logs')
      .update({ confirmed: true })
      .eq('id', mealLogId)
      .eq('user_id', ctx.from.id)

    await ctx.answerCallbackQuery()
    await ctx.reply('記錄完成 ✓')
  })

  // User requests edit after Gemini analysis (callback: ed:{mealLogId})
  bot.callbackQuery(/^ed:/, async ctx => {
    const mealLogId = ctx.callbackQuery.data.slice(3)

    // Store edit session in Supabase
    await supabase.from('bot_sessions').upsert({
      user_id: ctx.from.id,
      state: 'awaiting_correction',
      data: { meal_log_id: mealLogId },
      updated_at: new Date().toISOString(),
    })

    await ctx.answerCallbackQuery()
    await ctx.reply('請輸入正確的飲食內容：')
  })

  // User selects a confirmed meal to edit (/edit flow, callback: sedit:{mealLogId})
  bot.callbackQuery(/^sedit:/, async ctx => {
    const mealLogId = ctx.callbackQuery.data.slice(6)

    await supabase.from('bot_sessions').upsert({
      user_id: ctx.from.id,
      state: 'awaiting_correction',
      data: { meal_log_id: mealLogId },
      updated_at: new Date().toISOString(),
    })

    await ctx.answerCallbackQuery()
    await ctx.reply('請輸入正確的飲食內容：')
  })

  // Text messages — check if user is in correction state
  bot.on('message:text', async (ctx, next) => {
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('state, data')
      .eq('user_id', ctx.from.id)
      .single()

    if (session?.state === 'awaiting_correction') {
      const mealLogId = (session.data as { meal_log_id: string }).meal_log_id
      const newDescription = ctx.message.text

      await supabase
        .from('meal_logs')
        .update({ description: newDescription, confirmed: true })
        .eq('id', mealLogId)
        .eq('user_id', ctx.from.id)

      // Clear session
      await supabase.from('bot_sessions').delete().eq('user_id', ctx.from.id)

      await ctx.reply('已更新 ✓')
      return
    }

    await next()
  })
}
