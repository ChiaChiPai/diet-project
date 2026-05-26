const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN')
  process.exit(1)
}

const commands = [
  { command: 'weight', description: '記錄體重 — /weight 65.2' },
  { command: 'sport',  description: '記錄運動 — /sport 跑步 30' },
  { command: 'meal',   description: '用文字記錄飲食（無需照片）' },
  { command: 'today',  description: '查看今日摘要' },
  { command: 'report', description: '產生近 14 天報告連結' },
  { command: 'edit',   description: '修改今日飲食記錄內容' },
  { command: 'clear',  description: '取消目前操作' },
  { command: 'date', description: '補記日期 — /date 2026-05-25 或 /date 回到今日' },
]

const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ commands }),
})

const data = await res.json()
console.log(data)
