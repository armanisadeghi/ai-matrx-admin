-- Create extension_auth_codes table for Chrome extension authentication
-- This table stores temporary codes that users can exchange for sessions

create table if not exists public.extension_auth_codes (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);

-- Add indexes for performance
create index if not exists idx_extension_auth_codes_code 
  on public.extension_auth_codes(code);

create index if not exists idx_extension_auth_codes_user_id 
  on public.extension_auth_codes(user_id);

create index if not exists idx_extension_auth_codes_expires_at 
  on public.extension_auth_codes(expires_at);

-- Enable Row Level Security
alter table public.extension_auth_codes enable row level security;

-- RLS Policies
-- Users can only see their own codes
create policy "Users can view own auth codes"
  on public.extension_auth_codes
  for select
  using (auth.uid() = user_id);

-- Authenticated users can create codes (insert via API will validate user)
create policy "Service role can insert auth codes"
  on public.extension_auth_codes
  for insert
  to service_role
  with check (true);

-- Service role can update codes (for marking as used)
create policy "Service role can update auth codes"
  on public.extension_auth_codes
  for update
  to service_role
  using (true);

-- Service role can delete expired codes
create policy "Service role can delete auth codes"
  on public.extension_auth_codes
  for delete
  to service_role
  using (true);

-- Create a function to clean up expired codes automatically
create or replace function public.cleanup_expired_auth_codes()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.extension_auth_codes
  where expires_at < now() - interval '1 hour';
end;
$$;

-- Optional: Create a cron job to run cleanup daily
-- Note: Requires pg_cron extension
-- select cron.schedule(
--   'cleanup-expired-auth-codes',
--   '0 0 * * *', -- Run daily at midnight
--   $$select public.cleanup_expired_auth_codes()$$
-- );

