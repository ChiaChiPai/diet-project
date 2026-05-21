## ADDED Requirements

### Requirement: 透過指令記錄空腹體重
使用者 SHALL 能透過 `/weight <數值>` 指令記錄當日空腹體重。

#### Scenario: 體重記錄成功
- **WHEN** 使用者傳送 `/weight 65.2`
- **THEN** 系統儲存 weight_log（user_id, date=今日, kg=65.2），Bot 回覆「體重 65.2kg 記錄成功 ✓」

#### Scenario: 格式錯誤
- **WHEN** 使用者傳送 `/weight abc` 或未帶數值
- **THEN** Bot 回覆「格式：/weight 65.2」

#### Scenario: 當日重複記錄
- **WHEN** 使用者當日已記錄體重，再次傳送 `/weight`
- **THEN** 系統以新值覆蓋，Bot 回覆「體重已更新為 XX.Xkg ✓」
