-- why: the section card (records-ui SectionCard) shows each row's open comments so feedback to and from the
--   agent is never hidden (Arman 2026-10-18: "commenting fully and properly set up … critical for feedback with
--   the agent"). One call per card for up to 500 rows, through the SAME reader the thread uses
--   (custom.io_comments), so a row the caller cannot read answers nothing.
create or replace function custom.comment_counts(p_organization_id uuid, p_record_ids uuid[])
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog'
as $function$
declare
  v_out jsonb := '{}'::jsonb;
  v_id  uuid;
  v_n   integer;
begin
  perform custom.assert_client_may_reach(p_organization_id, 'custom.comment_counts');
  if coalesce(array_length(p_record_ids, 1), 0) > 500 then
    raise exception 'Comment counts are read for up to 500 rows at a time, and % were asked for.', array_length(p_record_ids, 1)
      using errcode = '54000', hint = 'Ask for the rows on screen. Nothing was read.';
  end if;
  foreach v_id in array coalesce(p_record_ids, '{}'::uuid[]) loop
    select count(*) into v_n from custom.io_comments(p_organization_id, v_id, false) c;
    if v_n > 0 then v_out := v_out || jsonb_build_object(v_id::text, v_n); end if;
  end loop;
  return v_out;
end;
$function$;


insert into platform.client_callable_door (schema_name, function_name, identity_args, identity_argtypes, reason,
  declared_by, non_client_lane, signed_in_callers, anonymous_callers, gate_predicate, argument_rules)
select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid), platform.door_argtypes(p.proargtypes),
       'How many open comments each named row has, for rows the caller may read (custom.io_comments decides); at most 500 rows.',
       '20261018020000_a_section_card_counts_each_rows_open_comments', null, true, false,
       'public.is_org_member(p_organization_id)',
       '{"version": 1, "arguments": {"p_organization_id": {"type": "uuid", "position": 1, "optional": false, "check": "custom.assert_client_may_reach, decided before the first read", "foreign": {"bounded": true, "note": "A foreign organization is refused before any row is read."}}, "p_record_ids": {"type": "uuid[]", "position": 2, "optional": false, "check": "each id read through custom.io_comments, which answers nothing for a row the caller cannot read", "foreign": {"bounded": true, "note": "A row of another organization counts nothing."}}}}'::jsonb
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'custom' and p.proname = 'comment_counts'
on conflict do nothing;
grant execute on function custom.comment_counts(uuid, uuid[]) to authenticated, service_role;
