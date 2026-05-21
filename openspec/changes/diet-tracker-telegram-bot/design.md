## Context

從零建立飲食記錄系統。使用者（單人）透過 Telegram 記錄三餐、體重、運動，並產生報告給營養師。無既有系統需整合，純新建。

## Goals / Non-Goals

**Goals:**
- Telegram Bot 作為唯一資料輸入介面
- Gemini Vision 自動辨識照片中的食物
- Supabase 儲存結構化資料與照片
- Cloudflare Workers Cron 定時提醒
- 唯讀報告頁（靜態 HTML）讓營養師查看 7 天紀錄

**Non-Goals:**
- 多使用者支援
- 精確卡路里計算
- Web UI 資料輸入
- 歷史資料回溯編輯（僅限當日 /edit）

## Decisions

### Bot Framework：grammY over Telegraf
grammY 是 TypeScript-first、使用 middleware 架構、支援 Cloudflare Workers 部署。Telegraf 較老、型別支援弱。選 grammY。

### 後端：Hono on Cloudflare Workers
無冷啟動問題、免費層夠用、與 Cloudflare Cron Triggers 原生整合。相較 Vercel Functions，Cloudflare Workers 執行環境更一致。Bot 與 API 共用同一個 Workers service。

### 資料庫：Supabase PostgreSQL
同時提供 DB + Storage + 未來可擴充 Auth。相較自架 PostgreSQL，免運維。免費層 500MB DB + 1GB Storage 夠用。

### 照片壓縮：Workers 端用 `@cloudflare/workers-wasm` + wasm 版 sharp
照片在 Hono API 端壓縮後再上傳 Supabase Storage，避免原始大檔存入。目標：max 1200px，quality 80%，JPEG 輸出。

### 報告頁：純靜態 HTML + Tailwind CDN + Chart.js CDN
報告頁無需 SSR，fetch `/api/report/:token` JSON 後前端 render。部署 Vercel，零維護成本。token 48hr 後過期，由 Supabase `expires_at` 欄位控管。

### Gemini Model：gemini-2.0-flash
速度快、成本低、Vision 能力足夠識別台灣常見食物。若辨識結果不滿意，使用者可透過 Bot 修改。

## Risks / Trade-offs

- **Cloudflare Workers wasm sharp 限制** → 若 wasm 版 sharp 不穩，改用 Cloudflare Images API 作壓縮，成本略增
- **Gemini 辨識準確率** → 系統設計有人工修正流程，辨識失敗不影響資料完整性
- **Supabase 免費層限制** → 單人使用量極低，預估不會觸及上限；若需要可升 Pro
- **Bot token 洩漏** → token 存 Cloudflare Workers Secret，不進版控

## Open Questions

- 報告頁域名：使用 Vercel 預設子域還是自訂域？（建議先用預設，之後再換）
- Gemini API 費用上限設定：建議在 Google Cloud Console 設每月 budget alert
