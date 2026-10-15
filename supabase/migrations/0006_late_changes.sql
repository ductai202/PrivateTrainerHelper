-- Phase 1.1: late changes, per-PT evening review time, weekly session target.
alter table sessions
  add column cancelled_at timestamptz,
  add column cancelled_by text check (cancelled_by in ('student', 'pt')),
  add column precheck_pushed_at timestamptz,
  add column rescheduled_from uuid references sessions(id) on delete set null;

alter table members
  add column evening_review_time time not null default '20:00';

alter table students
  add column target_per_week smallint not null default 2
    check (target_per_week between 1 and 7);
