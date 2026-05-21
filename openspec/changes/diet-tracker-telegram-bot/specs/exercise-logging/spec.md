## ADDED Requirements

### Requirement: 透過指令記錄運動
使用者 SHALL 能透過 `/sport <種類> <分鐘>` 指令記錄運動。

#### Scenario: 運動記錄成功
- **WHEN** 使用者傳送 `/sport 跑步 30`
- **THEN** 系統儲存 exercise_log（exercise_type="跑步", duration_minutes=30），Bot 回覆「跑步 30 分鐘記錄成功 ✓」

#### Scenario: 格式錯誤
- **WHEN** 使用者傳送 `/sport 跑步` 或分鐘非數字
- **THEN** Bot 回覆「格式：/sport 跑步 30」

#### Scenario: 當日多筆運動
- **WHEN** 使用者當日已有運動記錄，再次傳送 `/sport`
- **THEN** 系統新增一筆（不覆蓋），Bot 回覆成功訊息
