import { Bot, InlineKeyboard } from 'grammy'
import type { Env } from '../types'
import { createClient } from '../lib/supabase'
import { createAuthMiddleware } from './middleware/auth'
import { handleAddUser, handleRemoveUser } from './commands/admin'
import { handleWeight, recordWeight } from './commands/weight'
import { handleSport, recordSport } from './commands/sport'
import { handleToday } from './commands/today'
import { handleReport } from './commands/report'
import { handleEdit } from './commands/edit'
import { handleMeal } from './commands/meal'
import { handleClear } from './commands/clear'
import { handleDate } from './commands/date'
import { handlePhoto, buildDetectionCaption } from './handlers/photo'
import { analyzeFood } from '../lib/gemini'
import { getActiveDate, todayTaipei } from '../lib/date'

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
  bot.command('meal', ctx => handleMeal(ctx, supabase))
  bot.command('clear', ctx => handleClear(ctx, supabase))
  bot.command('date', ctx => handleDate(ctx, supabase))

  // Photo → check if in edit flow, else Gemini → meal type selection
  bot.on('message:photo', async ctx => {
    const userId = ctx.from!.id
    const { data: session } = await supabase
      .from('bot_sessions')
      .select('state, data')
      .eq('user_id', userId)
      .single()

    if (session?.state === 'awaiting_correction') {
      const sessionData = session.data as { meal_log_id: string; source?: string }
      const mealLogId = sessionData.meal_log_id

      const { data: currentMeal } = await supabase
        .from('meal_logs')
        .select('photo_url, meal_type, date')
        .eq('id', mealLogId)
        .single()

      await ctx.reply('分析中... ⏳')

      const photo = ctx.message?.photo?.at(-1)!
      const file = await ctx.api.getFile(photo.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
      const imageBuffer = await (await fetch(fileUrl)).arrayBuffer()

      if (currentMeal?.photo_url) {
        const oldPath = currentMeal.photo_url.split('/meal-photos/')[1]
        if (oldPath) await supabase.storage.from('meal-photos').remove([oldPath])
      }

      if (currentMeal?.meal_type) {
        await supabase
          .from('meal_logs')
          .delete()
          .eq('user_id', userId)
          .eq('date', currentMeal.date)
          .eq('meal_type', currentMeal.meal_type)
          .eq('confirmed', true)
          .neq('id', mealLogId)
      }

      const fileName = `${userId}/${Date.now()}.jpg`
      const { data: uploadData } = await supabase.storage
        .from('meal-photos')
        .upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: false })

      const photoUrl = uploadData
        ? supabase.storage.from('meal-photos').getPublicUrl(fileName).data.publicUrl
        : null

      const analysis = await analyzeFood(imageBuffer, env.GEMINI_API_KEY)

      await supabase.from('bot_sessions').upsert({
        user_id: userId,
        state: 'awaiting_correction',
        data: {
          meal_log_id: mealLogId,
          source: sessionData.source,
          pending_photo_url: photoUrl,
          pending_description: analysis.foods.join('、'),
        },
        updated_at: new Date().toISOString(),
      })

      const editPhotoKeyboard = new InlineKeyboard()
        .text('正確 ✓', `eok:${mealLogId}`)
        .text('修改 ✏️', `eed:${mealLogId}`)

      await ctx.reply(buildDetectionCaption(analysis), { reply_markup: editPhotoKeyboard })
      return
    }

    await handlePhoto(ctx, supabase, env.GEMINI_API_KEY)
  })

  // Meal type selected via /meal text flow (callback: mt_text:{mealType})
  bot.callbackQuery(/^mt_text:/, async ctx => {
    const mealType = ctx.callbackQuery.data.slice(8)
    const mealLabel = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '點心' }[mealType] ?? mealType

    await supabase.from('bot_sessions').upsert({
      user_id: ctx.from.id,
      state: 'awaiting_meal_text',
      data: { meal_type: mealType },
      updated_at: new Date().toISOString(),
    })

    await ctx.answerCallbackQuery()
    await ctx.reply(`${mealLabel} — 請輸入飲食內容：`)
  })

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
    const userId = ctx.from.id

    const { data: meal } = await supabase
      .from('meal_logs')
      .select('meal_type, date')
      .eq('id', mealLogId)
      .eq('user_id', userId)
      .single()

    if (meal) {
      // Remove stale confirmed entries for same meal slot before confirming new one
      await supabase
        .from('meal_logs')
        .delete()
        .eq('user_id', userId)
        .eq('date', meal.date)
        .eq('meal_type', meal.meal_type)
        .eq('confirmed', true)
        .neq('id', mealLogId)
    }

    await supabase
      .from('meal_logs')
      .update({ confirmed: true })
      .eq('id', mealLogId)
      .eq('user_id', userId)

    await ctx.answerCallbackQuery()
    const suffix = meal && meal.date !== todayTaipei() ? `（補記 ${meal.date}）` : ''
    await ctx.reply(`記錄完成 ✓${suffix}`)
  })

  // User requests edit after Gemini analysis (callback: ed:{mealLogId})
  bot.callbackQuery(/^ed:/, async ctx => {
    const mealLogId = ctx.callbackQuery.data.slice(3)

    // Store edit session in Supabase
    await supabase.from('bot_sessions').upsert({
      user_id: ctx.from.id,
      state: 'awaiting_correction',
      data: { meal_log_id: mealLogId, source: 'post_analysis' },
      updated_at: new Date().toISOString(),
    })

    await ctx.answerCallbackQuery()
    await ctx.reply('請輸入正確的飲食內容：')
  })

  // Confirm photo replacement with AI description (callback: eok:{mealLogId})
  bot.callbackQuery(/^eok:/, async ctx => {
    const mealLogId = ctx.callbackQuery.data.slice(4)
    const userId = ctx.from.id

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('data')
      .eq('user_id', userId)
      .single()

    const sessionData = session?.data as { pending_photo_url?: string; pending_description?: string } | null

    await supabase
      .from('meal_logs')
      .update({
        photo_url: sessionData?.pending_photo_url ?? null,
        description: sessionData?.pending_description ?? '',
        confirmed: true,
      })
      .eq('id', mealLogId)
      .eq('user_id', userId)

    await supabase.from('bot_sessions').delete().eq('user_id', userId)
    await ctx.answerCallbackQuery()
    await ctx.reply('照片與內容已更新 ✓')
  })

  // Edit description after photo replacement (callback: eed:{mealLogId})
  bot.callbackQuery(/^eed:/, async ctx => {
    const mealLogId = ctx.callbackQuery.data.slice(4)
    const userId = ctx.from.id

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('data')
      .eq('user_id', userId)
      .single()

    const sessionData = session?.data as { source?: string; pending_photo_url?: string } | null

    await supabase.from('bot_sessions').upsert({
      user_id: userId,
      state: 'awaiting_correction',
      data: {
        meal_log_id: mealLogId,
        source: sessionData?.source,
        pending_photo_url: sessionData?.pending_photo_url,
      },
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
      data: { meal_log_id: mealLogId, source: 'edit_command' },
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

    if (session?.state === 'awaiting_meal_text') {
      const { meal_type } = session.data as { meal_type: string }
      const date = await getActiveDate(ctx.from.id, supabase)

      await supabase.from('meal_logs').delete()
        .eq('user_id', ctx.from.id)
        .eq('date', date)
        .eq('meal_type', meal_type)
        .eq('confirmed', true)

      await supabase.from('meal_logs').insert({
        user_id: ctx.from.id,
        date,
        meal_type,
        description: ctx.message.text,
        confirmed: true,
        photo_url: null,
      })

      await supabase.from('bot_sessions').delete().eq('user_id', ctx.from.id)
      const suffix = date !== todayTaipei() ? `（補記 ${date}）` : ''
      await ctx.reply(`記錄完成 ✓${suffix}`)
      return
    }

    if (session?.state === 'awaiting_weight') {
      const kg = parseFloat(ctx.message.text)
      if (isNaN(kg)) {
        await ctx.reply('請輸入數字，例如：65.2')
        return
      }
      await supabase.from('bot_sessions').delete().eq('user_id', ctx.from.id)
      await recordWeight(ctx, supabase, kg)
      return
    }

    if (session?.state === 'awaiting_sport') {
      const parts = ctx.message.text.trim().split(' ')
      const minutes = parseInt(parts[parts.length - 1], 10)
      if (parts.length < 2 || isNaN(minutes)) {
        await ctx.reply('格式：跑步 30')
        return
      }
      const exerciseType = parts.slice(0, parts.length - 1).join(' ')
      await supabase.from('bot_sessions').delete().eq('user_id', ctx.from.id)
      await recordSport(ctx, supabase, exerciseType, minutes)
      return
    }

    if (session?.state === 'awaiting_correction') {
      const sessionData = session.data as {
        meal_log_id: string
        source?: string
        pending_photo_url?: string
      }
      const mealLogId = sessionData.meal_log_id
      const isEditCommand = sessionData.source === 'edit_command'
      const hasPendingPhoto = 'pending_photo_url' in sessionData
      const newDescription = ctx.message.text

      const { data: currentMeal } = await supabase
        .from('meal_logs')
        .select('photo_url, meal_type, date')
        .eq('id', mealLogId)
        .single()

      // Delete current photo only when editing via /edit without a pending replacement
      if (isEditCommand && !hasPendingPhoto && currentMeal?.photo_url) {
        const oldPath = currentMeal.photo_url.split('/meal-photos/')[1]
        if (oldPath) await supabase.storage.from('meal-photos').remove([oldPath])
      }

      if (currentMeal?.meal_type) {
        await supabase
          .from('meal_logs')
          .delete()
          .eq('user_id', ctx.from.id)
          .eq('date', currentMeal.date)
          .eq('meal_type', currentMeal.meal_type)
          .eq('confirmed', true)
          .neq('id', mealLogId)
      }

      const updatePayload: Record<string, unknown> = { description: newDescription, confirmed: true }
      if (hasPendingPhoto) {
        updatePayload.photo_url = sessionData.pending_photo_url
      } else if (isEditCommand) {
        updatePayload.photo_url = null
      }

      await supabase
        .from('meal_logs')
        .update(updatePayload)
        .eq('id', mealLogId)
        .eq('user_id', ctx.from.id)

      await supabase.from('bot_sessions').delete().eq('user_id', ctx.from.id)

      await ctx.reply('已更新 ✓')
      return
    }

    await next()
  })
}
