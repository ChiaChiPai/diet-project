## ADDED Requirements

### Requirement: 照片上傳觸發飲食記錄流程
使用者傳送照片至 Bot 時，系統 SHALL 呼叫 Gemini Vision API 分析食物內容，並詢問使用者餐別。

#### Scenario: 照片上傳成功辨識
- **WHEN** 使用者傳送照片
- **THEN** Bot 回覆 Gemini 辨識結果與四個餐別按鈕（早餐、午餐、晚餐、點心）

#### Scenario: Gemini 辨識失敗
- **WHEN** Gemini API 回傳錯誤或無法辨識
- **THEN** Bot 回覆「無法辨識，請直接輸入飲食內容」並等待文字輸入，餐別按鈕仍顯示

### Requirement: 使用者確認或修改辨識結果
使用者選擇餐別後，系統 SHALL 儲存記錄並提供修改入口。

#### Scenario: 使用者確認辨識正確
- **WHEN** 使用者選擇餐別後點擊「正確 ✓」
- **THEN** 系統儲存 meal_log（含 photo_url、gemini_analysis、description），Bot 回覆「記錄完成 ✓」
- **AND** 若同一天同餐別已有 confirmed 記錄，系統 SHALL 刪除舊記錄，僅保留本筆

#### Scenario: 使用者修改辨識結果（文字）
- **WHEN** 使用者點擊「修改 ✏️」後輸入文字
- **THEN** 系統以新文字覆蓋 description，**照片保留不變**，設為 confirmed

### Requirement: 當日飲食記錄可修改（/edit 指令）
使用者可透過 `/edit` 指令修改當日任一已確認餐記錄。

#### Scenario: 修改描述（無照片）
- **WHEN** 使用者傳送 `/edit` → 選擇餐別 → 輸入文字
- **THEN** 系統以新文字覆蓋 description，**舊照片從 Storage 刪除**，`photo_url` 設為 null，設為 confirmed
- **AND** 若同一天同餐別有其他 confirmed 記錄，系統 SHALL 刪除舊記錄

#### Scenario: 傳照片替換（AI 確認正確）
- **WHEN** 使用者傳送 `/edit` → 選擇餐別 → 傳照片 → AI 辨識 → 點擊「正確 ✓」
- **THEN** 舊照片從 Storage 刪除，新照片上傳；description 更新為 AI 辨識結果，`photo_url` 更新為新照片，設為 confirmed
- **AND** 若同一天同餐別有其他 confirmed 記錄，系統 SHALL 刪除舊記錄

#### Scenario: 傳照片替換（手動修改描述）
- **WHEN** 使用者傳送 `/edit` → 選擇餐別 → 傳照片 → AI 辨識 → 點擊「修改 ✏️」→ 輸入文字
- **THEN** 舊照片從 Storage 刪除，新照片保留；description 以手動輸入覆蓋，`photo_url` 更新為新照片，設為 confirmed

### 照片與描述的不變規則

| 操作 | description | photo_url |
|------|-------------|-----------|
| 傳照片 → AI → 正確 | AI 結果 | 保留原照片 |
| 傳照片 → AI → 修改 → 輸文字 | 手動輸入 | 保留原照片 |
| `/edit` → 選餐 → 輸文字 | 手動輸入 | **清除（null）** |
| `/edit` → 選餐 → 傳照片 → AI → 正確 | AI 結果 | **替換為新照片** |
| `/edit` → 選餐 → 傳照片 → AI → 修改 → 輸文字 | 手動輸入 | **替換為新照片** |
