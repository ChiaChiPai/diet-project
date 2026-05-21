## ADDED Requirements

### Requirement: 白名單存取控制
Bot SHALL 對每則訊息檢查發送者是否在白名單中，未授權使用者 SHALL 被靜默忽略。

#### Scenario: 授權使用者傳送訊息
- **WHEN** telegram_chat_id 存在於 users 資料表且 is_allowed=true
- **THEN** Bot 正常處理訊息

#### Scenario: 未授權使用者傳送訊息
- **WHEN** telegram_chat_id 不存在於 users 資料表或 is_allowed=false
- **THEN** Bot 靜默忽略，不回應任何內容

### Requirement: 管理員新增允許使用者
管理員 SHALL 能透過 `/adduser <chat_id> <name>` 指令新增白名單使用者。

#### Scenario: 成功新增使用者
- **WHEN** 管理員傳送 `/adduser 123456789 老婆`
- **THEN** 系統在 users 資料表插入或更新該 chat_id（is_allowed=true），Bot 回覆「已新增：老婆 (123456789)」

#### Scenario: 非管理員嘗試使用管理指令
- **WHEN** 非 ADMIN_CHAT_ID 的使用者傳送 `/adduser`
- **THEN** Bot 靜默忽略

#### Scenario: 格式錯誤
- **WHEN** 管理員傳送 `/adduser` 但未帶 chat_id
- **THEN** Bot 回覆「格式：/adduser <chat_id> <名稱>」

### Requirement: 管理員移除允許使用者
管理員 SHALL 能透過 `/removeuser <chat_id>` 將使用者設為 is_allowed=false。

#### Scenario: 成功移除使用者
- **WHEN** 管理員傳送 `/removeuser 123456789`
- **THEN** 系統將該 chat_id 的 is_allowed 設為 false，Bot 回覆「已移除：123456789」

#### Scenario: 移除不存在的使用者
- **WHEN** 管理員傳送 `/removeuser 999999999`，該 chat_id 不在資料表中
- **THEN** Bot 回覆「找不到使用者 999999999」

### Requirement: Cron 提醒支援多使用者
每日提醒 SHALL 遍歷所有 is_allowed=true 的使用者並分別推送。

#### Scenario: 多名使用者皆收到提醒
- **WHEN** Cron 觸發，有兩名 is_allowed=true 使用者且皆未記錄體重
- **THEN** 兩名使用者各自收到體重提醒訊息，資料彼此隔離
