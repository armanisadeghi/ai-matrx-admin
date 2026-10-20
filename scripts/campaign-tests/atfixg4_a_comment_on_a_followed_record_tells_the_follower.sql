-- AT-FIX-G4 — A COMMENT ON A FOLLOWED RECORD TELLS ITS FOLLOWER, AND THE NOTICE NAMES THE RECORD.
--
-- Walked live 2026-10-19: admin followed a record, test@test.com changed it (notice came) and then commented on it
-- (NO notice). The comment was written with metadata {} because custom.io_comment_write read the Table id from
-- custom.read_record(...) ->> 'table_id' (that door answers field values, never a table_id); the follow trigger needs
-- metadata.table_id. And the change notice said "an untitled record" for a titled row (read_record(.., true) is keyed by
-- field id, title_field is a field key).
--
-- Inside one rolled-back transaction in admin@admin.com's Workspace: a table with a title, one titled record; the member
-- (test@test.com) follows it; admin comments. RED unless the comment carries its table_id, the member gets exactly one
-- follow notice for it, and that notice names the record by its title.
--
-- Main database, read-only in effect: every write is rolled back.

\set ON_ERROR_STOP on
\timing off
\set suite 'atfixg4_a_comment_on_a_followed_record_tells_the_follower.sql'
\set requires 'function:custom.record_follow_set'
\i scripts/campaign-tests/_preamble.sql
\if :matrx_skip
\quit
\endif

begin;
set local statement_timeout = '50s';
set local lock_timeout = '10s';

do $t$
declare
  c_org    constant uuid := '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f';   -- admin's Workspace
  c_admin  constant text := '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}';
  c_member constant text := '{"sub":"4060701e-706a-4c76-b3ca-0bbc69fa5a14","role":"authenticated","email":"test@test.com"}';
  v_home uuid; v_spec jsonb; v_table uuid; v_rec uuid; v_comment uuid;
  v_meta jsonb; v_subject text; v_n integer; v_fail text[] := '{}';
begin
  perform set_config('role', 'postgres', true);
  select (t.data ->> 'parent_id')::uuid into v_home from custom.record t
   where t.organization_id = c_org and t.table_id = custom.table_kernel_id() and t.deleted_at is null and t.data ? 'parent_id' limit 1;
  if v_home is null then raise exception 'RED — the Workspace % has no table with a home; the fixture is gone', c_org; end if;
  v_spec := jsonb_build_object('name', 'G4 follow probe', 'slug', 'g4_follow_probe', 'type', 'entity', 'weight', 'light',
    'display', 'list', 'ordered', false, 'parent_id', v_home, 'row_order', 'sorted', 'title_field', 'name',
    'default_sort', '[{"field":"name","direction":"asc"}]'::jsonb, 'label_plural', 'G4 probes',
    'label_singular', 'G4 probe', 'agent_writable', true, 'retention_days', 30,
    'fields', '[{"name":"name"},{"name":"qty"}]'::jsonb);
  perform set_config('request.jwt.claims', c_admin, true);
  perform set_config('role', 'authenticated', true);
  v_table := custom.table_declare(c_org, v_spec);
  v_rec := custom.record_write(c_org, v_table, '{"name":"Followed probe row"}'::jsonb);
  if v_rec is null then raise exception 'RED — record_write did not answer an id (fixture shape changed)'; end if;

  -- the member follows it
  perform set_config('request.jwt.claims', c_member, true);
  perform custom.record_follow_set(c_org, v_rec, true);

  -- admin comments
  perform set_config('request.jwt.claims', c_admin, true);
  perform custom.comment_write(c_org, v_rec, 'G4 probe comment');
  perform set_config('role', 'postgres', true);
  select c.id into v_comment from platform.comments c where c.entity_id = v_rec order by c.created_at desc limit 1;
  select c.metadata into v_meta from platform.comments c where c.id = v_comment;
  if (v_meta ->> 'table_id') is distinct from v_table::text then
    v_fail := v_fail || format('the comment carries table_id %s, not the record''s table %s', coalesce(v_meta ->> 'table_id', 'nothing'), v_table);
  end if;
  select count(*), min(n.subject) into v_n, v_subject from communication.notification n
   where n.event_key = 'custom.record.follow' and n.recipient_user_id = '4060701e-706a-4c76-b3ca-0bbc69fa5a14'
     and n.target_id = v_rec and n.dedupe_key like 'custom.follow:comment:%';
  if v_n <> 1 then v_fail := v_fail || format('the follower got %s comment notices, not 1', v_n); end if;
  if v_subject is not null and v_subject !~ 'Followed probe row' then
    v_fail := v_fail || format('the notice does not name the record by its title: "%s"', v_subject);
  end if;
  if cardinality(v_fail) > 0 then raise exception 'RED — %', array_to_string(v_fail, '; '); end if;
  raise notice 'GREEN — the follower was told of the comment: "%"', v_subject;
end
$t$;

rollback;
