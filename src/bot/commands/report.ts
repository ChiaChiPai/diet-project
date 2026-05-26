import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { nanoid } from 'nanoid'
import { dateRangeTaipei } from '../../lib/date'

export async function handleReport(
  ctx: Context,
  supabase: SupabaseClient,
  reportBaseUrl: string
): Promise<void> {
  const userId = ctx.from!.id
  const { dateTo, dateFrom } = dateRangeTaipei(6)
  const token = nanoid(32)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

  // Clean up tokens older than 30 days
  await supabase
    .from('report_tokens')
    .delete()
    .eq('user_id', userId)
    .lt('date_to', dateRangeTaipei(30).dateFrom)

  // Reuse today's token if it exists
  const { data: rows } = await supabase
    .from('report_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('date_to', dateTo)
    .limit(1)

  const existing = rows?.[0]

  if (existing) {
    await ctx.reply(`報告連結（48小時有效）：\n${reportBaseUrl}/report/${existing.token}`)
    return
  }

  const { error } = await supabase.from('report_tokens').insert({
    user_id: userId,
    token,
    date_from: dateFrom,
    date_to: dateTo,
    expires_at: expiresAt,
  })

  if (error) {
    await ctx.reply('產生報告失敗，請稍後再試')
    return
  }

  await ctx.reply(`報告連結（48小時有效）：\n${reportBaseUrl}/report/${token}`)
}
