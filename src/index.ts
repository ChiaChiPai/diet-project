import { Bot, webhookCallback } from 'grammy'
import { setupBot } from './bot/index'
import { createApiApp } from './api/index'
import { morningCron } from './cron/morning'
import { eveningCron } from './cron/evening'
import type { Env } from './types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/webhook' && request.method === 'POST') {
      const bot = new Bot(env.TELEGRAM_BOT_TOKEN)
      setupBot(bot, env)
      const handler = webhookCallback(bot, 'cloudflare-mod')
      return handler(request)
    }

    if (url.pathname.startsWith('/api')) {
      const app = createApiApp(env)
      // Strip /api prefix
      const stripped = new Request(
        request.url.replace(/\/api/, ''),
        request
      )
      return app.fetch(stripped, env)
    }

    return new Response('Diet Tracker Bot', { status: 200 })
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const hour = new Date(event.scheduledTime).getUTCHours()
    if (hour === 22) await morningCron(env)
    if (hour === 13) await eveningCron(env)
  },
}
