import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { analyzeFood } from '../../lib/gemini'
import type { GeminiAnalysis } from '../../types'
import { todayTaipei } from '../../lib/date'

export const MEAL_SELECT_LABELS = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
} as const

export function buildDetectionCaption(analysis: GeminiAnalysis): string {
  const foodList = analysis.foods.length > 0 ? analysis.foods.join('、') : null
  return foodList
    ? `偵測到：${foodList} 🍱\n這是哪餐？`
    : '無法辨識食物內容，請輸入餐點名稱後再選擇餐別\n這是哪餐？'
}

function makeMealKeyboard(mealLogId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('早餐', `mt:breakfast:${mealLogId}`)
    .text('午餐', `mt:lunch:${mealLogId}`)
    .row()
    .text('晚餐', `mt:dinner:${mealLogId}`)
    .text('點心', `mt:snack:${mealLogId}`)
}

export async function handlePhoto(
  ctx: Context,
  supabase: SupabaseClient,
  geminiApiKey: string
): Promise<void> {
  const photo = ctx.message?.photo?.at(-1)
  if (!photo) return

  const userId = ctx.from!.id
  const today = todayTaipei()

  await ctx.reply('分析中... ⏳')

  // Download photo from Telegram
  const file = await ctx.api.getFile(photo.file_id)
  const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
  const imageResponse = await fetch(fileUrl)
  const imageBuffer = await imageResponse.arrayBuffer()

  // Upload to Supabase Storage
  const fileName = `${userId}/${Date.now()}.jpg`
  const { data: uploadData } = await supabase.storage
    .from('meal-photos')
    .upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: false })

  const photoUrl = uploadData
    ? supabase.storage.from('meal-photos').getPublicUrl(fileName).data.publicUrl
    : null

  // Analyze with Gemini
  const analysis = await analyzeFood(imageBuffer, geminiApiKey)

  // Insert pending meal_log (meal_type=null, confirmed=false)
  const { data: mealLog, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      date: today,
      meal_type: null,
      description: analysis.foods.join('、'),
      photo_url: photoUrl,
      gemini_analysis: analysis,
      confirmed: false,
    })
    .select('id')
    .single()

  if (error || !mealLog) {
    await ctx.reply('記錄失敗，請稍後再試')
    return
  }

  const caption = buildDetectionCaption(analysis)
  await ctx.reply(caption, { reply_markup: makeMealKeyboard(mealLog.id) })
}
