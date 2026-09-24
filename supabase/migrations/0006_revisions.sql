-- Какая копия прогресса новее — решает сервер, а не часы устройства.
--
-- Запускать после 0005_clock.sql: SQL Editor → вставить → Run.
--
-- До сих пор порядок копий определялся полем `saved_at`, которое присылал сам браузер. Миграция
-- 0005 сняла худшее следствие — сбитые часы больше не запирали сохранение навсегда, — но сама
-- зависимость осталась: два устройства с разными часами спорят чужими цифрами, и «новее»
-- означает «у кого часы убежали дальше», а не «кто сохранил позже».
--
-- Правильный порядок дают не часы, а счётчик. У каждой строки прогресса появляется `rev`, и
-- увеличивает его только сервер. Браузер присылает тот rev, который видел, когда читал; если в
-- базе он уже больше — значит кто-то сохранил раньше, и мы возвращаем его копию вместо того,
-- чтобы затирать. Часы не участвуют вообще: даже если на устройстве 1999 год, порядок верен.
--
-- `saved_at` остаётся — его читает рейтинг и показывает админка, — но ставит его теперь сервер
-- своим временем, и на решение «кто главнее» оно больше не влияет.
--
-- Старая двухаргументная форма удаляется, а не остаётся рядом: у неё те же типы аргументов
-- (jsonb, bigint), так что две штуки с одинаковой подписью Postgres просто не различит.

alter table public.progress add column if not exists rev bigint not null default 0;

drop function if exists public.save_progress(jsonb, bigint);

/*
 * Сохранить прогресс.
 *
 *   p_data    — состояние целиком
 *   p_rev     — какой rev браузер видел последним; 0 значит «я ничего не читал»
 *
 * Возвращает:
 *   {"rev": N}                           — записали, вот новая версия
 *   {"stale": true, "data": …, "rev": N} — в базе свежее, вот она; принимай и не затирай
 */
create or replace function public.save_progress(p_data jsonb, p_rev bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  cur_rev  bigint;
  cur_data jsonb;
  new_rev  bigint;
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

  select pr.rev, pr.data into cur_rev, cur_data
  from public.progress pr
  where pr.user_id = auth.uid()
  for update;

  -- В базе версия свежее той, что видел браузер: другая вкладка или другое устройство успели
  -- раньше. Отдаём их копию, ничего не затирая.
  if cur_rev is not null and cur_rev > coalesce(p_rev, 0) then
    return jsonb_build_object('stale', true, 'data', cur_data, 'rev', cur_rev);
  end if;

  new_rev := coalesce(cur_rev, 0) + 1;

  insert into public.progress as pr (user_id, data, saved_at, updated_at, rev)
  values (auth.uid(), p_data, (extract(epoch from now()) * 1000)::bigint, now(), new_rev)
  on conflict (user_id) do update
    set data = excluded.data,
        -- время ставит сервер: это отметка «когда», а не «кто главнее»
        saved_at = excluded.saved_at,
        updated_at = now(),
        rev = new_rev;

  return jsonb_build_object('rev', new_rev);
end;
$$;

grant execute on function public.save_progress(jsonb, bigint) to authenticated;

-- Прочитать свой прогресс вместе с версией — одним запросом, чтобы браузеру было с чем сравнивать.
create or replace function public.load_progress()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object('data', p.data, 'rev', p.rev)
  from public.progress p
  where p.user_id = auth.uid()
$$;

grant execute on function public.load_progress() to authenticated;
