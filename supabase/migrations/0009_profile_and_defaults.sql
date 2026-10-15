-- PT profile (used to choose forms of address in messages to students),
-- 22:00 default for the evening review, and a throttle for unknown-message hints from the bot.
alter table members
  add column gender text check (gender in ('male', 'female', 'other')),
  add column birth_year int check (birth_year between 1940 and 2020);

alter table members alter column evening_review_time set default '22:00';
update members set evening_review_time = '22:00' where evening_review_time = '20:00';

create table bot_hints (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  sent_at timestamptz not null default now()
);
create index bot_hints_chat_idx on bot_hints (chat_id, sent_at);
alter table bot_hints enable row level security; -- service role only
