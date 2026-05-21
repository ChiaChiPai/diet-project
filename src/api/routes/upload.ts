import { Hono } from 'hono'
import type { SupabaseClient } from '../../lib/supabase'

// Telegram already compresses photos; we re-upload as-is to Supabase Storage
export function createUploadRouter(supabase: SupabaseClient) {
  const router = new Hono()

  router.post('/', async (c) => {
    const formData = await c.req.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('user_id') as string | null

    if (!file || !userId) return c.json({ error: 'Missing file or user_id' }, 400)

    const fileName = `${userId}/${Date.now()}.jpg`
    const buffer = await file.arrayBuffer()

    const { error } = await supabase.storage
      .from('meal-photos')
      .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: false })

    if (error) return c.json({ error: error.message }, 500)

    const { data } = supabase.storage.from('meal-photos').getPublicUrl(fileName)
    return c.json({ url: data.publicUrl })
  })

  return router
}
