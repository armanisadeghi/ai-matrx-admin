-- chair-step: canonicalization lane 6 drops the legacy owner column user_id from canvas.canvas_scores and canvas.canvas_views; created_by already holds the same person on every row (scores 0 differ; views 1 row differs where user_id is NULL and created_by is the person) and is what every policy reads
-- based-on: canvas.submit_canvas_score(uuid, integer, integer, boolean, uuid, integer, jsonb) 92ad39fdefea3eebad234eabe0720976870edc7604e2bc45f88dbcebea7d12bb
-- based-on: canvas.record_canvas_view(uuid, uuid, text, text) 9c57e61b313b6fd7b071ecdc35f5b6f80774481d267f192bb67822f56568211e
-- based-on: public.update_canvas_high_score() 0dcc78bfdce7eea5625411d3bc5e8e41edf0e7f71e24f784e8f0fba35228aedd
-- based-on: platform._search_item_sync_canvas_score() c12bcc8a87d503f3f0462aeddb9ae354b6d7020018f8ce107da0f9b121346502
-- lane: canonicalization lane 6. Clears legacy_owner_col on canvas_score / canvas_view.
-- Readers repointed in the same change: hooks/canvas/useLeaderboard.ts, hooks/canvas/useCanvasScore.ts,
-- types/canvas-social.ts. The two writer RPCs and the high-score trigger read created_by instead.
set lock_timeout = '2s';

