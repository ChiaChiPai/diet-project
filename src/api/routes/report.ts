import { Hono } from 'hono'
import type { SupabaseClient } from '../../lib/supabase'
import type { MealType } from '../../types'
import { nanoid } from 'nanoid'
import { dateRangeTaipei } from '../../lib/date'

export function createReportRouter(supabase: SupabaseClient, reportBaseUrl: string) {
  const router = new Hono()

  // GET /api/report/:token — return 14-day data for nutritionist report page
  router.get('/:token', async (c) => {
    const token = c.req.param('token')

    const { data: tokenRow, error } = await supabase
      .from('report_tokens')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !tokenRow) return c.json({ error: 'Not found' }, 404)
    if (new Date(tokenRow.expires_at) < new Date()) return c.json({ error: 'Expired' }, 410)

    const [{ data: weights }, { data: meals }, { data: exercises }] = await Promise.all([
      supabase
        .from('weight_logs')
        .select('date, kg')
        .eq('user_id', tokenRow.user_id)
        .gte('date', tokenRow.date_from)
        .lte('date', tokenRow.date_to)
        .order('date'),
      supabase
        .from('meal_logs')
        .select('date, meal_type, description, photo_url')
        .eq('user_id', tokenRow.user_id)
        .eq('confirmed', true)
        .gte('date', tokenRow.date_from)
        .lte('date', tokenRow.date_to),
      supabase
        .from('exercise_logs')
        .select('date, exercise_type, duration_minutes')
        .eq('user_id', tokenRow.user_id)
        .gte('date', tokenRow.date_from)
        .lte('date', tokenRow.date_to),
    ])

    // Build day-keyed structure
    const days: Record<string, {
      weight: number | null
      meals: Partial<Record<MealType, { description: string; photo_url: string | null }>>
      exercises: Array<{ exercise_type: string; duration_minutes: number }>
    }> = {}

    for (const w of weights ?? []) {
      if (!days[w.date]) days[w.date] = { weight: null, meals: {}, exercises: [] }
      days[w.date].weight = w.kg
    }
    for (const m of meals ?? []) {
      if (!days[m.date]) days[m.date] = { weight: null, meals: {}, exercises: [] }
      if (m.meal_type) {
        days[m.date].meals[m.meal_type as MealType] = { description: m.description, photo_url: m.photo_url }
      }
    }
    for (const e of exercises ?? []) {
      if (!days[e.date]) days[e.date] = { weight: null, meals: {}, exercises: [] }
      days[e.date].exercises.push({ exercise_type: e.exercise_type, duration_minutes: e.duration_minutes })
    }

    return c.json({
      dateFrom: tokenRow.date_from,
      dateTo: tokenRow.date_to,
      weights: weights ?? [],
      days,
    })
  })

  // POST /api/report — create a report token and return URL
  router.post('/', async (c) => {
    const { user_id } = await c.req.json<{ user_id: number }>()
    const { dateTo, dateFrom } = dateRangeTaipei(13)
    const token = nanoid(32)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('report_tokens').insert({
      user_id,
      token,
      date_from: dateFrom,
      date_to: dateTo,
      expires_at: expiresAt,
    })

    if (error) return c.json({ error: error.message }, 500)

    return c.json({ url: `${reportBaseUrl}/report/${token}` })
  })

  return router
}
