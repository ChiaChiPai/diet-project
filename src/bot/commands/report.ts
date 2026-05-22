import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { nanoid } from 'nanoid'

export async function handleReport(
  ctx: Context,
  supabase: SupabaseClient,
  reportBaseUrl: string
): Promise<void> {
  const userId = ctx.from!.id
  const dateTo = new Date().toISOString().slice(0, 10)
  const dateFrom = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const token = nanoid(32)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

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
