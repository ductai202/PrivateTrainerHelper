-- Phase 3: link a student to a Zalo Bot chat.
alter table students
  add column zalo_bot_chat_id text,
  add column bot_link_code text not null default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

create unique index students_zalo_bot_chat_id_key on students (zalo_bot_chat_id)
  where zalo_bot_chat_id is not null;
create unique index students_bot_link_code_key on students (bot_link_code);
