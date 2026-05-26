# Backdate Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/date YYYY-MM-DD` command that sets a per-user date context so all subsequent records (weight, sport, meal text, meal photo) write to that date instead of today.

**Architecture:** A `user_date_context` Supabase table acts as a "sticky note" per user. A `getActiveDate(userId, supabase)` helper reads it (falling back to today). All record functions call this helper instead of `todayTaipei()`. `/date` with no args deletes the row, resetting to today.

**Tech Stack:** TypeScript, grammY (Telegram bot), Supabase (Postgres), Vitest, Cloudflare Workers

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/002_date_context.sql` | DB schema |
| Modify | `src/lib/date.ts` | Add `getActiveDate`, `isValidBackfillDate` |
| Create | `src/lib/date.test.ts` | Tests for new helpers |
| Create | `src/bot/commands/date.ts` | `/date` command handler |
| Modify | `src/bot/index.ts` | Register `/date`, update `awaiting_meal_text` + `ok:` handlers |
| Modify | `src/bot/commands/weight.ts` | Use `getActiveDate` in `recordWeight` |
| Modify | `src/bot/commands/sport.ts` | Use `getActiveDate` in `recordSport` |
| Modify | `src/bot/handlers/photo.ts` | Use `getActiveDate` in `handlePhoto` |
| Modify | `scripts/set-commands.ts` | Add `/date` to TG command list |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/002_date_context.sql`

- [ ] **Step 1: Create migration file**

```sql
create table user_date_context (
  user_id       bigint primary key references users(telegram_chat_id),
  date_override date not null
);
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Go to Supabase dashboard → SQL Editor → paste and run the migration.  
Verify table appears in Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_date_context.sql
git commit -m "feat: add user_date_context migration"
```

---

## Task 2: Date Helpers + Tests

**Files:**
- Modify: `src/lib/date.ts`
- Create: `src/lib/date.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/date.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { isValidBackfillDate, getActiveDate, todayTaipei } from './date'

describe('isValidBackfillDate', () => {
  it('rejects invalid format', () => {
    expect(isValidBackfillDate('2026/05/25')).toEqual({ valid: false, error: '格式錯誤，請用 YYYY-MM-DD' })
    expect(isValidBackfillDate('abc')).toEqual({ valid: false, error: '格式錯誤，請用 YYYY-MM-DD' })
    expect(isValidBackfillDate('2026-13-01')).toEqual({ valid: false, error: '格式錯誤，請用 YYYY-MM-DD' })
  })

  it('rejects future dates', () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    expect(isValidBackfillDate(future)).toEqual({ valid: false, error: '不可設定未來日期' })
  })

  it('rejects dates older than 30 days', () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    expect(isValidBackfillDate(old)).toEqual({ valid: false, error: '最多補記 30 天前的資料' })
  })

  it('accepts valid past dates within 30 days', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    expect(isValidBackfillDate(yesterday)).toEqual({ valid: true })
  })

  it('accepts today', () => {
    expect(isValidBackfillDate(todayTaipei())).toEqual({ valid: true })
  })
})

describe('getActiveDate', () => {
  it('returns date_override when context row exists', async () => {
    const supabase = {
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { date_override: '2026-05-24' } }) }) }) }),
    } as any
    expect(await getActiveDate(123, supabase)).toBe('2026-05-24')
  })

  it('returns today when no context row', async () => {
    const supabase = {
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
    } as any
    expect(await getActiveDate(123, supabase)).toBe(todayTaipei())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bunx vitest run src/lib/date.test.ts
```

Expected: FAIL — `isValidBackfillDate` and `getActiveDate` not exported.

- [ ] **Step 3: Implement helpers in `src/lib/date.ts`**

```ts
const TAIPEI_TZ = 'Asia/Taipei'

export function todayTaipei(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TAIPEI_TZ })
}

export function dateRangeTaipei(daysBack: number): { dateFrom: string; dateTo: string } {
  const dateTo = todayTaipei()
  const dateFrom = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toLocaleDateString('sv-SE', { timeZone: TAIPEI_TZ })
  return { dateFrom, dateTo }
}

export function isValidBackfillDate(dateStr: string): { valid: boolean; error?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false, error: '格式錯誤，請用 YYYY-MM-DD' }
  }
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: '格式錯誤，請用 YYYY-MM-DD' }
  }
  const today = todayTaipei()
  if (dateStr > today) {
    return { valid: false, error: '不可設定未來日期' }
  }
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('sv-SE', { timeZone: TAIPEI_TZ })
  if (dateStr < thirtyDaysAgo) {
    return { valid: false, error: '最多補記 30 天前的資料' }
  }
  return { valid: true }
}

import type { SupabaseClient } from './supabase'

export async function getActiveDate(userId: number, supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('user_date_context')
    .select('date_override')
    .eq('user_id', userId)
    .single()
  return data?.date_override ?? todayTaipei()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bunx vitest run src/lib/date.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/date.ts src/lib/date.test.ts
git commit -m "feat: add getActiveDate and isValidBackfillDate helpers"
```

