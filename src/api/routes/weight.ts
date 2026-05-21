import { Hono } from 'hono'
import type { SupabaseClient } from '../../lib/supabase'

export function createWeightRouter(supabase: SupabaseClient) {
  const router = new Hono()

  router.post('/', async (c) => {
    const { user_id, date, kg } = await c.req.json<{ user_id: number; date: string; kg: number }>()

    const { error } = await supabase.from('weight_logs').upsert({ user_id, date, kg })
    if (error) return c.json({ error: error.message }, 500)

    return c.json({ ok: true })
  })

  return router
}
