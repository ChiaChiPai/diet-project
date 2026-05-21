## 1. 專案初始化

- [ ] 1.1 建立 monorepo 結構（bot/、api/、report/、supabase/）
- [ ] 1.2 設定 wrangler.toml（Bot + API 共用 Workers service）
- [ ] 1.3 建立 Supabase 專案，取得 DB URL 與 anon key
- [ ] 1.4 設定 Cloudflare Workers Secrets（Telegram token、Supabase URL/key、Gemini API key）

## 2. 資料庫

- [ ] 2.1 撰寫 Supabase migration：weight_logs、meal_logs、exercise_logs、report_tokens 資料表
- [ ] 2.2 執行 migration，驗證資料表結構正確

## 3. Hono API

- [ ] 3.1 建立 Hono 基礎架構（index.ts、routes/）
- [ ] 3.2 實作 POST /api/weight（新增或覆蓋當日體重）
- [ ] 3.3 實作 POST /api/exercise（新增運動記錄）
- [ ] 3.4 實作 POST /api/meals（新增或更新飲食記錄）
- [ ] 3.5 實作 POST /api/upload（接收照片、壓縮、上傳 Supabase Storage）
- [ ] 3.6 實作 GET /api/report/:token（驗證 token 並回傳 7 天 JSON 資料）
- [ ] 3.7 實作 POST /api/report（建立 report_token，設 48hr 過期）

## 4. Gemini Vision 整合

- [ ] 4.1 安裝 @google/genai，建立 analyzeFood(imageBuffer) 工具函式
- [ ] 4.2 整合至照片上傳流程，回傳 { foods: string[], estimated_calories?: number }
- [ ] 4.3 處理 Gemini 辨識失敗的 fallback（回傳空陣列，不中斷流程）

## 5. Telegram Bot

- [ ] 5.1 安裝 grammY，建立 Bot 基礎架構
- [ ] 5.2 實作照片 handler：上傳 → Gemini 分析 → 顯示結果 + 餐別 inline keyboard
- [ ] 5.3 實作餐別選擇 callback handler
- [ ] 5.4 實作確認/修改 callback handler（正確 ✓ / 修改 ✏️）
- [ ] 5.5 實作修改文字輸入 handler（等待下一則文字訊息覆蓋 description）
- [ ] 5.6 實作 /weight 指令（parse 數值、呼叫 API、回覆成功/格式錯誤）
- [ ] 5.7 實作 /sport 指令（parse 種類+分鐘、呼叫 API、回覆成功/格式錯誤）
- [ ] 5.8 實作 /today 指令（查詢當日所有記錄、格式化回覆）
- [ ] 5.9 實作 /edit 指令（列出當日餐別選單 → 選擇 → 輸入新內容覆蓋）
- [ ] 5.10 實作 /report 指令（呼叫 API 建立 token → 回覆報告 URL）

## 6. Cron 提醒

- [ ] 6.1 在 wrangler.toml 設定兩個 Cron Triggers（08:00 與 21:00 Asia/Taipei）
- [ ] 6.2 實作 08:00 handler：查詢當日 weight_log，缺漏時透過 Bot sendMessage 推送提醒
- [ ] 6.3 實作 21:00 handler：查詢當日三餐記錄，針對缺漏餐別推送提醒

## 7. 報告頁

- [ ] 7.1 建立靜態 HTML（Tailwind CDN + Chart.js CDN）
- [ ] 7.2 實作 fetch /api/report/:token，解析 JSON
- [ ] 7.3 實作體重折線圖（Chart.js line chart，7 天）
- [ ] 7.4 實作每日飲食區塊（餐別 + 描述 + 照片縮圖）
- [ ] 7.5 實作運動記錄顯示
- [ ] 7.6 實作過期連結錯誤頁
- [ ] 7.7 部署至 Vercel

## 8. 驗證

- [ ] 8.1 手動測試完整照片上傳流程（上傳 → 辨識 → 選餐別 → 確認/修改）
- [ ] 8.2 測試 /weight、/sport、/today、/edit、/report 指令
- [ ] 8.3 驗證 Cron 提醒邏輯（手動觸發或等待時間）
- [ ] 8.4 驗證報告頁折線圖與照片正確顯示
- [ ] 8.5 驗證過期 token 顯示錯誤頁