---

## Task 3: `/date` Command + Registration

**Files:**
- Create: `src/bot/commands/date.ts`
- Modify: `src/bot/index.ts` (register command)
- Modify: `scripts/set-commands.ts` (TG command list)

- [ ] **Step 1: Create `src/bot/commands/date.ts`**

```ts
import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { isValidBackfillDate } from '../../lib/date'

export async function handleDate(ctx: Context, supabase: SupabaseClient): Promise<void> {
  const userId = ctx.from!.id
  const parts = ctx.message?.text?.trim().split(' ') ?? []
  const dateArg = parts[1]

  if (!dateArg) {
    await supabase.from('user_date_context').delete().eq('user_id', userId)
    await ctx.reply('✓ 回到今日模式')
    return
  }

  const validation = isValidBackfillDate(dateArg)
  if (!validation.valid) {
    await ctx.reply(validation.error!)
    return
  }

  await supabase
    .from('user_date_context')
    .upsert({ user_id: userId, date_override: dateArg })
  await ctx.reply(`📅 補記模式：${dateArg}，輸入 /date 回到今日`)
}
```

- [ ] **Step 2: Register `/date` in `src/bot/index.ts`**

Add import at top of `src/bot/index.ts` (alongside other command imports):

```ts
import { handleDate } from './commands/date'
```

Register after the `clearSession`-using commands block (before the photo handler):

```ts
bot.command('date', ctx => handleDate(ctx, supabase))
```

- [ ] **Step 3: Add to TG command list in `scripts/set-commands.ts`**

In the `commands` array, add after the `clear` entry:

```ts
{ command: 'date', description: '補記日期 — /date 2026-05-25 或 /date 回到今日' },
```

- [ ] **Step 4: Verify by running set-commands**

```bash
TELEGRAM_BOT_TOKEN=<your-token> bun scripts/set-commands.ts
```

Expected output: `{ ok: true, result: true }`

- [ ] **Step 5: Commit**

```bash
git add src/bot/commands/date.ts src/bot/index.ts scripts/set-commands.ts
git commit -m "feat: add /date command for backdate mode"
```

---

## Task 4: Weight Backdating

**Files:**
- Modify: `src/bot/commands/weight.ts`

- [ ] **Step 1: Update `recordWeight` to use `getActiveDate`**

Replace the entire file `src/bot/commands/weight.ts`:

```ts
import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { clearSession } from '../lib/session'
import { getActiveDate, todayTaipei } from '../../lib/date'

export async function recordWeight(ctx: Context, supabase: SupabaseClient, kg: number): Promise<void> {
  const date = await getActiveDate(ctx.from!.id, supabase)
  const { error } = await supabase
    .from('weight_logs')
    .upsert({ user_id: ctx.from!.id, date, kg }, { onConflict: 'user_id,date' })

  if (error) {
    await ctx.reply('記錄失敗，請稍後再試')
    return
  }

  const suffix = date !== todayTaipei() ? `（補記 ${date}）` : ''
  await ctx.reply(`體重 ${kg}kg 記錄成功 ✓${suffix}`)
}

export async function handleWeight(ctx: Context, supabase: SupabaseClient): Promise<void> {
  await clearSession(ctx.from!.id, supabase)
  const parts = ctx.message?.text?.split(' ') ?? []
  const kg = parseFloat(parts[1] ?? '')

  if (isNaN(kg)) {
    await supabase.from('bot_sessions').upsert({
      user_id: ctx.from!.id,
      state: 'awaiting_weight',
      data: {},
      updated_at: new Date().toISOString(),
    })
    await ctx.reply('請輸入今日體重（kg），例如：65.2')
    return
  }

  await recordWeight(ctx, supabase, kg)
}
```

- [ ] **Step 2: Manual test**

In Telegram:
1. Send `/date 2026-05-24`
2. Send `/weight 65.5`
3. Verify reply: `體重 65.5kg 記錄成功 ✓（補記 2026-05-24）`
4. Check Supabase `weight_logs` — row has `date = 2026-05-24`
5. Send `/date` (reset)
6. Send `/weight 66`
7. Verify reply: `體重 66kg 記錄成功 ✓` (no suffix)

- [ ] **Step 3: Commit**

```bash
git add src/bot/commands/weight.ts
git commit -m "feat: weight records respect active date context"
```

