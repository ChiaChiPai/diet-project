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
- **THEN** 系統儲存 meal_log（含 photo_url、gemini_analysis、description），Bot 回覆「記錄成功 ✓」

#### Scenario: 使用者修改辨識結果
- **WHEN** 使用者點擊「修改 ✏️」
- **THEN** Bot 回覆「請輸入正確的飲食內容：」，使用者回傳文字後系統以該文字覆蓋 description

### Requirement: 當日飲食記錄可修改
使用者可透過 `/edit` 指令修改當日任一餐記錄。

#### Scenario: 修改當日餐記錄
- **WHEN** 使用者傳送 `/edit`
- **THEN** Bot 列出當日已記錄的餐別，使用者選擇後可輸入新內容覆蓋 description
