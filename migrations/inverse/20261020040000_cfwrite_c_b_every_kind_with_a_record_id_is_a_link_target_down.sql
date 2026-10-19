-- INVERSE of migrations/20261020040000_cfwrite_c_b_every_kind_with_a_record_id_is_a_link_target.sql (lane CF-WRITE-3): drops the trigger and its function, puts custom.entity_back_links back, deletes the link rules the kind registry registered (identified by their note).
-- chair-step: deletes rows this migration inserted, drops one trigger and one function, restores one function body.
-- lock: custom
-- based-on: custom.entity_back_links(uuid, text, uuid, integer, text) 5f69ef74b957d6e136f4d2440f49365784131d881bb61f4785ad06f1e2155d39
set local lock_timeout = '3s';

DROP TRIGGER entity_type_is_a_link_target ON platform.entity_types;
DROP FUNCTION platform._entity_type_is_a_link_target();
DELETE FROM platform.association_types WHERE source_type = 'record' AND notes LIKE '%Registered by the kind registry itself (CF-WRITE-3)%';

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
    raise exception 'A custom row cannot link to "%": it is not a kind of platform thing a record may point at.', v_token
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
