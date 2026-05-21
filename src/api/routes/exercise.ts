import { Hono } from 'hono'
import type { SupabaseClient } from '../../lib/supabase'

export function createExerciseRouter(supabase: SupabaseClient) {
  const router = new Hono()

  router.post('/', async (c) => {
    const { user_id, date, exercise_type, duration_minutes } = await c.req.json<{
      user_id: number
      date: string
      exercise_type: string
      duration_minutes: number
    }>()

    const { error } = await supabase
      .from('exercise_logs')
      .insert({ user_id, date, exercise_type, duration_minutes })
    if (error) return c.json({ error: error.message }, 500)

    return c.json({ ok: true })
  })

  return router
}
