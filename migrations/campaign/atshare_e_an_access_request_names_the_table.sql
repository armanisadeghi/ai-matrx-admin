-- lane: AT-SHARE
-- lock: custom,platform,public
-- scope: an access request about a Table (or Home, or row) names it. `entity_label` read the registry word "Record" and `entity_title` was null for the `record` token, so every notification and inbox row said 'Record'. Fixed at the source: platform.entity_title answers a store record's own name, platform.entity_label answers Table / Home / the Table's word for a row, and the three readers (_access_request_file, access_request_list, access_request_decide) use them. Nothing else about the request flow changes.
-- additive: yes
-- based-on: platform.entity_title(text, uuid) 9728aa00039f9407d6f2f41593419113839a57a9c60d34ed11d2a513eb31d5b9
-- based-on: public.access_request_list(text) b900eb849465308877cd4e4e54a0f9fd5976dd25543b06944e703d9774f9f909
-- based-on: public.access_request_decide(uuid, text, text, text) e3063645f25efa96b4b84f7aef5837d6fed3938738a957f8f1eb108f09933b8b
-- based-on: public._access_request_file(text, uuid, text, text) 40144db3b55c1bf820f88cca2f4df576435b1a76033b3830fba1b3d13e379e38

CREATE OR REPLACE FUNCTION platform.record_entity_title(p_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  -- A Table and a Home are titled by their name; a row by the title field its Table declares.
  select case
           when r.table_id is null or r.table_id = custom.table_kernel_id() then r.data ->> 'name'
           else coalesce(nullif(r.data ->> coalesce(t.data ->> 'title_field', 'name'), ''), nullif(r.data ->> 'name', ''))
         end
    from custom.record r
    left join custom.record t on t.id = r.table_id and t.organization_id = r.organization_id
   where r.id = p_id
$function$;

CREATE OR REPLACE FUNCTION platform.entity_label(p_type text, p_id uuid, p_fallback text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  -- A request about a store record says what kind it is: Table, Home, or the Table's own word for a row ("Order"), never the bare registry word "Record".
  select coalesce(
    case when p_type = 'record' then
      (select case
                when r.table_id is null then 'Home'
                when r.table_id = custom.table_kernel_id() then 'Table'
                else coalesce(nullif(initcap(t.data ->> 'label_singular'), ''), p_fallback)
              end
         from custom.record r
         left join custom.record t on t.id = r.table_id and t.organization_id = r.organization_id
        where r.id = p_id)
    end, p_fallback)
$function$;

CREATE OR REPLACE FUNCTION platform.entity_title(p_type text, p_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'platform'
AS $function$
declare
  v_schema text;
  v_table text;
  v_title_col text;
  v_title text;
begin
  if p_type is null or p_id is null then
    return null;
  end if;

  -- AT-SHARE: a record of the store (a Table, a Home or a row) is titled by its own document, not by a registry column.
  if p_type = 'record' then
    return platform.record_entity_title(p_id);
  end if;

  select schema_name, table_name, title_column
    into v_schema, v_table, v_title_col
  from platform.entity_types
  where token = p_type;

  -- SCOPES-READS-ACCESS (2026-10-05): read where the rows live now (a scope from the record store).
  select s.schema_name, s.table_name into v_schema, v_table from platform.entity_read_source(p_type) s;

  if v_schema is null or v_title_col is null then
    return null;
  end if;

  begin
    execute format('select %I::text from %I.%I where id = $1', v_title_col, v_schema, v_table)
      into v_title
      using p_id;
  exception
    when others then
      return null;
  end;

  return v_title;
end;
$function$;

CREATE OR REPLACE FUNCTION public.access_request_list(p_box text DEFAULT 'inbox'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'platform', 'iam'
AS $function$
declare v_uid uuid := auth.uid(); v_rows jsonb;
begin
  if v_uid is null then return '[]'::jsonb; end if;
  if p_box = 'sent' then
    select coalesce(jsonb_agg(row_json order by created_at desc), '[]'::jsonb) into v_rows
    from (
      select ar.created_at, jsonb_build_object(
        'id', ar.id, 'status', ar.status, 'requested_level', ar.requested_level,
        'message', ar.message, 'created_at', ar.created_at, 'decided_at', ar.decided_at,
        'decision_note', ar.decision_note, 'resource_type', ar.resource_type,
        'resource_id', ar.resource_id,
        'entity_label', case
          when ar.request_kind = 'setting' then 'Organization setting'
          else coalesce(ar.request_payload->>'entity_label', platform.entity_label(ar.resource_type, ar.resource_id, et.label)) end,
        'entity_title', case
          when ar.request_kind = 'setting' then ar.request_payload->>'setting_label'
          else coalesce(ar.request_payload->>'entity_title', platform.entity_title(ar.resource_type, ar.resource_id)) end,
        'request_kind', ar.request_kind, 'request_key', ar.request_key,
        'request_payload', ar.request_payload
      ) row_json
      from iam.access_requests ar
      left join platform.entity_types et on et.token = ar.resource_type
      where ar.created_by = v_uid and ar.deleted_at is null
        -- RC-A2m: a request is listed only while the not-found split lets the asker know of the record
        and (ar.request_kind = 'setting'
             or (public.access_denied_context(ar.resource_type, ar.resource_id) ->> 'exists') = 'true')
    ) s;
    return v_rows;
  end if;

  select coalesce(jsonb_agg(row_json order by created_at desc), '[]'::jsonb) into v_rows
  from (
    select ar.created_at, jsonb_build_object(
      'id', ar.id, 'status', ar.status, 'requested_level', ar.requested_level,
      'message', ar.message, 'created_at', ar.created_at,
      'resource_type', ar.resource_type, 'resource_id', ar.resource_id,
      'entity_label', case
        when ar.request_kind = 'setting' then 'Organization setting'
        else coalesce(ar.request_payload->>'entity_label', platform.entity_label(ar.resource_type, ar.resource_id, et.label)) end,
      'entity_title', case
        when ar.request_kind = 'setting' then ar.request_payload->>'setting_label'
        else coalesce(ar.request_payload->>'entity_title', platform.entity_title(ar.resource_type, ar.resource_id)) end,
      'request_kind', ar.request_kind, 'request_key', ar.request_key,
      'request_payload', ar.request_payload,
      'requester', jsonb_build_object('user_id', ar.created_by,
        'display_name', nullif(pr.display_name, ''), 'avatar_url', nullif(pr.avatar_url, ''))
    ) row_json
    from iam.access_requests ar
    left join platform.entity_types et on et.token = ar.resource_type
    left join users.profiles pr on pr.id = ar.created_by
    where ar.status = 'pending' and ar.deleted_at is null and ar.created_by <> v_uid
      and (
        (ar.request_kind in ('resource_access', 'resource_action')
          and iam.can_decide_access_request(v_uid, ar.resource_type, ar.resource_id))
        or (ar.request_kind = 'resource_action'
          and coalesce(ar.request_payload->'recipient_ids', '[]'::jsonb) ? v_uid::text)
        or (ar.request_kind = 'setting' and exists (
          select 1 from iam.organization_member m
          where m.organization_id = ar.resource_id and m.user_id = v_uid
            and m.role in ('owner', 'admin')
        ))
      )
  ) s;
  return v_rows;
end;
$function$;

CREATE OR REPLACE FUNCTION public.access_request_decide(p_request_id uuid, p_decision text, p_level text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'platform', 'iam'
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_req record;
  v_level public.permission_level;
  v_meta record;
  v_attrs record;
  v_can_decide boolean;
  v_res jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if p_decision not in ('grant', 'decline', 'complete') then
    raise exception 'Unsupported decision.' using errcode = '22023';
  end if;

  select * into v_req
  from iam.access_requests
  where id = p_request_id and deleted_at is null
  for update;

  if v_req.id is null then
    raise exception 'That request no longer exists.' using errcode = '02000';
  end if;
  if v_req.created_by = v_uid then
    raise exception 'You cannot answer your own request.' using errcode = '42501';
  end if;
  if v_req.status <> 'pending' then
    return jsonb_build_object('id', v_req.id, 'status', v_req.status,
                              'already', true);
  end if;

  v_can_decide := iam.can_decide_access_request(
    v_uid, v_req.resource_type, v_req.resource_id
  ) or (
    v_req.request_kind = 'resource_action'
    and coalesce(v_req.request_payload->'recipient_ids', '[]'::jsonb) ? v_uid::text
  );
  if not v_can_decide then
    raise exception 'You are not able to answer this request.' using errcode = '42501';
  end if;

  if p_decision = 'complete' and v_req.request_kind <> 'resource_action' then
    raise exception 'Only an action request can be completed.' using errcode = '22023';
  end if;

  if p_decision = 'grant' then
    select et.schema_name, et.table_name into v_meta
    from platform.entity_types et where et.token = v_req.resource_type;
    if v_meta.schema_name is not null then
      select * into v_attrs
      from platform.entity_row_access_attrs(v_meta.schema_name, v_meta.table_name,
                                            v_req.resource_id);
      if not coalesce(v_attrs.o_found, false) then
        raise exception 'That item no longer exists, so access cannot be granted.'
          using errcode = '02000';
      end if;
    end if;

    v_level := coalesce(nullif(p_level, ''), v_req.requested_level)::public.permission_level;

    -- A shareable resource takes an ordinary grant; a membership container takes
    -- a membership. See access_request_decide_container_grants_membership.sql.
    if exists (select 1 from platform.shareable_resource_registry sr
                where sr.resource_type = v_req.resource_type) then
      -- THE ONE WRITER (T-32e). Approving a request is the owner's/admin's deliberate decision about
      -- this person (owner ruling 2026-09-28), so it gives back access removed earlier.
      v_res := iam.share_with_person(v_req.resource_type, v_req.resource_id, v_req.created_by, v_level,
                                     v_uid, true, 'access_request', null, true, null);
      if not coalesce((v_res ->> 'success')::boolean, false) then
        raise exception '%', v_res ->> 'error'
          using errcode = '42501',
                hint = 'Their access was removed earlier. To give it back, share it with them directly; this request stays open until you decline it.';
      end if;
    elsif exists (select 1 from iam.memberships m
                   where m.container_type = v_req.resource_type
                     and m.deleted_at is null) then
      -- DD-191: LENIENT on purpose — this reads resource_org_id ONLY, and the decider was already
      -- authorized by iam.can_decide_access_request above. mbr_add below runs its own authority.
      perform public.mbr_add(
        v_req.resource_type,
        v_req.resource_id,
        v_req.created_by,
        (select c.resource_org_id
           from iam._container_authz(v_req.resource_type, v_req.resource_id, v_uid, false) c),
        case when v_level = 'admin'::public.permission_level then 'admin'
             else 'member' end,
        'active',
        jsonb_build_object('grant_source', 'access_request',
                           'request_id', p_request_id));
    else
      raise exception 'Access to this % cannot be granted from a request.',
        lower(coalesce((select label from platform.entity_types
                         where token = v_req.resource_type), 'item'))
        using errcode = '42501';
    end if;
  end if;

  update iam.access_requests
     set status = case when p_decision in ('grant', 'complete') then 'granted' else 'declined' end,
         decided_by = v_uid,
         decided_at = now(),
         decision_note = nullif(btrim(p_note), ''),
         requested_level = case when p_decision = 'grant' then v_level::text else requested_level end
   where id = p_request_id;

  return jsonb_build_object(
    'id', p_request_id,
    'status', case when p_decision in ('grant', 'complete') then 'granted' else 'declined' end,
    'already', false,
    'request_kind', v_req.request_kind,
    'action_key', nullif(v_req.request_key, ''),
    'requester_id', v_req.created_by,
    'resource_type', v_req.resource_type,
    'resource_id', v_req.resource_id,
    'entity_label', coalesce(v_req.request_payload->>'entity_label',
      platform.entity_label(v_req.resource_type, v_req.resource_id,
        (select label from platform.entity_types where token = v_req.resource_type))),
    'entity_title', coalesce(v_req.request_payload->>'entity_title',
      platform.entity_title(v_req.resource_type, v_req.resource_id))
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public._access_request_file(p_resource_type text, p_resource_id uuid, p_level text DEFAULT 'viewer'::text, p_message text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'platform', 'iam'
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_command text := coalesce(nullif(p_level, ''), 'viewer');
  v_level text;
  v_kind text := 'resource_access';
  v_request_key text := '';
  v_meta record;
  v_attrs record;
  v_existing record;
  v_org uuid;
  v_id uuid;
  v_recent int;
  v_recipients jsonb;
  v_recipient_ids jsonb;
  v_payload jsonb := '{}'::jsonb;
  v_upgraded boolean := false;
  v_parent_type text; v_parent_id uuid;  -- RC-A2h (N3)
begin
  if v_uid is null then
    raise exception 'Sign in to request access.' using errcode = '42501';
  end if;

  -- 🚨 RC-A2h (N3): A REQUEST FOR A COMMENT IS A REQUEST FOR ITS RECORD. A detail's access only
  -- ever comes from the record it is on (platform.detail_parent_columns); a grant on the comment
  -- itself admits nobody, so filing against it would be a dead end. The request goes to the
  -- record, marked `via` the detail token.
  if platform.token_is_detail(p_resource_type) then
    select et.schema_name, et.table_name into v_meta
      from platform.entity_types et
     where et.token = p_resource_type and coalesce(et.is_active, true);
    if v_meta.schema_name is not null and platform.detail_parent_columns(p_resource_type) is not null then
      execute format('select coalesce(to_jsonb(t) ->> $2, $3), (to_jsonb(t) ->> $4)::uuid from %I.%I t where t.id = $1',
                     v_meta.schema_name, v_meta.table_name)
        into v_parent_type, v_parent_id
        using p_resource_id, (platform.detail_parent_columns(p_resource_type))[1],
              (platform.detail_parent_columns(p_resource_type))[3],
              (platform.detail_parent_columns(p_resource_type))[2];
    end if;
    if v_parent_type is null or v_parent_id is null then
      raise exception 'That % no longer exists.', lower(p_resource_type) using errcode = '02000';
    end if;
    return public._access_request_file(v_parent_type, v_parent_id, p_level, p_message)
           || jsonb_build_object('via', jsonb_build_object('token', p_resource_type));
  end if;

  if v_command = 'delete' then
    v_kind := 'resource_action';
    v_request_key := 'delete';
    v_level := 'admin';
  elsif v_command in ('viewer', 'commenter', 'editor', 'admin') then
    v_level := v_command;
  else
    v_level := 'viewer';
  end if;

  select et.schema_name, et.table_name, et.label into v_meta
  from platform.entity_types et
  where et.token = p_resource_type and coalesce(et.is_active, true);

  if v_meta.schema_name is null then
    raise exception 'We could not identify what you are asking for.'
      using errcode = '22023';
  end if;

  select * into v_attrs
  from platform.entity_row_access_attrs(v_meta.schema_name, v_meta.table_name, p_resource_id);

  if not coalesce(v_attrs.o_found, false) then
    raise exception 'That % no longer exists.', lower(coalesce(v_meta.label, 'item'))
      using errcode = '02000';
  end if;

  if v_kind = 'resource_action' then
    if not platform.detail_parent_access(p_resource_type, p_resource_id, 'editor'::public.permission_level) then
      raise exception 'You need edit access before asking the owner to delete this %.',
        lower(coalesce(v_meta.label, 'item')) using errcode = '42501';
    end if;
    if platform.detail_parent_access(p_resource_type, p_resource_id, 'admin'::public.permission_level) then
      raise exception 'You already have full access to this %.',
        lower(coalesce(v_meta.label, 'item')) using errcode = '23505';
    end if;
  elsif platform.detail_parent_access(p_resource_type, p_resource_id, v_level::public.permission_level) then
    raise exception 'You already have the access you requested for this %.',
      lower(coalesce(v_meta.label, 'item')) using errcode = '23505';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', r.user_id,
           'reason', r.reason,
           'display_name', nullif(pr.display_name, '')
         )), '[]'::jsonb),
         coalesce(jsonb_agg(to_jsonb(r.user_id::text)), '[]'::jsonb)
    into v_recipients, v_recipient_ids
  from iam.access_request_recipients(p_resource_type, p_resource_id) r
  left join users.profiles pr on pr.id = r.user_id;

  if v_recipients = '[]'::jsonb then
    raise exception 'There is nobody who can grant access to this %.',
      lower(coalesce(v_meta.label, 'item')) using errcode = '42501';
  end if;

  if v_kind = 'resource_action' then
    v_payload := jsonb_build_object(
      'action_key', 'delete',
      'action_label', 'Delete ' || coalesce(v_meta.label, 'item'),
      'entity_label', platform.entity_label(p_resource_type, p_resource_id, v_meta.label),
      'entity_title', platform.entity_title(p_resource_type, p_resource_id),
      'recipient_ids', v_recipient_ids
    );
  end if;

  select ar.id, ar.status, ar.request_kind, ar.requested_level, ar.request_key
    into v_existing
  from iam.access_requests ar
  where ar.resource_type = p_resource_type
    and ar.resource_id = p_resource_id
    and ar.created_by = v_uid
    and ar.deleted_at is null
  order by ar.created_at desc
  limit 1;

  if v_existing.status = 'pending' then
    v_upgraded := v_existing.request_kind is distinct from v_kind
      or v_existing.requested_level is distinct from v_level
      or coalesce(v_existing.request_key, '') is distinct from v_request_key;
    if v_upgraded then
      update iam.access_requests
         set request_kind = v_kind,
             request_key = v_request_key,
             request_payload = v_payload,
             requested_level = v_level,
             message = nullif(btrim(p_message), ''),
             updated_at = now(),
             updated_by = v_uid
       where id = v_existing.id;
    end if;
    return jsonb_build_object(
      'request_id', v_existing.id,
      'status', 'pending',
      'already', not v_upgraded,
      'level', v_level,
      'request_kind', v_kind,
      'action_key', nullif(v_request_key, ''),
      'entity_label', platform.entity_label(p_resource_type, p_resource_id, v_meta.label),
      'entity_title', platform.entity_title(p_resource_type, p_resource_id),
      'recipients', case when v_upgraded then v_recipients else '[]'::jsonb end
    );
  end if;
  if v_existing.status = 'reported' then
    raise exception 'You can no longer make requests about this %.',
      lower(coalesce(v_meta.label, 'item')) using errcode = '42501';
  end if;

  select count(*) into v_recent
  from iam.access_requests ar
  where ar.created_by = v_uid
    and ar.created_at > now() - interval '1 day'
    and ar.deleted_at is null;
  if v_recent >= 25 then
    raise exception 'You have sent a lot of access requests today. Try again tomorrow.'
      using errcode = '54000';
  end if;

  -- THE RECORD ANSWERS. A request to be let into something is recorded where that
  -- something lives, so the people who can grant it can see it. It used to be recorded
  -- in an organization chosen for the REQUESTER.
  if platform.entity_is_org_scoped(p_resource_type) then
    v_org := platform.entity_organization_id(p_resource_type, p_resource_id);
  end if;
  if v_org is null then
    raise exception
      'We could not tell which organization this % belongs to, so your request was not filed.',
      lower(coalesce(v_meta.label, 'item'))
      using errcode = '23502',
            hint = 'This kind of record does not carry an organization, so there is nowhere to file a request about it. Ask the owner directly.';
  end if;

  begin
    insert into iam.access_requests
      (organization_id, created_by, resource_type, resource_id, requested_level,
       message, request_kind, request_key, request_payload)
    values
      (v_org, v_uid, p_resource_type, p_resource_id, v_level,
       nullif(btrim(p_message), ''), v_kind, v_request_key, v_payload)
    returning id into v_id;
  exception when unique_violation then
    select ar.id into v_id
    from iam.access_requests ar
    where ar.resource_type = p_resource_type
      and ar.resource_id = p_resource_id
      and ar.created_by = v_uid
      and ar.status = 'pending'
      and ar.deleted_at is null
    limit 1;
    return jsonb_build_object('request_id', v_id, 'status', 'pending',
                              'already', true, 'level', v_level,
                              'request_kind', v_kind, 'recipients', '[]'::jsonb);
  end;

  return jsonb_build_object(
    'request_id', v_id,
    'status', 'pending',
    'already', false,
    'level', v_level,
    'request_kind', v_kind,
    'action_key', nullif(v_request_key, ''),
    'entity_label', platform.entity_label(p_resource_type, p_resource_id, v_meta.label),
    'entity_title', platform.entity_title(p_resource_type, p_resource_id),
    'recipients', v_recipients
  );
end;
$function$;
