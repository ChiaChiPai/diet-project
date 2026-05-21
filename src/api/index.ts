import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from '../types'
import { createClient } from '../lib/supabase'
import { createWeightRouter } from './routes/weight'
import { createExerciseRouter } from './routes/exercise'
import { createMealsRouter } from './routes/meals'
import { createUploadRouter } from './routes/upload'
import { createReportRouter } from './routes/report'

export function createApiApp(env: Env) {
  const app = new Hono()
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)

  app.use('/*', cors({ origin: '*' }))

  app.route('/weight', createWeightRouter(supabase))
  app.route('/exercise', createExerciseRouter(supabase))
  app.route('/meals', createMealsRouter(supabase))
  app.route('/upload', createUploadRouter(supabase))
  app.route('/report', createReportRouter(supabase, env.REPORT_BASE_URL))

  return app
}
