# Plan: /clear 指令 + Auto-cancel Session

## Context

用戶從 Telegram 指令選單選了 /weight，bot 進入 awaiting_weight 狀態。此時用戶想取消，但沒有辦法跳出這個狀態（除非輸入一個合法的數字）。需要提供取消機制。

**根本問題：** 切換指令（如從 /weight 改選 /sport）時，grammy 的 bot.command() 會執行 handleSport，但舊的 awaiting_weight 狀態仍留在 bot_sessions DB，導致下次傳文字時仍觸發舊 state。

## 方案：雙保險

### 1. Auto-cancel（最重要）

每個會設定 session state 的命令（handleWeight、handleSport）執行前，先清除舊 session。這樣從 /weight 切到 /sport 時，awaiting_weight 自動消失。

### 2. /clear 指令（明確取消）

新增 /clear 命令，用戶不想選其他指令時可以直接取消。

## 實作步驟

### Step 1：共用 clearSession utility

新建 `src/bot/lib/session.ts`：

```typescript
import type { SupabaseClient } from '../../lib/supabase'

export async function clearSession(userId: number, supabase: SupabaseClient): Promise<void> {
  await supabase.from('bot_sessions').delete().eq('user_id', userId)
}
```

### Step 2：handleWeight、handleSport 加 auto-cancel

`src/bot/commands/weight.ts` — handleWeight 開頭加：
```typescript
await clearSession(ctx.from!.id, supabase)
```

`src/bot/commands/sport.ts` — handleSport 開頭加：
```typescript
await clearSession(ctx.from!.id, supabase)
```

（在 isNaN 判斷之前，確保每次呼叫命令都先清狀態）

### Step 3：新建 /clear 命令

新建 `src/bot/commands/clear.ts`：

```typescript
import type { Context } from 'grammy'
import type { SupabaseClient } from '../../lib/supabase'
import { clearSession } from '../lib/session'

export async function handleClear(ctx: Context, supabase: SupabaseClient): Promise<void> {
  await clearSession(ctx.from!.id, supabase)
  await ctx.reply('已取消 ✓')
}
```

### Step 4：註冊指令

`src/bot/index.ts`：
- import handleClear
- 在 auth middleware 之後加 `bot.command('clear', ctx => handleClear(ctx, supabase))`

### Step 5：更新 set-commands.ts

`scripts/set-commands.ts` 的 commands 陣列加：
```typescript
{ command: 'clear', description: '取消目前操作' },
```

重新執行 `TELEGRAM_BOT_TOKEN=xxx bun scripts/set-commands.ts`。

## 修改檔案清單

| 檔案 | 動作 |
|------|------|
| `src/bot/lib/session.ts` | 新建，共用 clearSession |
| `src/bot/commands/weight.ts` | import clearSession，handleWeight 開頭呼叫 |
| `src/bot/commands/sport.ts` | import clearSession，handleSport 開頭呼叫 |
| `src/bot/commands/clear.ts` | 新建 handleClear |
| `src/bot/index.ts` | import + 註冊 bot.command('clear') |
| `scripts/set-commands.ts` | 加 /clear 到指令選單 |

## Verification

1. `bun tsc --noEmit` — 型別檢查通過
2. 手動測試：
   - 選 /weight → bot 等待輸入 → 選 /sport → bot 等待運動輸入（awaiting_weight 已清除）
   - 選 /weight → bot 等待輸入 → 傳 /clear → bot 回「已取消」→ 傳任意文字不觸發 state
3. 重跑 `set-commands.ts` 後，Telegram 選單出現 /clear
