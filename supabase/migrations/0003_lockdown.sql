-- Closing two holes and making the block button mean something.
--
-- Run after 0002_admin.sql, the same way: SQL Editor → paste → Run.

-- ----------------------------------------------------- nobody promotes themselves
--
-- `for update using (auth.uid() = id)` let a signed-in person write ANY column of their own row,
-- and two of those columns decide who they are: is_admin and blocked. One PATCH from the browser
-- console — the publishable key is right there in the page, as it is meant to be — and the account
-- owns the admin panel, the user list and the Anthropic key.
--
-- Two locks, because one is a policy and the other is a grant, and they fail differently:
--   · the grant means the client may only ever name these two columns in an UPDATE;
--   · with check means the row that comes out must still belong to the person who wrote it.
-- A column-level grant is the stronger of the two — it is checked before any policy runs and
-- there is no expression in it to get subtly wrong.
revoke update on public.profiles from authenticated, anon;
grant  update (name, public_board) on public.profiles to authenticated;

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update
  using       (auth.uid() = id)
  with check  (auth.uid() = id);

-- ----------------------------------------------------- a block that blocks
--
-- Until now `blocked` only hid the row from the leaderboard: the account carried on saving
-- progress and talking to Mia as if nothing had happened. It now stops writes at the database,
-- so it holds even if a future endpoint forgets to check.
create or replace function public.is_blocked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.blocked from public.profiles p where p.id = auth.uid()), false)
$$;

grant execute on function public.is_blocked() to authenticated;

drop policy if exists "insert own progress" on public.progress;
drop policy if exists "update own progress" on public.progress;
create policy "insert own progress" on public.progress
  for insert with check (auth.uid() = user_id and not public.is_blocked());
create policy "update own progress" on public.progress
  for update using  (auth.uid() = user_id and not public.is_blocked())
          with check (auth.uid() = user_id);

-- Reading still works: a blocked person can open the site and see their own progress. They just
-- cannot add to it, and they are not in the table. Nothing of theirs is deleted.

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
  if public.is_blocked() then
    raise exception 'account blocked';
  end if;

  insert into public.progress as pr (user_id, data, saved_at, updated_at)
  values (auth.uid(), p_data, p_saved_at, now())
  on conflict (user_id) do update
    set data = excluded.data, saved_at = excluded.saved_at, updated_at = now()
    where pr.saved_at <= excluded.saved_at;

  if not found then
    select p.data into stored from public.progress p where p.user_id = auth.uid();
    return stored;
  end if;
  return null;
end;
$$;

grant execute on function public.save_progress(jsonb, bigint) to authenticated;
