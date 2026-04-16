-- Migration: push_subscriptions
-- Stores Web Push API subscriptions per user/device.
-- Each browser/device generates a unique endpoint, so endpoint is the PK for upsert.

create table if not exists push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade,
  scholar_id  uuid        references scholars(id)   on delete set null,
  endpoint    text        unique not null,
  p256dh      text,
  auth        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Fast lookup by user or scholar
create index if not exists idx_push_subs_user    on push_subscriptions(user_id);
create index if not exists idx_push_subs_scholar on push_subscriptions(scholar_id);

-- RLS: users can only read/delete their own subscriptions.
-- Server-side (service role) bypasses RLS for sends and cleanup.
alter table push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on push_subscriptions
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table push_subscriptions is
  'Web Push API subscriptions. Upserted by endpoint on subscribe, deleted on unsubscribe or 410 response from push server.';
