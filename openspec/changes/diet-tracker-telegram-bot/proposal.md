## Why

記錄三餐、體重、運動給營養師看，需要低摩擦力的輸入方式。手機開 app 記錄太繁瑣，改用 Telegram Bot 當唯一輸入介面，搭配 Gemini Vision 自動辨識食物，大幅降低記錄門檻。

## What Changes

- 建立 Telegram Bot 作為主要輸入介面（無 web UI 輸入）
- 照片上傳後自動呼叫 Gemini Vision API 辨識食物內容
- 透過 `/weight`、`/sport` 指令記錄體重與運動
- 每日定時提醒（早上體重、晚上餐別補記）
- 產生 7 天唯讀報告連結（含折線圖、照片、文字摘要）供營養師查看

## Capabilities

### New Capabilities

- `meal-logging`: 透過照片上傳記錄三餐與點心，Gemini 自動辨識，支援人工修正
- `weight-logging`: 透過 `/weight` 指令記錄每日空腹體重
- `exercise-logging`: 透過 `/sport` 指令記錄運動種類與時間
- `daily-reminder`: Cron 定時檢查當日紀錄缺漏，透過 Bot 推送提醒
- `report-generation`: 產生 7 天唯讀報告頁連結，含體重折線圖、餐點照片與摘要

### Modified Capabilities

（無現有 spec）

## Impact

- 新增 Cloudflare Workers（Bot + API + Cron）
- 新增 Supabase（PostgreSQL + Storage）
- 新增 Gemini Vision API 依賴
- 報告頁部署至 Vercel（靜態 HTML）
- 無既有系統需修改
