-- additive: yes
-- Rows, one trigger function + trigger, and one function body. Registers a record -> kind link rule for every active kind whose table has a record id (those that have none yet; a hand-registered rule and a rule someone switched off are never touched), keeps that true for every kind added or changed later, and makes custom.entity_back_links say WHY a kind truly cannot be linked. Nothing is dropped, revoked or deleted.
-- lane: CF-WRITE-3
-- lock: custom
-- Inverse: migrations/inverse/20261020040000_cfwrite_c_b_every_kind_with_a_record_id_is_a_link_target_down.sql
-- based-on: custom.entity_back_links(uuid, text, uuid, integer, text) fcdcbf8623bd679f50608fc847c012fa2231c31ba4a386a69eadb304c6e0a016
--
-- CF-WRITE-3 - ANY REGISTERED KIND WITH A RECORD ID IS A LINK TARGET, DERIVED FROM THE KIND REGISTRY.
-- 1107 of 1233 kinds were not link targets because a record -> kind association type had to be registered by hand, kind by
-- kind (the last lane did it for hr_pay_period alone), so the super-admin "Not linkable" badge showed on nearly every record.
--   1. backfill: one record -> kind rule (conveys no access, as the sibling rules) for every active kind with an id column.
--   2. platform._entity_type_is_a_link_target + trigger on platform.entity_types: a kind added or rewritten gets its rule.
--      It inserts only when NO rule exists for the kind, so hand-registered rules (agent, hr_pay_group, ...) and rules
--      someone switched off stay exactly as they are.
--   3. custom.entity_back_links: the refusal for a kind that truly cannot be linked now carries the reason.
set local lock_timeout = '3s';

CREATE OR REPLACE FUNCTION platform._entity_type_is_a_link_target()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.is_active and new.token <> 'record'
     and to_regclass(pg_catalog.format('%I.%I', new.schema_name, new.table_name)) is not null
     and exists (select 1 from pg_catalog.pg_attribute a
                  where a.attrelid = to_regclass(pg_catalog.format('%I.%I', new.schema_name, new.table_name))
                    and a.attname = 'id' and a.attnum > 0 and not a.attisdropped)
     and not exists (select 1 from platform.association_types r
                      where r.source_type = 'record' and r.target_type = new.token) then
    insert into platform.association_types (source_type, target_type, container_side, conveys_max, is_active, notes)
    values ('record', new.token, 'none', 'viewer', true,
            'SC-R (2026-09-24): an entity-reference Field on a record points at this kind of thing. The edge carries the field (relation_field_id, role = field key) and conveys no access. Registered by the kind registry itself (CF-WRITE-3): every kind with a record id is a link target.');
  end if;
  return null;
end
$function$;

CREATE TRIGGER entity_type_is_a_link_target
  AFTER INSERT OR UPDATE ON platform.entity_types
  FOR EACH ROW EXECUTE FUNCTION platform._entity_type_is_a_link_target();

INSERT INTO platform.association_types (source_type, target_type, container_side, conveys_max, is_active, notes)
SELECT 'record', e.token, 'none', 'viewer', true,
       'SC-R (2026-09-24): an entity-reference Field on a record points at this kind of thing. The edge carries the field (relation_field_id, role = field key) and conveys no access. Registered by the kind registry itself (CF-WRITE-3): every kind with a record id is a link target.'
  FROM platform.entity_types e
 WHERE e.is_active AND e.token <> 'record'
   AND to_regclass(format('%I.%I', e.schema_name, e.table_name)) IS NOT NULL
   AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = to_regclass(format('%I.%I', e.schema_name, e.table_name))
                  AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped)
   AND NOT EXISTS (SELECT 1 FROM platform.association_types r WHERE r.source_type = 'record' AND r.target_type = e.token);

