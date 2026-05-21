import type { Env } from '../types'
import { createClient } from '../lib/supabase'

// Runs at 00:00 UTC (08:00 Asia/Taipei)
export async function morningCron(env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  const today = new Date().toISOString().slice(0, 10)

  const { data: users } = await supabase
    .from('users')
    .select('telegram_chat_id')
    .eq('is_allowed', true)

  if (!users) return

  for (const user of users) {
    const { data: weightLog } = await supabase
      .from('weight_logs')
      .select('id')
      .eq('user_id', user.telegram_chat_id)
      .eq('date', today)
      .single()

    if (weightLog) continue // already logged today

    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegram_chat_id,
        text: '早安！記得量體重 ⚖️',
      }),
    })
  }
}
