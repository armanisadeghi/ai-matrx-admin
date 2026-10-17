-- based-on: public.ues_list(text) 363a83bed32459ae5cc22b0959d5192e2be6eb77c80184dc4affb55b6a2965fd
-- why: ues_list ran iam.has_access (COST 10000) on EVERY state row a person owns, then returned them. 30,849 of the 31,531
--   rows in platform.user_entity_state say nothing (not favorite, pinned or hidden, never viewed) — one account holds 19,500
--   of them (processed_document) — so its ues_list took 7.4 s against the authenticated role's 8 s statement_timeout and
--   answered HTTP 500 (57014) whenever the database was a little busy (the credential vault closing fires it).
--   A row with no flag and no view carries no state for any caller (favorites, pins, hidden, recents), so it is skipped
--   BEFORE the access check. Same signature, same columns, same access rule for every row that is returned.
create or replace function public.ues_list(p_kind text default null::text)
 returns table(entity_type text, entity_id uuid, is_favorite boolean, is_pinned boolean, is_hidden boolean, last_viewed_at timestamp with time zone, updated_at timestamp with time zone)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select entity_type, entity_id, is_favorite, is_pinned, is_hidden, last_viewed_at, updated_at
    from platform.user_entity_state
   where user_id = (select auth.uid())
     -- a row that is no favorite, pin or hidden mark and was never opened says nothing: skip it before the
     -- (expensive) access check below.
     and (is_favorite or is_pinned or is_hidden or last_viewed_at is not null)
     and (p_kind is null
          or (p_kind='favorite' and is_favorite)
          or (p_kind='pinned'   and is_pinned)
          or (p_kind='hidden'   and is_hidden))
     -- RC-A2d (R3): never hand back a record the caller can no longer open.
     and (not exists (select 1 from platform.entity_types et where et.token = platform.user_entity_state.entity_type)
          or iam.has_access(platform.user_entity_state.entity_type, platform.user_entity_state.entity_id,
                            'viewer'::public.permission_level));
$function$;
