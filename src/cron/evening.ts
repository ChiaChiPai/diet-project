import type { Env } from '../types'
import { createClient } from '../lib/supabase'

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

// Runs at 13:00 UTC (21:00 Asia/Taipei)
export async function eveningCron(env: Env): Promise<void> {
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
  const today = new Date().toISOString().slice(0, 10)

  const { data: users } = await supabase
    .from('users')
    .select('telegram_chat_id')
    .eq('is_allowed', true)

  if (!users) return

  for (const user of users) {
    const { data: meals } = await supabase
      .from('meal_logs')
      .select('meal_type')
      .eq('user_id', user.telegram_chat_id)
      .eq('date', today)
      .eq('confirmed', true)

    const loggedTypes = new Set(meals?.map(m => m.meal_type) ?? [])
    const missing = ['breakfast', 'lunch', 'dinner'].filter(t => !loggedTypes.has(t))

    if (missing.length === 0) continue

    const missingLabel = missing.map(t => MEAL_LABELS[t]).join('、')

    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegram_chat_id,
        text: `晚上好！今天 ${missingLabel} 還沒記錄，補充一下？`,
      }),
    })
  }
}
