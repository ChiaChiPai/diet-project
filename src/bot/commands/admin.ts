import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'

export async function handleAddUser(
  ctx: Context,
  supabase: SupabaseClient,
  adminChatId: number
): Promise<void> {
  if (ctx.from?.id !== adminChatId) return

  const parts = ctx.message?.text?.split(' ') ?? []
  if (parts.length < 3) {
    await ctx.reply('格式：/adduser <chat_id> <名稱>')
    return
  }

  const chatId = parseInt(parts[1], 10)
  const name = parts.slice(2).join(' ')

  if (isNaN(chatId)) {
    await ctx.reply('格式：/adduser <chat_id> <名稱>')
    return
  }

  const { error } = await supabase.from('users').upsert({
    telegram_chat_id: chatId,
    name,
    is_allowed: true,
  })

  if (error) {
    await ctx.reply('新增失敗，請稍後再試')
    return
  }

  await ctx.reply(`已新增：${name} (${chatId})`)
}

export async function handleRemoveUser(
  ctx: Context,
  supabase: SupabaseClient,
  adminChatId: number
): Promise<void> {
  if (ctx.from?.id !== adminChatId) return

  const parts = ctx.message?.text?.split(' ') ?? []
  if (parts.length < 2) {
    await ctx.reply('格式：/removeuser <chat_id>')
    return
  }

  const chatId = parseInt(parts[1], 10)
  if (isNaN(chatId)) {
    await ctx.reply('格式：/removeuser <chat_id>')
    return
  }

  const { data, error } = await supabase
    .from('users')
    .update({ is_allowed: false })
    .eq('telegram_chat_id', chatId)
    .select()
    .single()

  if (error || !data) {
    await ctx.reply(`找不到使用者 ${chatId}`)
    return
  }

  await ctx.reply(`已移除：${chatId}`)
}
