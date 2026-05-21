## 1. 專案初始化

- [ ] 1.1 建立 monorepo 結構（bot/、api/、report/、supabase/）
- [ ] 1.2 設定 wrangler.toml（Bot + API 共用 Workers service）
- [ ] 1.3 建立 Supabase 專案，取得 DB URL 與 anon key
- [ ] 1.4 設定 Cloudflare Workers Secrets（Telegram token、Supabase URL/key、Gemini API key、ADMIN_CHAT_ID）

## 2. 資料庫

- [ ] 2.1 撰寫 Supabase migration：users、weight_logs、meal_logs、exercise_logs、report_tokens 資料表
- [ ] 2.2 執行 migration，驗證資料表結構正確

## 3. 使用者管理

- [ ] 3.1 建立 Bot middleware：每則訊息查詢 users 表，is_allowed=false 或不存在 → 靜默忽略
- [ ] 3.2 實作 /adduser 指令（僅 ADMIN_CHAT_ID 可用）：插入或更新 users 資料表
- [ ] 3.3 實作 /removeuser 指令（僅 ADMIN_CHAT_ID 可用）：設 is_allowed=false

## 4. Hono API

- [ ] 4.1 建立 Hono 基礎架構（index.ts、routes/）
- [ ] 4.2 實作 POST /api/weight（新增或覆蓋當日體重）
- [ ] 4.3 實作 POST /api/exercise（新增運動記錄）
- [ ] 4.4 實作 POST /api/meals（新增或更新飲食記錄）
- [ ] 4.5 實作 POST /api/upload（接收照片、壓縮、上傳 Supabase Storage）
- [ ] 4.6 實作 GET /api/report/:token（驗證 token 並回傳 7 天 JSON 資料）
- [ ] 4.7 實作 POST /api/report（建立 report_token，設 48hr 過期）

## 5. Gemini Vision 整合

- [ ] 5.1 安裝 @google/genai，建立 analyzeFood(imageBuffer) 工具函式
- [ ] 5.2 整合至照片上傳流程，回傳 { foods: string[], estimated_calories?: number }
- [ ] 5.3 處理 Gemini 辨識失敗的 fallback（回傳空陣列，不中斷流程）

## 6. Telegram Bot

- [ ] 6.1 安裝 grammY，建立 Bot 基礎架構
- [ ] 6.2 實作照片 handler：上傳 → Gemini 分析 → 顯示結果 + 餐別 inline keyboard
- [ ] 6.3 實作餐別選擇 callback handler
- [ ] 6.4 實作確認/修改 callback handler（正確 ✓ / 修改 ✏️）
- [ ] 6.5 實作修改文字輸入 handler（等待下一則文字訊息覆蓋 description）
- [ ] 6.6 實作 /weight 指令（parse 數值、呼叫 API、回覆成功/格式錯誤）
- [ ] 6.7 實作 /sport 指令（parse 種類+分鐘、呼叫 API、回覆成功/格式錯誤）
- [ ] 6.8 實作 /today 指令（查詢當日所有記錄、格式化回覆）
- [ ] 6.9 實作 /edit 指令（列出當日餐別選單 → 選擇 → 輸入新內容覆蓋）
- [ ] 6.10 實作 /report 指令（呼叫 API 建立 token → 回覆報告 URL）

## 7. Cron 提醒

- [ ] 7.1 在 wrangler.toml 設定兩個 Cron Triggers（08:00 與 21:00 Asia/Taipei）
- [ ] 7.2 實作 08:00 handler：查詢所有 is_allowed=true 使用者，各自檢查體重記錄，缺漏時推送提醒
- [ ] 7.3 實作 21:00 handler：查詢所有 is_allowed=true 使用者，各自檢查三餐記錄，針對缺漏餐別推送提醒

## 8. 報告頁

- [ ] 8.1 建立靜態 HTML（Tailwind CDN + Chart.js CDN）
- [ ] 8.2 實作 fetch /api/report/:token，解析 JSON
- [ ] 8.3 實作體重折線圖（Chart.js line chart，7 天）
- [ ] 8.4 實作每日飲食區塊（餐別 + 描述 + 照片縮圖）
- [ ] 8.5 實作運動記錄顯示
- [ ] 8.6 實作過期連結錯誤頁
- [ ] 8.7 部署至 Vercel

## 9. 驗證

- [ ] 9.1 手動測試完整照片上傳流程（上傳 → 辨識 → 選餐別 → 確認/修改）
- [ ] 9.2 測試 /weight、/sport、/today、/edit、/report 指令
- [ ] 9.3 測試 /adduser、/removeuser 指令，驗證白名單生效
- [ ] 9.4 驗證未授權 chat_id 傳訊息被靜默忽略
- [ ] 9.5 驗證 Cron 提醒邏輯遍歷多位使用者
- [ ] 9.6 驗證報告頁折線圖與照片正確顯示
- [ ] 9.7 驗證過期 token 顯示錯誤頁
