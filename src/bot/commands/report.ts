import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'

export async function handleReport(
  ctx: Context,
  supabase: SupabaseClient,
  reportBaseUrl: string
): Promise<void> {
  const res = await fetch(`${reportBaseUrl.replace(/\/report.*/, '')}/api/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: ctx.from!.id }),
  })

  if (!res.ok) {
    await ctx.reply('產生報告失敗，請稍後再試')
    return
  }

  const { url } = await res.json<{ url: string }>()
  await ctx.reply(`報告連結（48小時有效）：\n${url}`)
}
