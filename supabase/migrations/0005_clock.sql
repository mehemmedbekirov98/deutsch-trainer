-- Часы устройства больше не могут навсегда заклинить сохранение.
--
-- Запускать после 0004_limits.sql: SQL Editor → вставить → Run.
--
-- Какая копия прогресса новее, решает `saved_at` — а присылает его сам браузер. Обычно это
-- правильно: две вкладки одного человека так и разбираются между собой. Но часы бывают сбиты, и
-- тогда достаточно одного сохранения с датой из 2099 года, чтобы сервер навсегда счёл её самой
-- свежей: каждое следующее честное сохранение приходит «устаревшим» и отбрасывается. Человек
-- продолжает заниматься, прогресс идёт только в его браузере, и никто ничего не замечает —
-- до дня, когда он зайдёт с другого устройства и увидит пустоту.
--
-- Лечится в два хода, и второй важнее первого.
--
--   1. Дата не может быть из будущего дальше, чем на сутки. Сутки, а не ноль, потому что
--      часовые пояса и небольшой сдвиг часов — это норма, а не поломка.
--   2. Если в базе УЖЕ лежит дата из будущего, она перестаёт быть препятствием: такой записи
--      веры нет, и её перекрывает любое честное сохранение. Без этого пункта одна запись со
--      сбитыми часами всё равно запирала прогресс — просто не навсегда, а на сутки.
--
-- Проверяется в tools/check-access.mjs: сохраняем датой из 2099 года, потом честной — и смотрим,
-- что на сервере лежит именно вторая. Первый вариант этой миграции ту проверку не прошёл.
create or replace function public.save_progress(p_data jsonb, p_saved_at bigint)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  stored jsonb;
  stamp  bigint;
  server_ms bigint;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if public.is_blocked() then
    raise exception 'account blocked';
  end if;
  if pg_column_size(p_data) > 262144 then
    raise exception 'progress too large';
  end if;
  if jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'progress must be an object';
  end if;

  -- миллисекунды, как и в браузере (Date.now())
  server_ms := (extract(epoch from now()) * 1000)::bigint;
  stamp := least(greatest(coalesce(p_saved_at, 0), 0), server_ms + 86400000);

  insert into public.progress as pr (user_id, data, saved_at, updated_at)
  values (auth.uid(), p_data, stamp, now())
  on conflict (user_id) do update
    set data = excluded.data, saved_at = excluded.saved_at, updated_at = now()
    -- …или лежащая запись сама из будущего: доверять ей нечего, перекрываем
    where pr.saved_at <= excluded.saved_at or pr.saved_at > server_ms;

  if not found then
    select p.data into stored from public.progress p where p.user_id = auth.uid();
    return stored;
  end if;
  return null;
end;
$$;

grant execute on function public.save_progress(jsonb, bigint) to authenticated;