CREATE OR REPLACE FUNCTION custom.entity_back_links(p_organization_id uuid, p_token text, p_record_id uuid, p_limit integer DEFAULT 50, p_cursor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_token  text := lower(btrim(coalesce(p_token, '')));
  v_limit  integer := coalesce(p_limit, 50);
  v_me     uuid;
  v_owner  boolean;
  v_kind   text;
  v_why    text;
  v_c_at   timestamptz;
  v_c_id   uuid;
  v_raw    text;
  v_items  jsonb;
  v_n      integer;
  v_next   text;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.entity_back_links');

  if v_token = '' or p_record_id is null then
    raise exception 'Name the record whose links you want: its kind and its id.'
      using errcode = '22023',
            hint = 'AP-4: custom.entity_back_links(organization, ''hr_employee'', <employee id>).';
  end if;
  if v_limit < 1 or v_limit > 200 then
    raise exception 'A page of links holds 1 to 200 rows, and this asked for %.', v_limit
      using errcode = '22023', hint = 'AP-4: ask a smaller page and follow next_cursor.';
  end if;

  select k.label into v_kind from custom.entity_reference_kinds() k where k.token = v_token;
  if v_kind is null then
    -- CF-WRITE-3: THE REASON, so the badge a super admin sees says WHY (every kind with a record id is a link target by itself).
    select case
             when e.token is null then 'it is not a registered kind of platform thing'
             when not e.is_active then 'that kind is switched off in the registry'
             when to_regclass(format('%I.%I', e.schema_name, e.table_name)) is null
               or not exists (select 1 from pg_attribute a
                               where a.attrelid = to_regclass(format('%I.%I', e.schema_name, e.table_name))
                                 and a.attname = 'id' and a.attnum > 0 and not a.attisdropped)
               then 'its rows carry no record id, so a link has nothing to point at'
             else 'its link rule is switched off in the link-type registry'
           end
      into v_why
      from (select 1) x left join platform.entity_types e on e.token = v_token;
    raise exception 'A custom row cannot link to "%": %.', v_token, v_why
      using errcode = '22023',
            hint = 'select token, label from custom.entity_reference_kinds() lists every kind a link may name.';
  end if;

  if nullif(btrim(coalesce(p_cursor, '')), '') is not null then
    begin
      v_raw  := convert_from(decode(p_cursor, 'base64'), 'UTF8');
      v_c_at := split_part(v_raw, '|', 1)::timestamptz;
      v_c_id := split_part(v_raw, '|', 2)::uuid;
    exception when others then
      raise exception 'That page marker is not one this list gave out.'
        using errcode = '22023', hint = 'AP-4: pass next_cursor exactly as it came back, or null for the first page.';
    end;
    if v_c_at is null or v_c_id is null then
      raise exception 'That page marker is not one this list gave out.'
        using errcode = '22023', hint = 'AP-4: pass next_cursor exactly as it came back, or null for the first page.';
    end if;
  end if;

  v_me    := custom.query_principal();
  v_owner := custom.query_is_store_owner();

  -- THE TARGET, BEFORE ANY EDGE IS READ: a thing she may not open and an invented id say the same.
  if (v_me is null and not v_owner)
     or not custom._entity_reference_target_ok(p_organization_id, v_token, p_record_id) then
    raise exception 'There is no % you can open with that id.', lower(v_kind)
      using errcode = '02000',
            hint = 'DOOR-1: a record somebody has not shared with you is the same answer as a record that is not there.';
  end if;

  with page as (
    select a.id as edge_id, a.created_at as linked_at, a.role as field_key,
           r.id as rec_id, r.organization_id as rec_org, r.data as rec_data,
           t.id as table_id, t.data as table_data,
           f.id as field_id, f.data as field_data, ttl.title_type
      from platform.associations a
      join custom.record r
        on r.organization_id = a.organization_id and r.id = a.source_id
      join custom.record f
        on f.id = a.relation_field_id
      left join custom.record t
        on t.id = r.table_id
      left join lateral (
        select tf.data ->> 'type' as title_type
          from custom.record tf
         where tf.organization_id = r.organization_id
           and tf.table_id = custom.field_kernel_id()
           and tf.deleted_at is null
           and tf.data ->> 'entity_definition_id' = r.table_id::text
           and tf.data ->> 'key' = t.data ->> 'title_field'
         limit 1) ttl on true
     where a.target_type = v_token
       and a.target_id = p_record_id
       and a.deleted_at is null
       and a.source_type = 'record'
       and a.relation_field_id is not null
       and (v_c_at is null or (a.created_at, a.id) < (v_c_at, v_c_id))
       and r.deleted_at is null
       and r.data_class = 'record'
       and coalesce(r.metadata ->> 'quarantine', 'false') <> 'true'
       and f.deleted_at is null
       and f.table_id = custom.field_kernel_id()
       and (v_owner
            or (v_me is not null
                and iam.has_access_for(v_me, 'record', r.id, 'viewer'::public.permission_level)
                and (custom.read_mask(r.organization_id, r.id, 'read') -> 'visible') ? a.role))
     order by a.created_at desc, a.id desc
     limit v_limit + 1
  ), numbered as (
    select p.*, row_number() over (order by p.linked_at desc, p.edge_id desc) as n from page p
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'record', jsonb_build_object(
              'token', 'record', 'id', x.rec_id,
              -- HR-360-2: a title typed into a plain text column is WORDS, never a pointer. A review's title is
              -- its reference (a uuid in a text field); read as a record id it came back as "A record you have
              -- not been given access to" for the very people the table names as readers. Only a title that
              -- lives in a relation-typed column is resolved (and withheld when it points at a hidden record).
              'label', coalesce(custom._row_label_text(x.rec_org, x.table_id, x.rec_id, x.table_data -> 'row_label_expr'),
                           case when x.title_type in ('text', 'long_text', 'email', 'phone', 'url')
                            and nullif(btrim(coalesce(x.rec_data ->> (x.table_data ->> 'title_field'), '')), '') is not null
                            then case when (x.rec_data ->> (x.table_data ->> 'title_field')) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                                      then coalesce(nullif(x.table_data ->> 'label_singular', ''), nullif(x.table_data ->> 'name', ''), 'record')
                                      else x.rec_data ->> (x.table_data ->> 'title_field') end
                            else custom._card_words(x.rec_org,
                                   coalesce(x.rec_data ->> (x.table_data ->> 'title_field'),
                                            (select l.cached_title from custom.external_link l
                                              where l.record_id = x.rec_id and l.organization_id = x.rec_org
                                              limit 1)),
                                   'record') end)),
           'table_id',        x.table_id,
           'table_label',     x.table_data ->> 'name',
           'field_id',        x.field_id,
           'field_key',       x.field_key,
           'field_label',     coalesce(nullif(x.field_data ->> 'label', ''), nullif(x.field_data ->> 'name', ''), x.field_key),
           'organization_id', x.rec_org,
           'linked_at',       x.linked_at)
           order by x.linked_at desc, x.edge_id desc) filter (where x.n <= v_limit), '[]'::jsonb),
         count(*),
         max(x.linked_at::text || '|' || x.edge_id::text) filter (where x.n = v_limit)
    into v_items, v_n, v_raw
    from numbered x;

  -- A NEXT PAGE EXISTS ONLY WHEN ONE MORE ROW THAN ASKED WAS FOUND; its marker is the last row shown.
  if v_n > v_limit then
    v_next := replace(encode(convert_to(v_raw, 'UTF8'), 'base64'), E'\n', '');
  end if;

  return jsonb_build_object(
    'target', jsonb_build_object('token', v_token, 'id', p_record_id,
                                 'label', platform.relation_label(p_organization_id, v_token, p_record_id)),
    'items', v_items,
    'next_cursor', v_next);
end
$function$;
