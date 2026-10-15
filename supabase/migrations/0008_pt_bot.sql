-- PTs can connect their own Zalo chat to the bot to be notified there
-- (works on iPhone without installing the web app).
alter table members
  add column zalo_bot_chat_id text,
  add column bot_link_code text not null default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

create unique index members_zalo_bot_chat_id_key on members (zalo_bot_chat_id)
  where zalo_bot_chat_id is not null;
create unique index members_bot_link_code_key on members (bot_link_code);