---

## Task 5: Sport Backdating

**Files:**
- Modify: `src/bot/commands/sport.ts`

- [ ] **Step 1: Update `recordSport` to use `getActiveDate`**

Replace the entire file `src/bot/commands/sport.ts`:

```ts
import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { clearSession } from '../lib/session'
import { getActiveDate, todayTaipei } from '../../lib/date'

export async function recordSport(
  ctx: Context,
  supabase: SupabaseClient,
  exerciseType: string,
  minutes: number
): Promise<void> {
  const date = await getActiveDate(ctx.from!.id, supabase)
  const { error } = await supabase.from('exercise_logs').insert({
    user_id: ctx.from!.id,
    date,
    exercise_type: exerciseType,
    duration_minutes: minutes,
  })

  if (error) {
    await ctx.reply('記錄失敗，請稍後再試')
    return
  }

  const suffix = date !== todayTaipei() ? `（補記 ${date}）` : ''
  await ctx.reply(`${exerciseType} ${minutes} 分鐘記錄成功 ✓${suffix}`)
}

export async function handleSport(ctx: Context, supabase: SupabaseClient): Promise<void> {
  await clearSession(ctx.from!.id, supabase)
  const parts = ctx.message?.text?.split(' ') ?? []

  if (parts.length < 3) {
    await supabase.from('bot_sessions').upsert({
      user_id: ctx.from!.id,
      state: 'awaiting_sport',
      data: {},
      updated_at: new Date().toISOString(),
    })
    await ctx.reply('請輸入運動類型和時間，例如：跑步 30')
    return
  }

  const minutes = parseInt(parts[parts.length - 1], 10)
  if (isNaN(minutes)) {
    await ctx.reply('格式：/sport 跑步 30')
    return
  }

  const exerciseType = parts.slice(1, parts.length - 1).join(' ')
  await recordSport(ctx, supabase, exerciseType, minutes)
}
```

- [ ] **Step 2: Manual test**

In Telegram:
1. Send `/date 2026-05-24`
2. Send `/sport 跑步 30`
3. Verify reply: `跑步 30 分鐘記錄成功 ✓（補記 2026-05-24）`
4. Check Supabase `exercise_logs` — row has `date = 2026-05-24`

- [ ] **Step 3: Commit**

```bash
git add src/bot/commands/sport.ts
git commit -m "feat: sport records respect active date context"
```

---

## Task 6: Meal Text Backdating

**Files:**
- Modify: `src/bot/index.ts` (two spots: `awaiting_meal_text` handler + `ok:` callback)

- [ ] **Step 1: Add import in `src/bot/index.ts`**

At the top of `src/bot/index.ts`, add `getActiveDate` and `todayTaipei` to the date import:

```ts
import { getActiveDate, todayTaipei } from '../lib/date'
```

(Replace the existing `import { todayTaipei } from '../lib/date'` line.)

- [ ] **Step 2: Update `awaiting_meal_text` handler in `src/bot/index.ts`**

Find the `awaiting_meal_text` block (around line 291–313). Replace it:

```ts
if (session?.state === 'awaiting_meal_text') {
  const { meal_type } = session.data as { meal_type: string }
  const date = await getActiveDate(ctx.from.id, supabase)

  await supabase.from('meal_logs').delete()
    .eq('user_id', ctx.from.id)
    .eq('date', date)
    .eq('meal_type', meal_type)
    .eq('confirmed', true)

  await supabase.from('meal_logs').insert({
    user_id: ctx.from.id,
    date,
    meal_type,
    description: ctx.message.text,
    confirmed: true,
    photo_url: null,
  })

  await supabase.from('bot_sessions').delete().eq('user_id', ctx.from.id)
  const suffix = date !== todayTaipei() ? `（補記 ${date}）` : ''
  await ctx.reply(`記錄完成 ✓${suffix}`)
  return
}
```

- [ ] **Step 3: Update `ok:` callback in `src/bot/index.ts` to show date suffix**

Find the `ok:` callback handler (around line 163–194). After the `confirmed: true` update, replace the final reply:

```ts
// After the update query, find this line:
await ctx.reply('記錄完成 ✓')

// Replace with:
const suffix = meal && meal.date !== todayTaipei() ? `（補記 ${meal.date}）` : ''
await ctx.reply(`記錄完成 ✓${suffix}`)
```

Note: `meal` is already queried above in the `ok:` handler as `const { data: meal } = await supabase.from('meal_logs').select('meal_type, date')...`

- [ ] **Step 4: Manual test**

In Telegram:
1. Send `/date 2026-05-24`
2. Send `/meal` → select 晚餐
3. Type `牛肉麵`
4. Verify reply: `記錄完成 ✓（補記 2026-05-24）`
5. Check Supabase `meal_logs` — row has `date = 2026-05-24`

