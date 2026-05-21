## ADDED Requirements

### Requirement: 早晨體重提醒
系統 SHALL 在每日 08:00（Asia/Taipei）檢查使用者是否已記錄體重，未記錄時推送提醒。

#### Scenario: 體重未記錄時推送提醒
- **WHEN** Cron 觸發時間為 08:00，當日 weight_log 不存在
- **THEN** Bot 傳送「早安！記得量體重 ⚖️」

#### Scenario: 體重已記錄不推送
- **WHEN** Cron 觸發時間為 08:00，當日 weight_log 已存在
- **THEN** 系統不發送任何訊息

### Requirement: 晚間餐別補記提醒
系統 SHALL 在每日 21:00（Asia/Taipei）檢查當日餐別記錄，針對缺漏的餐別推送提醒。

#### Scenario: 某餐未記錄時推送提醒
- **WHEN** Cron 觸發時間為 21:00，當日早/午/晚餐中有缺漏
- **THEN** Bot 傳送「晚上好！今天 [缺漏餐別] 還沒記錄，補充一下？」

#### Scenario: 三餐皆已記錄不推送
- **WHEN** Cron 觸發時間為 21:00，當日早/午/晚餐皆已記錄
- **THEN** 系統不發送任何訊息
