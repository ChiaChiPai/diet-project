# Diet Tracker — 設計文件

**日期：** 2026-05-21  
**狀態：** 已批准，待實作

---

## 目標

建立一個以 Telegram Bot 為主介面的飲食記錄工具，讓使用者輕鬆記錄三餐、點心、體重、運動，並能一鍵產生報告連結分享給營養師。

## Non-goals

- 不做卡路里精確計算
- 不做多使用者協作（只有自己用）
- 不做 web UI 的資料輸入介面（全走 Telegram）

---

## 架構

```
使用者 → Telegram Bot
              │
              ├── Hono API (Cloudflare Workers)
              │       ├── /api/entries      — 飲食記錄 CRUD
              │       ├── /api/weight       — 體重記錄
              │       ├── /api/exercise     — 運動記錄
              │       ├── /api/upload       — 照片壓縮上傳
              │       └── /api/report/:token — 唯讀報告資料
              │
              └── Supabase
                      ├── PostgreSQL   — 結構化資料
                      └── Storage      — 壓縮照片

報告頁 (Vercel) ← 營養師開連結
```

**Tech Stack：**
| 層 | 技術 |
|----|------|
| Bot framework | grammY (TypeScript) |
| API | Hono on Cloudflare Workers |
| 資料庫 | Supabase PostgreSQL |
| 照片儲存 | Supabase Storage（壓縮後上傳） |
| AI 分析 | Google Gemini Vision API (`@google/genai`) |
| 報告頁 | 靜態 HTML + Tailwind CDN，部署 Vercel |
| Cron 提醒 | Cloudflare Workers Cron Triggers |

---

## 資料模型

```sql
-- 體重
weight_logs (
  id          uuid primary key,
  user_id     text,
  date        date,
  kg          numeric(4,1),
  created_at  timestamptz
)

-- 飲食
meal_logs (
  id               uuid primary key,
  user_id          text,
  date             date,
  meal_type        text check (meal_type in ('breakfast','lunch','dinner','snack')),
  description      text,
  photo_url        text,
  gemini_analysis  jsonb,   -- { foods: string[], estimated_calories?: number }
  created_at       timestamptz
)

-- 運動
exercise_logs (
  id                uuid primary key,
  user_id           text,
  date              date,
  exercise_type     text,
  duration_minutes  int,
  created_at        timestamptz
)

-- 報告 token
report_tokens (
  id          uuid primary key,
  user_id     text,
  token       text unique,
  date_from   date,
  date_to     date,
  expires_at  timestamptz,
  created_at  timestamptz
)
```

---

## Bot 互動流程

### 照片上傳（飲食記錄）

```
使用者傳照片
  → Gemini Vision 分析
  → Bot 回覆：
      「偵測到：雞腿飯、青菜 🍱
       這是哪餐？」[早餐] [午餐] [晚餐] [點心]
  → 使用者選餐別
  → Bot 回覆：「記錄成功！內容有誤嗎？」[正確 ✓] [修改 ✏️]
  → 按「修改」→「請輸入正確的飲食內容：」
  → 使用者回傳文字 → 覆蓋 description → 「已更新 ✓」
```

### Slash 指令

```
/weight 65.2        → 記錄今日空腹體重 65.2kg ✓
/sport 跑步 30      → 記錄跑步 30 分鐘 ✓
/sport 重訓 60      → 記錄重訓 60 分鐘 ✓
/today              → 顯示今日所有紀錄摘要
/report             → 生成近 7 天報告連結（48hr 後過期）
/edit               → 修改今天某筆記錄
```

---

## 提醒機制

Cloudflare Workers Cron Triggers：

| 時間 | 觸發條件 | 訊息 |
|------|----------|------|
| 每日 08:00 | 今日體重未記錄 | 「早安！記得量體重 ⚖️」 |
| 每日 21:00 | 某餐未記錄 | 「晚上好！今天午餐還沒記錄，補充一下？」 |

---

## 報告頁

**URL：** `https://diet-report.vercel.app/report/:token`  
**有效期：** 48 小時  
**存取：** 公開唯讀，無需登入

**頁面結構：**

```
[使用者名稱] 的飲食紀錄 | 2026/05/15 – 05/21

體重趨勢 📊
[Chart.js 折線圖：7天體重變化]

─── 2026/05/21（四）───
⚖️ 空腹體重：65.2kg
🏃 運動：跑步 30 分鐘

🍳 早餐：雞蛋、吐司、牛奶
   [照片縮圖]
🍱 午餐：雞腿飯、青菜
   [照片縮圖]
🍜 晚餐：麵條、豆腐
   [照片縮圖]

─── 2026/05/20（三）───
...
```

技術：純 HTML + Tailwind CDN + Chart.js CDN。報告資料由 `/api/report/:token` 回傳 JSON，fetch 後前端 render。

---

## 照片處理

1. 使用者透過 Telegram 傳照片
2. Bot 下載原始檔
3. Hono API 用 `sharp` 壓縮（max 1200px，quality 80%）
4. 上傳至 Supabase Storage
5. 儲存 URL 到 `meal_logs.photo_url`

---

## 專案目錄結構（初步）

```
diet-tracker/
├── bot/              # grammY bot（Cloudflare Workers）
│   ├── index.ts
│   ├── commands/     # /weight /sport /today /report /edit
│   └── handlers/     # photo handler, callback handler
├── api/              # Hono API（Cloudflare Workers）
│   ├── index.ts
│   └── routes/
├── report/           # 靜態報告頁（Vercel）
│   └── index.html
├── supabase/
│   └── migrations/
└── wrangler.toml
```