CREATE OR REPLACE FUNCTION canvas.submit_canvas_score(p_canvas_id uuid, p_score integer, p_max_score integer, p_completed boolean, p_organization_id uuid, p_time_taken integer DEFAULT NULL::integer, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_prior_high integer;
  v_prior_best integer;
  v_attempts integer;
  v_row canvas.canvas_scores%rowtype;
  v_rank integer;
begin
  if v_uid is null then
    raise exception 'submit_canvas_score: sign in to record a score' using errcode = '42501';
  end if;
  if p_canvas_id is null or p_score is null or p_max_score is null or p_completed is null then
    raise exception 'submit_canvas_score: p_canvas_id, p_score, p_max_score and p_completed are required' using errcode = '22023';
  end if;
  if p_time_taken is not null and p_time_taken < 0 then
    raise exception 'submit_canvas_score: p_time_taken cannot be negative' using errcode = '22023';
  end if;

  -- Access before existence.
  if not exists (
    select 1 from canvas.shared_canvas_items s
     where s.id = p_canvas_id
       and s.deleted_at is null
       and (s.visibility = 'public'::platform.visibility
            or s.created_by = v_uid
            or iam.has_access('shared_canvas_item', s.id, 'viewer'::permission_level))
  ) then
    raise exception 'submit_canvas_score: canvas not found or not visible to you' using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'submit_canvas_score: p_organization_id is required — the caller names the organization, the database never chooses one' using errcode = '22023';
  end if;
  if not iam.has_org_access(p_organization_id) then
    raise exception 'submit_canvas_score: you are not a member of that organization' using errcode = '42501';
  end if;

  -- One attempt at a time per (canvas, caller): attempt numbers never collide.
  perform pg_advisory_xact_lock(hashtextextended('canvas_score:' || p_canvas_id::text || ':' || v_uid::text, 0));

  select count(*), max(sc.score) into v_attempts, v_prior_best
    from canvas.canvas_scores sc
   where sc.canvas_id = p_canvas_id and sc.created_by = v_uid and sc.deleted_at is null;

  select s.high_score into v_prior_high from canvas.shared_canvas_items s where s.id = p_canvas_id;

  select nullif(btrim(p.display_name), '') into v_name
    from users.profiles p where p.id = v_uid and p.deleted_at is null;
  if v_name is null then
    select nullif(btrim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')), '')
      into v_name from auth.users u where u.id = v_uid;
  end if;

  insert into canvas.canvas_scores (
    canvas_id, organization_id, created_by, username, display_name,
    score, max_score, time_taken, completed, attempt_number, data
  ) values (
    p_canvas_id, p_organization_id, v_uid, v_name, v_name,
    p_score, p_max_score, p_time_taken, p_completed, v_attempts + 1, coalesce(p_data, '{}'::jsonb)
  )
  returning * into v_row;

  select count(*) + 1 into v_rank
    from canvas.canvas_scores sc
   where sc.canvas_id = p_canvas_id and sc.deleted_at is null and sc.score > p_score;

  return jsonb_build_object(
    'score', to_jsonb(v_row),
    'rank', v_rank,
    'is_high_score', v_prior_high is null or p_score > v_prior_high,
    'beats_own_best', v_prior_best is null or p_score > v_prior_best,
    'attempt_number', v_row.attempt_number
  );
end;
$function$;

CREATE OR REPLACE FUNCTION canvas.record_canvas_view(p_canvas_id uuid, p_organization_id uuid, p_session_id text DEFAULT NULL::text, p_referrer text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'record_canvas_view: sign in to record a view' using errcode = '42501';
  end if;
  if p_canvas_id is null then
    raise exception 'record_canvas_view: p_canvas_id is required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from canvas.shared_canvas_items s
     where s.id = p_canvas_id
       and s.deleted_at is null
       and (s.visibility = 'public'::platform.visibility
            or s.created_by = v_uid
            or iam.has_access('shared_canvas_item', s.id, 'viewer'::permission_level))
  ) then
    raise exception 'record_canvas_view: canvas not found or not visible to you' using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'record_canvas_view: p_organization_id is required — the caller names the organization, the database never chooses one' using errcode = '22023';
  end if;
  if not iam.has_org_access(p_organization_id) then
    raise exception 'record_canvas_view: you are not a member of that organization' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('canvas_view:' || p_canvas_id::text || ':' || v_uid::text, 0));

  -- Rate safety: one view per (canvas, caller) per hour.
  if exists (
    select 1 from canvas.canvas_views v
     where v.canvas_id = p_canvas_id and v.created_by = v_uid and v.deleted_at is null
       and v.viewed_at > now() - interval '1 hour'
  ) then
    return false;
  end if;

  insert into canvas.canvas_views (canvas_id, organization_id, created_by, session_id, referrer, viewed_at)
  values (p_canvas_id, p_organization_id, v_uid,
          left(nullif(p_session_id, ''), 128), left(nullif(p_referrer, ''), 2048), now());
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_canvas_high_score()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_canvas_id uuid := COALESCE(NEW.canvas_id, OLD.canvas_id);
    v_high_score integer;
    v_high_score_user uuid;
    v_total_attempts integer;
    v_average_score numeric;
BEGIN
    SELECT s.score, s.created_by
      INTO v_high_score, v_high_score_user
      FROM canvas.canvas_scores s
     WHERE s.canvas_id = v_canvas_id AND s.deleted_at IS NULL
     ORDER BY s.score DESC, s.created_at ASC
     LIMIT 1;

    SELECT COUNT(*), AVG(score)
      INTO v_total_attempts, v_average_score
      FROM canvas.canvas_scores
     WHERE canvas_id = v_canvas_id AND deleted_at IS NULL;

    UPDATE canvas.shared_canvas_items
       SET high_score = v_high_score,
           high_score_user = v_high_score_user,
           total_attempts = COALESCE(v_total_attempts, 0),
           average_score = v_average_score
     WHERE id = v_canvas_id;

    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION platform._search_item_sync_canvas_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    perform platform._search_item_drop('canvas_score', old.id);
    return null;
  end if;
  if tg_op = 'UPDATE'
     and (old.display_name, old.organization_id, old.created_by, old.deleted_at) is not distinct from (new.display_name, new.organization_id, new.created_by, new.deleted_at)
       and date_trunc('hour', new.updated_at) = date_trunc('hour', old.updated_at) then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    perform platform._search_item_drop('canvas_score', old.id);
  end if;
  if new.organization_id is not null and new.deleted_at is null then
    perform platform._search_item_put('canvas_score', new.id, new.organization_id, new.created_by, null::platform.visibility, coalesce(nullif(btrim(new.display_name::text), ''), 'Untitled canvas score' || coalesce(' ' || to_char(new.created_at, 'YYYY-MM-DD'), '')), null::text, '{}'::text[], new.updated_at, null::text, null::text);
  else
    perform platform._search_item_drop('canvas_score', new.id);
  end if;
  return null;
end
$function$;

alter table canvas.canvas_scores drop column user_id;
alter table canvas.canvas_views drop column user_id;
