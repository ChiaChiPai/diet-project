# 補記日期功能設計

**日期：** 2026-05-26  
**範圍：** TG bot 新增 `/date` 指令，支援將飲食/體重/運動記錄到過去日期

---

## 需求

目前所有記錄（飲食、體重、運動）硬寫 `todayTaipei()`，無法補記過去日期。  
使用者可能忘記當天記錄，需要事後補填。

---

## 設計決策

**方案：獨立 `user_date_context` table（context-date session）**

- `/date 2026-05-25` 設定補記日期，所有後續記錄寫入該日期
- `/date`（無參數）回到今日模式
- 選擇獨立 table 而非複用 `bot_sessions`，確保與 session 流程完全隔離

---

## 資料層

### 新增 migration `002_date_context.sql`

```sql
create table user_date_context (
  user_id       bigint primary key references users(telegram_chat_id),
  date_override date not null
);
```

### 新增 helper `src/lib/date.ts`

```ts
export async function getActiveDate(userId: number, supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase
    .from('user_date_context')
    .select('date_override')
    .eq('user_id', userId)
    .single()
  return data?.date_override ?? todayTaipei()
}
```

---

## `/date` 指令行為

新增 `src/bot/commands/date.ts`

| 輸入 | 行為 |
|------|------|
| `/date 2026-05-25` | upsert `user_date_context`，回覆「📅 補記模式：2026-05-25，輸入 /date 回到今日」 |
| `/date` | delete `user_date_context`，回覆「✓ 回到今日模式」 |
| 格式錯誤 | 回覆「格式錯誤，請用 YYYY-MM-DD」 |
| 未來日期 | 回覆「不可設定未來日期」 |
| 超過 30 天前 | 回覆「最多補記 30 天前的資料」 |

---

## 受影響的函式

所有 `todayTaipei()` 取日期的記錄點改為呼叫 `getActiveDate(userId, supabase)`：

| 檔案 | 函式 / handler |
|------|---------------|
| `commands/weight.ts` | `recordWeight` |
| `commands/sport.ts` | `recordSport` |
| `bot/index.ts` | `awaiting_meal_text` handler |
| `bot/index.ts` | `mt:` callback（meal type 選擇後寫入） |
| `handlers/photo.ts` | `handlePhoto` |

`/edit` 流程、`ok:` callback、`/today`、`/clear` **不受影響**。

---

## UX 提醒

非今日記錄時，所有確認訊息後綴加 `（補記 YYYY-MM-DD）`：

```
體重 65.2kg 記錄成功 ✓（補記 2026-05-25）
跑步 30 分鐘記錄成功 ✓（補記 2026-05-25）
記錄完成 ✓（補記 2026-05-25）
```

---

## Session 流程細節

**`/meal` 文字流程：**  
`mt_text:` callback 選完餐別後，從 `user_date_context` 讀取 date 存入 session data。`awaiting_meal_text` handler 從 session data 取 date，不再重查。

**照片直傳流程：**  
`handlePhoto` 直接呼叫 `getActiveDate(userId, supabase)`，不依賴 session。

---

## Edge Cases

| 情境 | 處理 |
|------|------|
| Worker 重啟 / 重新部署 | context 存 DB，仍有效 |
| 使用者忘記 `/date` 回今日 | 每筆非今日記錄都顯示補記提醒 |
| `/today` 查詢 | 繼續用 `todayTaipei()`，查今日 |
| `/clear` | 不動 `user_date_context` |

---

## 需新增至 TG command list

`scripts/set-commands.ts` 補上：
```
date — 設定補記日期（/date YYYY-MM-DD）或回到今日（/date）
```
