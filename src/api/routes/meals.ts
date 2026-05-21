import { Hono } from 'hono'
import type { SupabaseClient } from '../../lib/supabase'
import type { MealType, GeminiAnalysis } from '../../types'

export function createMealsRouter(supabase: SupabaseClient) {
  const router = new Hono()

  // Create a new pending meal log (returns id for callback_data)
  router.post('/', async (c) => {
    const { user_id, date, meal_type, description, photo_url, gemini_analysis, confirmed } =
      await c.req.json<{
        user_id: number
        date: string
        meal_type?: MealType | null
        description?: string
        photo_url?: string | null
        gemini_analysis?: GeminiAnalysis | null
        confirmed?: boolean
      }>()

    const { data, error } = await supabase
      .from('meal_logs')
      .insert({
        user_id,
        date,
        meal_type: meal_type ?? null,
        description: description ?? '',
        photo_url: photo_url ?? null,
        gemini_analysis: gemini_analysis ?? null,
        confirmed: confirmed ?? false,
      })
      .select('id')
      .single()

    if (error) return c.json({ error: error.message }, 500)
    return c.json({ id: data.id })
  })

  // Update meal (meal_type, description, confirmed)
  router.patch('/:id', async (c) => {
    const id = c.req.param('id')
    const patch = await c.req.json<Partial<{ meal_type: MealType; description: string; confirmed: boolean }>>()

    const { error } = await supabase.from('meal_logs').update(patch).eq('id', id)
    if (error) return c.json({ error: error.message }, 500)

    return c.json({ ok: true })
  })

  return router
}
