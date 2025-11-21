-- Create function to get complete user session data in a single query
-- This combines auth data, admin status, and user preferences

create or replace function public.get_user_session_data(p_user_id uuid)
returns table (
  is_admin boolean,
  preferences jsonb,
  preferences_exists boolean
)
language plpgsql
security definer
as $$
begin
  return query
  select
    exists(select 1 from public.admins where user_id = p_user_id) as is_admin,
    coalesce(up.preferences, '{}'::jsonb) as preferences,
    (up.user_id is not null) as preferences_exists
  from
    (select p_user_id as uid) as user_check
  left join public.user_preferences up on up.user_id = user_check.uid;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_user_session_data(uuid) to authenticated;

-- Add comment for documentation
comment on function public.get_user_session_data(uuid) is
'Fetches complete user session data including admin status and preferences in a single query. Returns empty preferences object if none exist.';
