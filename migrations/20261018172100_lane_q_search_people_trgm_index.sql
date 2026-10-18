-- Users one-roof lane Q (2026-10-18), S10: admin.search_people's display-name probe reads a trigram index.
-- (auth.users is owned by supabase_auth_admin, so no index of ours can go on its email / name columns: that
-- probe is a scan of auth.users — 856 rows today. iam.users carries no email or name to index instead.)
create index concurrently if not exists profiles_display_name_lower_trgm
  on users.profiles using gin (lower(coalesce(display_name, '')) public.gin_trgm_ops);
