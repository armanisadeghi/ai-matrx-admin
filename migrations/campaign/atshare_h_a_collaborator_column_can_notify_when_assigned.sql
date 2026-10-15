-- lane: AT-SHARE
-- lock: custom
-- scope: Airtable parity "Collaborator field: notify when assigned". custom.field_notify_on_assign(org, field, on) switches the option on a
--   Collaborator (member) column of a table by DECLARING TWO AUTOMATIONS through the existing door (custom.automation_declare): one when the column
--   is edited (property_edited) and one when a record is added with someone already in it (row_added, guarded by an if). Each runs the existing
--   `notify` step to the person in that column, so delivery, switches and the run log are the automation system's own. The option is remembered on the
--   column by their name ("Notify when assigned: <column>") and the column's id in their steps; switching it off archives them; `p_on` null only reports. Edit on the table
--   to change it, View to read it.
-- additive: yes

CREATE OR REPLACE FUNCTION custom.field_notify_on_assign(p_organization_id uuid, p_field_id uuid, p_on boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
declare
  v_field  jsonb;
  v_table  uuid;
  v_label  text;
  v_ids    jsonb;
  v_a      jsonb;
  v_b      jsonb;
  v_text   text;
  v_id     text;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.field_notify_on_assign');
  select f.data, (f.data ->> 'entity_definition_id')::uuid into v_field, v_table
    from custom.record f
   where f.organization_id = p_organization_id and f.id = p_field_id
     and f.table_id = custom.field_kernel_id() and f.deleted_at is null;
  if v_field is null then
    raise exception 'That column is not a column of this organization.' using errcode = '23503';
  end if;
  perform custom.assert_client_may_change(p_organization_id, v_table, 'custom.field_notify_on_assign',
                                          case when p_on is null then 'viewer' else 'editor' end::public.permission_level, 'table');
  if coalesce(custom.parity_type(v_field), '') <> 'member' then
    raise exception 'Only a column that holds people can tell them they were assigned.'
      using errcode = '22023', hint = 'Choose a Collaborator column.';
  end if;
  v_label := coalesce(nullif(v_field ->> 'label', ''), v_field ->> 'key');
  select coalesce(jsonb_agg(e ->> 'id'), '[]'::jsonb) into v_ids
    from custom.record t,
         lateral jsonb_array_elements(case when jsonb_typeof(t.data -> 'automations') = 'array' then t.data -> 'automations' else '[]'::jsonb end) e
   where t.organization_id = p_organization_id and t.id = v_table
     and (e ->> 'archived_at') is null
     and (e -> 'spec' ->> 'name') like 'Notify when assigned: %'
     and (e -> 'spec')::text like '%' || p_field_id::text || '%';
  if p_on is null then
    return jsonb_build_object('field_id', p_field_id, 'notify_on_assign', jsonb_array_length(v_ids) > 0, 'changed', false, 'automation_ids', v_ids);
  end if;

  if coalesce(p_on, false) then
    if jsonb_array_length(v_ids) > 0 then
      return jsonb_build_object('field_id', p_field_id, 'notify_on_assign', true, 'changed', false,
                                'automation_ids', v_ids, 'says', format('%s already tells people when they are assigned.', v_label));
    end if;
    v_text := format('You were assigned in %s.', (select coalesce(t.data ->> 'name', 'a table') from custom.record t where t.organization_id = p_organization_id and t.id = v_table));
    v_a := custom.automation_declare(p_organization_id, v_table, jsonb_build_object(
      'name', 'Notify when assigned: ' || v_label,
      'trigger', jsonb_build_object('on', 'property_edited', 'field', p_field_id),
      'actions', jsonb_build_array(jsonb_build_object('do', 'notify', 'to', jsonb_build_object('field', p_field_id), 'text', v_text))));
    v_b := custom.automation_declare(p_organization_id, v_table, jsonb_build_object(
      'name', 'Notify when assigned: ' || v_label || ' (new record)',
      'trigger', jsonb_build_object('on', 'row_added'),
      'actions', jsonb_build_array(jsonb_build_object('do', 'if',
        'branches', jsonb_build_array(jsonb_build_object('label', 'Someone is assigned',
          'when', jsonb_build_object('all', jsonb_build_array(jsonb_build_object('value', '{{trigger.' || p_field_id::text || '}}', 'is', 'not_empty'))),
          'actions', jsonb_build_array(jsonb_build_object('do', 'notify', 'to', jsonb_build_object('field', p_field_id), 'text', v_text))))))));
    v_ids := jsonb_build_array(v_a ->> 'automation_id', v_b ->> 'automation_id');
    if not coalesce((v_a ->> 'ok')::boolean, false) or not coalesce((v_b ->> 'ok')::boolean, false) then
      raise exception 'The two automations could not be made: % / %', v_a, v_b using errcode = '22023';
    end if;
    return jsonb_build_object('field_id', p_field_id, 'notify_on_assign', true, 'changed', true, 'automation_ids', v_ids,
                              'says', format('%s now tells people when they are assigned.', v_label));
  end if;

  for v_id in select e from jsonb_array_elements_text(v_ids) e loop
    perform custom.automation_archive(p_organization_id, v_id::uuid);
  end loop;
  return jsonb_build_object('field_id', p_field_id, 'notify_on_assign', false, 'changed', jsonb_array_length(v_ids) > 0,
                            'automation_ids', '[]'::jsonb, 'says', format('%s no longer tells people when they are assigned.', v_label));
end;
$function$;

comment on function custom.field_notify_on_assign(uuid, uuid, boolean) is
  'AT-SHARE — switches "notify when assigned" on a Collaborator column by declaring (or archiving) two automations through the existing door. Edit on the table.';

insert into platform.client_callable_door
  (schema_name, function_name, identity_args, identity_argtypes, reason, declared_by,
   non_client_lane, signed_in_callers, anonymous_callers, anonymous_purpose, argument_rules)
values
  ('custom', 'field_notify_on_assign', 'p_organization_id uuid, p_field_id uuid, p_on boolean',
   array['uuid'::regtype, 'uuid'::regtype, 'boolean'::regtype]::oid[],
   'Switches the Collaborator column option "Notify when assigned" on or off, from the column editor.',
   'atshare_h_a_collaborator_column_can_notify_when_assigned.sql', null, true, false, null,
   jsonb_build_object('version', 1, 'declared_by', 'atshare_h_a_collaborator_column_can_notify_when_assigned.sql',
     'declared_at', '2026-10-15 lane AT-SHARE, read from the body and exercised in scripts/campaign-tests/atshare_notify_on_assign_green.sql',
     'arguments', jsonb_build_object(
       'p_organization_id', jsonb_build_object('type', 'uuid', 'position', 1, 'optional', false, 'entity', 'organization',
         'check', 'custom.assert_client_may_reach(arg1), the organization wall, taken before anything is read.',
         'foreign', jsonb_build_object('sqlstate', '42501', 'same_as_invented', true),
         'verified', 'exercised in scripts/campaign-tests/atshare_notify_on_assign_green.sql, rolled back'),
       'p_field_id', jsonb_build_object('type', 'uuid', 'position', 2, 'optional', false, 'entity', 'custom_record',
         'check', 'the column must be a live column of this organization (23503 otherwise), then custom.assert_client_may_change(its table) at Edit.',
         'foreign', jsonb_build_object('sqlstate', '23503', 'same_as_invented', true),
         'verified', 'exercised in scripts/campaign-tests/atshare_notify_on_assign_green.sql, rolled back'),
       'p_on', jsonb_build_object('type', 'boolean', 'position', 3, 'optional', false, 'entity', null,
         'entity_reason', 'a switch; names no record', 'check', 'coalesce(arg3, false)', 'foreign', jsonb_build_object('note', 'not an id'),
         'null_rule', jsonb_build_object('means', 'off'), 'verified', 'read from the body'))))
on conflict do nothing;

grant execute on function custom.field_notify_on_assign(uuid, uuid, boolean) to authenticated;
