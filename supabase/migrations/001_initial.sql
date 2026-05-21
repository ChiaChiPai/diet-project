-- Users whitelist
create table users (
  telegram_chat_id bigint primary key,
  name             text not null,
  is_allowed       boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Bot session state (for multi-step conversations)
create table bot_sessions (
  user_id    bigint primary key references users(telegram_chat_id),
  state      text not null, -- 'awaiting_correction'
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Daily weight logs
create table weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    bigint not null references users(telegram_chat_id),
  date       date not null,
  kg         numeric(4,1) not null,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Meal logs (meal_type null = pending meal type selection)
create table meal_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          bigint not null references users(telegram_chat_id),
  date             date not null,
  meal_type        text check (meal_type in ('breakfast','lunch','dinner','snack')),
  description      text not null default '',
  photo_url        text,
  gemini_analysis  jsonb,
  confirmed        boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Exercise logs (multiple per day allowed)
create table exercise_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          bigint not null references users(telegram_chat_id),
  date             date not null,
  exercise_type    text not null,
  duration_minutes int not null,
  created_at       timestamptz not null default now()
);

-- Report share tokens
create table report_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    bigint not null references users(telegram_chat_id),
  token      text not null unique,
  date_from  date not null,
  date_to    date not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Storage bucket for meal photos (run in Supabase dashboard)
-- insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', true);
