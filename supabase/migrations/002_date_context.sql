create table user_date_context (
  user_id       bigint primary key references users(telegram_chat_id),
  date_override date not null
);
