## ADDED Requirements

### Requirement: 產生 7 天唯讀報告連結
使用者 SHALL 能透過 `/report` 指令產生近 7 天的飲食報告連結。

#### Scenario: 報告連結產生成功
- **WHEN** 使用者傳送 `/report`
- **THEN** 系統建立 report_token（48hr 後過期），Bot 回覆完整 URL

#### Scenario: 連結 48 小時後過期
- **WHEN** 使用者或營養師開啟已過期的報告連結
- **THEN** 報告頁顯示「此連結已過期，請重新產生」

### Requirement: 報告頁呈現 7 天飲食摘要
報告頁 SHALL 以唯讀方式呈現近 7 天的體重趨勢、飲食記錄（含照片）與運動清單。

#### Scenario: 完整報告頁載入
- **WHEN** 使用者或營養師開啟有效報告連結
- **THEN** 頁面顯示：體重 7 天折線圖、每日飲食記錄（餐別+描述+照片縮圖）、每日運動記錄

#### Scenario: 部分資料缺漏
- **WHEN** 某日有餐別未記錄
- **THEN** 該餐別顯示「未記錄」，不影響其他日期與餐別的正常顯示

### Requirement: 今日摘要查詢
使用者 SHALL 能透過 `/today` 指令查看當日已記錄內容。

#### Scenario: 查看今日摘要
- **WHEN** 使用者傳送 `/today`
- **THEN** Bot 回覆當日體重、各餐記錄、運動記錄，未記錄項目標示「—」