- [ ] **Step 5: Commit**

```bash
git add src/bot/index.ts
git commit -m "feat: meal text records respect active date context"
```

---

## Task 7: Photo Backdating

**Files:**
- Modify: `src/bot/handlers/photo.ts`

- [ ] **Step 1: Update `handlePhoto` to use `getActiveDate`**

Replace the entire file `src/bot/handlers/photo.ts`:

```ts
import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { analyzeFood } from '../../lib/gemini'
import type { GeminiAnalysis } from '../../types'
import { getActiveDate } from '../../lib/date'

export const MEAL_SELECT_LABELS = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '點心',
} as const

export function buildDetectionCaption(analysis: GeminiAnalysis): string {
  const foodList = analysis.foods.length > 0 ? analysis.foods.join('、') : null
  return foodList
    ? `偵測到：${foodList} 🍱\n這是哪餐？`
    : '無法辨識食物內容，請輸入餐點名稱後再選擇餐別\n這是哪餐？'
}

function makeMealKeyboard(mealLogId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('早餐', `mt:breakfast:${mealLogId}`)
    .text('午餐', `mt:lunch:${mealLogId}`)
    .row()
    .text('晚餐', `mt:dinner:${mealLogId}`)
    .text('點心', `mt:snack:${mealLogId}`)
}

export async function handlePhoto(
  ctx: Context,
  supabase: SupabaseClient,
  geminiApiKey: string
): Promise<void> {
  const photo = ctx.message?.photo?.at(-1)
  if (!photo) return

  const userId = ctx.from!.id
  const date = await getActiveDate(userId, supabase)

  await ctx.reply('分析中... ⏳')

  const file = await ctx.api.getFile(photo.file_id)
  const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`
  const imageResponse = await fetch(fileUrl)
  const imageBuffer = await imageResponse.arrayBuffer()

  const fileName = `${userId}/${Date.now()}.jpg`
  const { data: uploadData } = await supabase.storage
    .from('meal-photos')
    .upload(fileName, imageBuffer, { contentType: 'image/jpeg', upsert: false })

  const photoUrl = uploadData
    ? supabase.storage.from('meal-photos').getPublicUrl(fileName).data.publicUrl
    : null

  const analysis = await analyzeFood(imageBuffer, geminiApiKey)

  const { data: mealLog, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      date,
      meal_type: null,
      description: analysis.foods.join('、'),
      photo_url: photoUrl,
      gemini_analysis: analysis,
      confirmed: false,
    })
    .select('id')
    .single()

  if (error || !mealLog) {
    await ctx.reply('記錄失敗，請稍後再試')
    return
  }

  const caption = buildDetectionCaption(analysis)
  await ctx.reply(caption, { reply_markup: makeMealKeyboard(mealLog.id) })
}
```

- [ ] **Step 2: Manual test**

In Telegram:
1. Send `/date 2026-05-24`
2. Send a food photo directly
3. Select meal type
4. Click 正確 ✓
5. Verify reply: `記錄完成 ✓（補記 2026-05-24）`
6. Check Supabase `meal_logs` — row has `date = 2026-05-24`

- [ ] **Step 3: Commit**

```bash
git add src/bot/handlers/photo.ts
git commit -m "feat: photo meal records respect active date context"
```

---

## Task 8: Full Flow Manual Test

- [ ] **Step 1: Set date and record everything**

```
/date 2026-05-23
/weight 65.2           → 體重 65.2kg 記錄成功 ✓（補記 2026-05-23）
/sport 跑步 30         → 跑步 30 分鐘記錄成功 ✓（補記 2026-05-23）
/meal → 早餐 → 吐司    → 記錄完成 ✓（補記 2026-05-23）
(send food photo) → select 午餐 → 正確 ✓ → 記錄完成 ✓（補記 2026-05-23）
```

- [ ] **Step 2: Verify Supabase rows**

In Supabase Table Editor, check `weight_logs`, `exercise_logs`, `meal_logs` — all rows have `date = 2026-05-23`.

- [ ] **Step 3: Reset and verify today still works**

```
/date                  → ✓ 回到今日模式
/weight 65.5           → 體重 65.5kg 記錄成功 ✓  (no suffix)
```

- [ ] **Step 4: Test validation**

```
/date 2099-01-01       → 不可設定未來日期
/date abc              → 格式錯誤，請用 YYYY-MM-DD
/date 2020-01-01       → 最多補記 30 天前的資料
```

- [ ] **Step 5: Final commit if anything adjusted**

```bash
git add -A
git commit -m "feat: backdate recording complete"
```
