-- ops.server_now(): the database's own clock. The system-errors panel freezes its first page's
-- snapshot on THIS value, so a browser with a skewed clock cannot drop the newest rows
-- (created_at <= snapshot) the way the server-side handler never could. New function; no based-on.
create or replace function ops.server_now()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select now(); $$;

grant execute on function ops.server_now() to authenticated;
