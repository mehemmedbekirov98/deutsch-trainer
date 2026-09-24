-- Счётчик расходов, размер сейва и то, что видно постороннему.
--
-- Запускать после 0003_lockdown.sql: SQL Editor → вставить → Run.
--
-- Три разные вещи, но причина одна: до сих пор всё упиралось в порядочность вошедшего. Он мог
-- звать Мию в цикле (это деньги владельца), класть в прогресс мегабайты (это место в базе), а
-- таблица рейтинга отдавала случайному посетителю больше, чем обещала страница.

-- ============================================================ 1. счётчик обращений
--
-- Функции на Netlify не помнят ничего между вызовами — считать не в чем. Поэтому счётчик в базе:
-- одна строка на человека и вид расхода, окно скользит само.
--
-- Строки читает и пишет ТОЛЬКО служебная роль (функции Netlify). Браузеру здесь делать нечего:
-- ни select, ни execute ему не выдано, и своё собственное потраченное он не увидит и не обнулит.
create table if not exists public.usage_counters (
  user_id     uuid not null references auth.users on delete cascade,
  bucket      text not null,
  window_start timestamptz not null default now(),
  used        integer not null default 0,
  primary key (user_id, bucket)
);

alter table public.usage_counters enable row level security;
-- ни одной политики: с включённым RLS это значит «никому, кроме служебной роли»

/*
 * Взять одну единицу расхода. true — можно, false — лимит исчерпан.
 *
 * Окно не календарное, а от первого обращения: человек, начавший говорить в 10:59, не получает
 * второй лимит в 11:00. Одна строка на человека — insert … on conflict, без гонок между двумя
 * одновременными запросами: update блокирует строку.
 */
create or replace function public.take_quota(
  p_user   uuid,
  p_bucket text,
  p_limit  integer,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_used  integer;
  cur_start timestamptz;
begin
  if p_user is null then
    return false;
  end if;

  insert into public.usage_counters (user_id, bucket, window_start, used)
  values (p_user, p_bucket, now(), 0)
  on conflict (user_id, bucket) do nothing;

  select u.used, u.window_start into cur_used, cur_start
  from public.usage_counters u
  where u.user_id = p_user and u.bucket = p_bucket
  for update;

  -- окно вышло — начинаем заново
  if cur_start + p_window <= now() then
    update public.usage_counters
      set window_start = now(), used = 1
      where user_id = p_user and bucket = p_bucket;
    return true;
  end if;

  if cur_used >= p_limit then
    return false;
  end if;

  update public.usage_counters
    set used = cur_used + 1
    where user_id = p_user and bucket = p_bucket;
  return true;
end;
$$;

revoke execute on function public.take_quota(uuid, text, integer, interval) from public, anon, authenticated;

-- ============================================================ 2. размер сейва
--
-- `p_data jsonb` принимался любого размера. Прогресс честного человека — десятки килобайт; всё,
-- что сильно больше, это либо поломка, либо кто-то проверяет, сколько влезет. Проверка стоит
-- одного pg_column_size и делает «сколько влезет» коротким разговором.
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
  -- 256 КБ: примерно вдесятеро больше самого полного прохождения всех 36 уроков
  if pg_column_size(p_data) > 262144 then
    raise exception 'progress too large';
  end if;
  if jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'progress must be an object';
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

-- ============================================================ 3. что видно в рейтинге
--
-- Страница обещает «имя, опыт и уровень». Отдавалось больше: постоянный идентификатор каждого
-- человека и точное время его последнего захода — то есть распорядок дня, читаемый кем угодно
-- без входа. Идентификатор нужен ровно для одного: подсветить строку «это ты». Значит, он и
-- приходит ровно в одной строке — твоей собственной.
drop function if exists public.leaderboard();
create or replace function public.leaderboard()
returns table (
  id     uuid,
  name   text,
  xp     integer,
  streak integer,
  cefr   text,
  levels integer,
  words  integer,
  games  jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    case when pr.id = auth.uid() then pr.id else null end,
    pr.name,
    coalesce((p.data->>'xp')::int, 0),
    coalesce((p.data#>>'{streak,best}')::int, 0),
    coalesce(p.data->>'cefr', 'A1'),
    (
      select count(*)::int
      from jsonb_each(coalesce(p.data->'levels', '{}'::jsonb)) as lv(key, value)
      where coalesce((lv.value->>'examBest')::int, 0) >= 70
    ),
    coalesce((p.data#>>'{stats,wordsLearned}')::int, 0),
    coalesce(p.data->'games', '{}'::jsonb)
  from public.progress p
  join public.profiles pr on pr.id = p.user_id
  where pr.public_board and not pr.blocked
$$;

grant execute on function public.leaderboard() to anon, authenticated;

-- ============================================================ 4. чужая почта — не наше дело
--
-- is_owner_email() отвечала любому: «этот адрес — владелец?». Проверять по одному адресу за
-- запрос можно бесконечно, и это прямой способ узнать, на какую почту заведена админка. Функция
-- нужна только триггеру регистрации, а он security definer и правами вызывающего не связан.
revoke execute on function public.is_owner_email(text) from public, anon, authenticated;

-- ============================================================ 5. бакет с голосом больше не листается
--
-- Политика «public can read tts» разрешала select по всей таблице объектов бакета — а Storage
-- делает через select не только чтение файла, но и ПЕРЕЧИСЛЕНИЕ. То есть любой человек без
-- входа получал полный список всех клипов и мог скачать их подряд. Для курса это неважно: он и
-- так открыт. Но туда же попадали реплики Мии из личных разговоров — их синтезировал тот же
-- /api/tts, и они ложились в тот же бакет навсегда.
--
-- Бакет помечен public = true, поэтому чтение по прямому адресу
-- /storage/v1/object/public/tts/<ключ>.mp3 идёт мимо правил доступа и продолжает работать —
-- именно так его и читает браузер. А вот список закрывается: без него до файла можно добраться,
-- только зная sha1 от самого текста, то есть уже зная, что там сказано.
drop policy if exists "public can read tts" on storage.objects;
