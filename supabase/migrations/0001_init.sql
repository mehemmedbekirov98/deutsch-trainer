-- Deutsch für Ali — database schema.
--
-- Two tables and one function. The save itself stays a single JSON blob, exactly as it was on
-- disk: the app has always treated it as one object, every field is read by the client, and
-- splitting it into columns would buy nothing but migrations every time a level gains a field.
-- What the leaderboard needs is pulled out of that blob by the function at the bottom.
--
-- Run once against a fresh project:
--   supabase db push          (CLI)
--   …or paste this whole file into the SQL editor in the Supabase dashboard.

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  name         text not null check (char_length(name) between 2 and 40),
  public_board boolean not null default true,   -- appear in the shared table at all
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A person sees and edits their own row and nobody else's. Other people's names reach the
-- leaderboard through the function below, which is the only place they are exposed.
drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "read own profile"   on public.profiles for select using  (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update using  (auth.uid() = id);

-- Signing up creates the profile. Doing it here rather than in the client means an account can
-- never exist without one, however the sign-up happened.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), 'Ученик'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- progress

create table if not exists public.progress (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null,
  saved_at   bigint not null default 0,          -- client clock, milliseconds
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "read own progress"   on public.progress;
drop policy if exists "insert own progress" on public.progress;
drop policy if exists "update own progress" on public.progress;
create policy "read own progress"   on public.progress for select using  (auth.uid() = user_id);
create policy "insert own progress" on public.progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.progress for update using  (auth.uid() = user_id);

/*
 * Save, unless what is stored is newer.
 *
 * Two tabs are the normal case, not the edge case — each holds its own copy of the state, and the
 * one that saves last would otherwise wipe out whatever the other just earned. The comparison and
 * the write happen in one statement here, so they cannot interleave.
 *
 * Returns the stored row when it refused, and null when it saved. The client adopts what comes
 * back, which is how the other tab's progress reaches this one.
 */
create or replace function public.save_progress(p_data jsonb, p_saved_at bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  stored jsonb;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  insert into public.progress as pr (user_id, data, saved_at, updated_at)
  values (auth.uid(), p_data, p_saved_at, now())
  on conflict (user_id) do update
    set data = excluded.data, saved_at = excluded.saved_at, updated_at = now()
    where pr.saved_at <= excluded.saved_at;

  -- nothing was written: the stored copy is the newer one, hand it back
  if not found then
    select p.data into stored from public.progress p where p.user_id = auth.uid();
    return stored;
  end if;
  return null;
end;
$$;

grant execute on function public.save_progress(jsonb, bigint) to authenticated;

-- ------------------------------------------------------------- leaderboard

/*
 * The shared table.
 *
 * security definer on purpose: it has to read rows that row-level security hides, and this is the
 * only door through which another person's data leaves. It returns exactly the columns the board
 * shows — a name and some numbers. No email, no auth id, no save.
 */
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
  where pr.public_board
$$;

grant execute on function public.leaderboard() to anon, authenticated;

-- ------------------------------------------------------------------ audio

-- Mia's voice. Public read because it is just the course being read aloud and serving it from the
-- CDN costs nothing; writes are the service role only, which lives in the Netlify function.
insert into storage.buckets (id, name, public)
values ('tts', 'tts', true)
on conflict (id) do nothing;

drop policy if exists "public can read tts" on storage.objects;
create policy "public can read tts"
  on storage.objects for select
  using (bucket_id = 'tts');
