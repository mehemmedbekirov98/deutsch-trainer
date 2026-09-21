-- Admin, settings and moderation.
--
-- Run after 0001_init.sql, the same way: SQL Editor → paste → Run.

-- ------------------------------------------------------------------ admin

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists blocked   boolean not null default false;

-- The first account to be created owns the place. Doing it here rather than by hand means there
-- is never a window where the site has users and nobody who can administer them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_one boolean;
begin
  select count(*) = 0 into first_one from public.profiles;
  insert into public.profiles (id, name, is_admin)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Ученик'), first_one)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- A blocked account disappears from the shared table.
create or replace function public.leaderboard()
returns table (
  id       uuid,
  name     text,
  xp       integer,
  coins    integer,
  streak   integer,
  cefr     text,
  levels   integer,
  words    integer,
  games    jsonb,
  last_seen timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.name,
    coalesce((p.data->>'xp')::int, 0),
    coalesce((p.data->>'coinsEarned')::int, 0),
    coalesce((p.data#>>'{streak,best}')::int, 0),
    coalesce(p.data->>'cefr', 'A1'),
    (
      select count(*)::int
      from jsonb_each(coalesce(p.data->'levels', '{}'::jsonb)) as lv(key, value)
      where coalesce((lv.value->>'examBest')::int, 0) >= 70
    ),
    coalesce((p.data#>>'{stats,wordsLearned}')::int, 0),
    coalesce(p.data->'games', '{}'::jsonb),
    p.updated_at
  from public.progress p
  join public.profiles pr on pr.id = p.user_id
  where pr.public_board and not pr.blocked
$$;

grant execute on function public.leaderboard() to anon, authenticated;

-- --------------------------------------------------------------- settings

/*
 * Things the owner can change without redeploying — today that is the Anthropic key.
 *
 * Nobody can read this table: no policy grants select, and RLS is on, so every request that is not
 * the service role sees nothing at all. Only the admin Netlify function touches it, and it never
 * sends a value back to a browser — only whether one is set.
 */
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

alter table public.app_settings enable row level security;
-- deliberately no policies: service role only
