#!/usr/bin/env python3
"""ACCESS-REVOKE guard a: A REVOKED SHARE OPENS NO DOOR, AND NOTHING STILL COUNTS IT AS GRANTED.

    cd matrx-frontend && python3 scripts/campaign-tests/accessrevoke_a_a_revoked_share_opens_no_door.py

Live, ONE connection, short transactions. A throwaway organization (fixed ids, below) is planted and
removed at the end: admin@admin.com owns it, test@test.com is NOT a member, so a share is the only way
in. Two Sales deals: D1 is shared, D2 never is (the control: what a stranger gets).

For each way a share reaches her (a RECORD share on D1, a TABLE share on Sales deals):
  1  admin shares (committed, through custom.share_grant as admin's seat);
  2  as test@test.com, in a READ ONLY transaction (the PostgREST branch) AND in a written one: every read
     door is asked. The doors that open D1 are noted (the positive control: a door that never opens a
     shared row proves nothing and is reported as NOT EXERCISED);
  3  admin revokes (committed, custom.share_revoke);
  4  every door is asked again, both branches. RED if any door still returns D1, or answers D1
     differently from D2 (the never-shared control: refused vs content);
  5  RED if custom.read_door_granted_ids still lists D1 (the revoked share still counts as granted),
     or if visible_set(admin) is not "whole Table" once no share is left.

  6  THE SIBLING LISTS (one rolled-back transaction): an admin-owned agent, agent shortcut and chat are shared with
     test@test.com and revoked through iam.remove_grant. RED if any "shared with me" list or search still lists them.
  7  THE CLASS: every client-callable SECURITY DEFINER function that reads iam.permissions applies the in-force
     rule (iam.grant_in_force, or the kernel's own expires_at test), or is a NAMED writer / inspector below.

Exit 0 GREEN, 1 RED, 2 could not run.
"""
import json, re, sys
from pathlib import Path
import psycopg

ORG = 'acc0e000-0000-4a00-8a00-000000000001'
HQ = 'acc0e000-0000-4a00-8a00-000000000011'
TBL = 'acc0e000-0000-4a00-8a00-000000000021'
D1 = 'acc0e000-0000-4a00-8a00-000000000031'
D2 = 'acc0e000-0000-4a00-8a00-000000000032'
ADMIN = '87a6e699-3622-4869-8843-d0867456c0dd'
TEST = '4060701e-706a-4c76-b3ca-0bbc69fa5a14'
WORD = 'Quillfeather'
TITLE = {D1: 'renewal, north region', D2: 'expansion, south region'}

SET_DOORS = [
    ("read_records", "select row_to_json(t)::text from custom.read_records(%(o)s,%(t)s,false,500,0) t"),
    ("read_records_page", "select custom.read_records_page(%(o)s,%(t)s,null,null,null,null,false,500,0,null)::text"),
    ("read_records_keyset", "select custom.read_records_keyset(%(o)s,%(t)s,null,null,null,null,500,null,%(ids)s::uuid[])::text"),
    ("read_records_matching", "select row_to_json(t)::text from custom.read_records_matching(%(o)s,%(t)s,'{}'::jsonb,false,500,0) t"),
    ("read_records_by_ids", "select row_to_json(t)::text from custom.read_records_by_ids(%(o)s,%(t)s,%(ids)s::uuid[],false) t"),
    ("record_headers", "select row_to_json(t)::text from custom.record_headers(%(o)s,%(ids)s::uuid[]) t"),
    ("io_export", "select custom.io_export(%(o)s,%(t)s,null,5000,'viewer')::text"),
    ("io_export_csv", "select custom.io_export_csv(%(o)s,%(t)s,null,5000,',','viewer')::text"),
    ("query_visible_ids", "select custom.query_visible_ids(%(o)s,%(t)s,'viewer')::text"),
    ("records_search", "select row_to_json(t)::text from custom.records_search(%(w)s,500,0,null,null,false) t"),
    ("records_search_org", "select row_to_json(t)::text from custom.records_search(%(w)s,500,0,array[%(t)s]::uuid[],array[%(o)s]::uuid[],false) t"),
    ("record_aggregate", "select custom.record_aggregate(%(o)s,%(t)s,'[]'::jsonb,'[{\"op\":\"count\"}]'::jsonb,null,null,50,'viewer',null,null,null,false)::text"),
    ("table_list_everywhere", "select row_to_json(t)::text from custom.table_list_everywhere(%(o)s::uuid, false) t"),
]
PER_ID = [
    ("read_record", "select custom.read_record(%(o)s,%(i)s,false)::text"),
    ("record_page_bundle", "select custom.record_page_bundle(%(o)s,%(i)s)::text"),
    ("value_read", "select row_to_json(t)::text from custom.value_read(%(o)s,%(i)s,'title') t"),
    ("record_history", "select row_to_json(t)::text from custom.record_history(%(o)s,%(i)s,50,0) t"),
    ("record_values_versioned", "select row_to_json(t)::text from custom.record_values_versioned(%(o)s,%(i)s) t"),
    ("record_as_of", "select row_to_json(t)::text from custom.record_as_of(%(o)s,%(i)s,now()) t"),
    ("query_can_see", "select custom.query_can_see(%(o)s,%(i)s,'viewer')::text"),
    ("query_record_as_of", "select custom.query_record_as_of(%(o)s,%(i)s,now(),null,'viewer')::text"),
    ("record_scope_context", "select custom.record_scope_context(%(o)s,%(i)s,5,5,5)::text"),
    ("comment_thread", "select custom.comment_thread(%(o)s,%(i)s,true)::text"),
    ("record_table", "select custom.record_table(%(o)s,%(i)s)::text"),
    ("relation_targets", "select row_to_json(t)::text from custom.relation_targets(%(o)s,%(i)s,null) t"),
]


def conn():
    env = {}
    for line in Path('/Users/armanisadeghi/code/aidream/.env').read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return psycopg.connect(host=env['SUPABASE_MATRIX_HOST'], port=5432,
                           dbname=env['SUPABASE_MATRIX_DATABASE_NAME'], user=env['SUPABASE_MATRIX_USER'],
                           password=env['SUPABASE_MATRIX_PASSWORD'], autocommit=True, prepare_threshold=None)


def seat(c, user):
    c.execute("set local statement_timeout = '60s'")
    c.execute("set local lock_timeout = '10s'")
    c.execute("select set_config('app.actor_system', 'campaign-test/accessrevoke', true)")
    c.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({"sub": user, "role": "authenticated"}),))
    c.execute("set local role authenticated")


def ask(c, sql, p):
    """'refused' (an error), 'empty' (no row / null / false / no content), or the text."""
    try:
        with c.transaction():
            rows = c.execute(sql, p).fetchall()
    except psycopg.Error as e:
        return ('refused', e.sqlstate)
    txt = " ".join("" if r[0] is None else str(r[0]) for r in rows)
    if txt.strip() in ('', 'false', '[]', '{}', 'null'):
        return ('empty', txt.strip())
    return ('content', txt)


def survey(c, user, written):
    """Every door, as `user`, in one transaction (read only, or with an xid assigned), rolled back."""
    out = {}
    with c.transaction(force_rollback=True):
        if not written:
            c.execute("set transaction read only")
        seat(c, user)
        if written:
            c.execute("select pg_current_xact_id()")
        p = {"o": ORG, "t": TBL, "ids": "{%s,%s}" % (D1, D2), "w": WORD}
        for name, sql in SET_DOORS:
            k, v = ask(c, sql, p)
            if name == 'record_aggregate':  # a count, no ids: any deal counted while she should reach none
                n = int(re.search(r'"count""?: (\d+)', v).group(1)) if k == 'content' else 0
                out[name] = {"d1": n > 0, "d2": False, "kind": k}
                continue
            out[name] = {"d1": k == 'content' and (D1 in v or TITLE[D1] in v),
                         "d2": k == 'content' and (D2 in v or TITLE[D2] in v), "kind": k}
        for name, sql in PER_ID:
            for d, label in ((D1, "d1"), (D2, "d2")):
                k, v = ask(c, sql, dict(p, i=d))
                # "content" means the deal itself came back: its title, or a yes from a can-see door. An answer that
                # only echoes the asked id, or a bundle whose every part is refused, is not the deal.
                if k == 'content':
                    k = 'content' if (TITLE[d] in v or v.strip() == 'true') else 'empty'
                out.setdefault(name, {})[label] = k
    return out


def as_owner(c, sql, args=None):
    with c.transaction():
        seat(c, ADMIN)
        return c.execute(sql, args).fetchall()


def granted(c, written):
    with c.transaction(force_rollback=True):
        if not written:
            c.execute("set transaction read only")
        c.execute("set local statement_timeout = '60s'")
        if written:
            c.execute("select pg_current_xact_id()")
        g = c.execute("select custom.read_door_granted_ids(%s,%s)::text[], custom.read_door_granted_ids(%s,null)::text[]",
                      (ORG, TBL, ORG)).fetchone()
        vs = c.execute("select o_all_visible from custom.visible_set(%s,%s,%s,'viewer')", (ADMIN, ORG, TBL)).fetchone()[0]
        return (D1 in g[0]) or (D1 in g[1]) or (TBL in g[1]), vs


TEARDOWN = [
    "delete from iam.permissions where resource_type = 'record' and resource_id in (select id from custom.record where organization_id = %(o)s)",
    "delete from iam.content_lane where resource_type = 'record' and resource_id in (select id from custom.record where organization_id = %(o)s)",
    "delete from platform.associations where organization_id = %(o)s",
    "delete from custom.record where organization_id = %(o)s",
    "delete from custom.field where organization_id = %(o)s",
    "delete from custom.io_outbox where organization_id = %(o)s",
    "delete from custom.io_comment where organization_id = %(o)s",
    "delete from custom.record_alias where organization_id = %(o)s",
    "delete from custom.visibility_epoch where organization_id = %(o)s",
    "delete from custom.organization_visibility_version where organization_id = %(o)s",
    "delete from history.row_versions where organization_id = %(o)s",
    "delete from history.migration_log where organization_id = %(o)s",
    "delete from platform.knob_override where organization_id = %(o)s",
    "delete from iam.memberships where organization_id = %(o)s",
    "delete from iam.organizations where id = %(o)s",
]


def teardown(c):
    with c.transaction():
        c.execute("set local statement_timeout = '60s'")
        c.execute("set local lock_timeout = '10s'")
        c.execute("select set_config('app.actor_system', 'campaign-test/accessrevoke', true)")
        for s in TEARDOWN:
            c.execute(s, {"o": ORG})


def plant(c):
    with c.transaction():
        c.execute("set local statement_timeout = '60s'")
        c.execute("select set_config('app.actor_system', 'campaign-test/accessrevoke', true)")
        c.execute("insert into iam.organizations (id, name, slug, abbreviation, created_by) values (%s, 'Harbor Light Sales', 'harbor-light-sales-accessrevoke', 'HLS', %s)", (ORG, ADMIN))
        c.execute("insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status) values (%s,'organization',%s,%s,'owner','active')", (ORG, ORG, ADMIN))
        c.execute("insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values ('custom','system_enabled','organization',%s,%s,'true'::jsonb,'ACCESS-REVOKE guard')", (ORG, ORG))
        c.execute("insert into custom.record (id, organization_id, table_id, data_class, data, created_by) values (%s,%s,null,'record',jsonb_build_object('name','Harbor Light HQ'),%s)", (HQ, ORG, ADMIN))
        t = c.execute("""select custom.table_declare(%s, jsonb_build_object(
            'name','Sales deal','slug','hls_sales_deal','label_singular','Sales deal','label_plural','Sales deals',
            'type','entity','display','list','ordered',false,'weight','light','retention_days',30,
            'default_sort','[]'::jsonb,'row_order','sorted','agent_writable',true,
            'fields', jsonb_build_array(jsonb_build_object('name','title','kind','text')),
            'title_field','title','parent_id', %s::text))""", (ORG, HQ)).fetchone()[0]
        c.execute("update custom.record set id = %s where organization_id = %s and id = %s", (TBL, ORG, t))
        c.execute("""update custom.record set data = data || jsonb_build_object('entity_definition_id', %s::text)
                      where organization_id = %s and table_id = custom.field_kernel_id() and (data ->> 'entity_definition_id')::uuid = %s""", (TBL, ORG, t))
        c.execute("update custom.field set entity_definition_id = %s where organization_id = %s and entity_definition_id = %s", (TBL, ORG, t))
        c.execute("""insert into custom.record (id, organization_id, table_id, data_class, data, created_by) values
            (%s,%s,%s,'record',jsonb_build_object('title','Quillfeather renewal, north region'),%s),
            (%s,%s,%s,'record',jsonb_build_object('title','Quillfeather expansion, south region'),%s)""",
                  (D1, ORG, TBL, ADMIN, D2, ORG, TBL, ADMIN))

# Readers of iam.permissions that do not treat a row as a grant in force: they write, revoke, audit, or list the
# shares themselves (with their status) for the person who manages them. Named, with the reason; a new reader that
# is none of these must apply iam.grant_in_force.
NOT_A_GRANT_READ = {
    'custom.share_grant': 'writes a share', 'custom.share_revoke': 'revokes (skips archived rows by status)',
    'public.revoke_resource_access': 'revokes', 'public.revoke_resource_org_access': 'revokes',
    'iam.fn_revoke_resource_permission': 'revokes', 'public.update_permission_level': 'changes a share level',
    'public.review_org_share': 'reviews a pending share', 'public.get_resource_permissions': 'lists shares with status for the manager',
    'communication.meet_remove_invitee': 'revokes an invitee', 'projects._sync_task_assignee_grant': 'trigger: writes',
    'public.dm_participant_sync_grant': 'trigger: writes', 'history.grant_capture': 'trigger: history',
    'iam._per_table_grant_guard': 'trigger: write guard', 'platform._custom_record_grant_guard': 'trigger: write guard',
    'platform._share_link_refuses_closed_rows': 'trigger: write guard',
    'custom.base_activity': 'reads history.row_versions of shares, not grants',
    'custom.context_tree': 'a field with any share row is asked alone (a candidate, never a grant)',
    'public.get_org_file_list': 'a file with any share row is asked of the kernel (a candidate, never a grant)',
}


def sibling_lists(c, red):
    """Clause 6: agent, agent shortcut and chat shares, revoked, are listed nowhere (one rolled-back transaction)."""
    with c.transaction(force_rollback=True):
        c.execute("set local statement_timeout = '120s'")
        c.execute("set local lock_timeout = '10s'")
        c.execute("select set_config('app.actor_system', 'campaign-test/accessrevoke', true)")
        ag = c.execute("""select a.id, a.name from agent.definition a
             where a.created_by = %s and a.deleted_at is null and not a.is_archived and a.is_active
               and not exists (select 1 from iam.permissions p where p.resource_type = 'agent' and p.resource_id = a.id)
               and not iam.has_access_for(%s, 'agent', a.id, 'viewer')
             order by a.created_at limit 1""", (ADMIN, TEST)).fetchone()
        cv = c.execute("""select x.id from chat.conversation x where x.created_by = %s and x.deleted_at is null
               and x.status is distinct from 'archived'
               and not exists (select 1 from iam.permissions p where p.resource_type = 'conversation' and p.resource_id = x.id)
               and not iam.has_access_for(%s, 'conversation', x.id, 'viewer')
               and (select t.o_subject from iam._door_target('conversation', x.id) t) = %s
             order by x.created_at limit 1""", (ADMIN, TEST, ADMIN)).fetchone()
        if not ag or not cv:
            red.append("clause 6 could not find an admin agent and chat that test@test.com cannot reach"); return
        lists = [
            ("agx_get_shared_with_me", "select count(*) from public.agx_get_shared_with_me('active') x where x.id = %(a)s"),
            ("agx_get_shared_for_chat", "select count(*) from public.agx_get_shared_for_chat('active') x where x.id = %(a)s"),
            ("agx_search", "select count(*) from public.agx_search(%(n)s, false, 50, 0) x where x.id = %(a)s"),
            ("agent.list_rows_by_ids", "select count(*) from agent.list_rows_by_ids(array[%(a)s]::uuid[])"),
            ("get_cx_conversations_shared_with_me", "select count(*) from public.get_cx_conversations_shared_with_me() x where x.id = %(c)s"),
        ]
        # the owner writes the grants (a chat is private data: only its owner may share it)
        c.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({"sub": ADMIN, "role": "authenticated"}),))
        pids = [c.execute("""insert into iam.permissions (resource_type, resource_id, granted_to_user_id, permission_level, created_by, granted_via)
                              values (%s, %s, %s, 'viewer', %s, 'share') returning id""", (t, i, TEST, ADMIN)).fetchone()[0]
                for t, i in (('agent', ag[0]), ('conversation', cv[0]))]

        def look():
            with c.transaction():
                c.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({"sub": TEST, "role": "authenticated"}),))
                c.execute("set local role authenticated")
                got = {}
                for name, sql in lists:
                    with c.transaction():
                        got[name] = c.execute(sql, {"a": ag[0], "n": ag[1], "c": cv[0]}).fetchone()[0]
                c.execute("reset role")
                return got
        shared = look()
        # (a released savepoint keeps set_config: the owner's seat again before the owner revokes)
        c.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({"sub": ADMIN, "role": "authenticated"}),))
        for pid in pids:
            c.execute("select iam.remove_grant(%s, %s, true)", (pid, ADMIN))
        revoked = look()
        print(f"clause 6: shared {shared}; revoked {revoked}")
        for name in shared:
            if not shared[name]:
                print(f"clause 6: {name} did not list the share while it stood (not exercised)")
            if revoked[name]:
                red.append(f"clause 6: {name} still lists a revoked share to test@test.com")


def census(c, red):
    """Clause 7: the class. Every client-callable SECURITY DEFINER reader of iam.permissions applies the rule."""
    with c.transaction(force_rollback=True):
        rows = c.execute(r"""select n.nspname || '.' || p.proname
              from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute')
               and regexp_replace(p.prosrc, '--[^\n]*', '', 'g') ~ 'iam\.permissions\M'
               and p.prosrc !~ 'expires_at' and p.prosrc !~ 'iam\.grant_in_force'""").fetchall()
    bad = sorted({r[0] for r in rows} - set(NOT_A_GRANT_READ))
    print(f"clause 7: {len(rows)} client-callable definer readers without the rule, {len(bad)} not named")
    for f in bad:
        red.append(f"clause 7: {f} reads iam.permissions as a grant without iam.grant_in_force")


def main():
    red = []
    with conn() as c:
        teardown(c)
        plant(c)
        try:
            for way, subject in (("RECORD share", D1), ("TABLE share", TBL)):
                as_owner(c, "select custom.share_grant(%s,%s,'user',%s,'viewer'::public.permission_level)", (ORG, subject, TEST))
                before = {w: survey(c, TEST, w) for w in (False, True)}
                as_owner(c, "select custom.share_revoke(%s,%s,'user',%s)", (ORG, subject, TEST))
                after = {w: survey(c, TEST, w) for w in (False, True)}
                for w in (False, True):
                    br = "written" if w else "read-only"
                    opened = [d for d, v in before[w].items() if v["d1"] in (True, 'content')]
                    idle = [d for d in before[w] if d not in opened]
                    print(f"{way} / {br}: {len(opened)} doors opened D1 while shared; not exercised: {idle}")
                    for d, v in after[w].items():
                        if v["d1"] is True or (v["d1"] == 'content') or (isinstance(v["d1"], str) and v["d1"] != v["d2"]):
                            red.append(f"{way} / {br}: door {d} still answers the revoked deal: {v}")
                    g, vs = granted(c, w)
                    if g:
                        red.append(f"{way} / {br}: custom.read_door_granted_ids still lists the revoked share's subject")
                    if not vs:
                        red.append(f"{way} / {br}: visible_set(admin, Sales deals).o_all_visible is false with no share left")
        finally:
            teardown(c)
        sibling_lists(c, red)
        census(c, red)
        with c.transaction():
            n = c.execute("select count(*) from custom.record where organization_id = %s", (ORG,)).fetchone()[0]
        if n:
            print(f"TEARDOWN FAILED: {n} records left"); return 2
    if red:
        print("RED"); [print("  " + r) for r in red]; return 1
    print("GREEN: after each revoke, every door refuses the deal exactly as it refuses one never shared, "
          "and nothing counts the share as granted.")
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except psycopg.Error as e:
        print("COULD NOT RUN:", e.sqlstate, str(e).splitlines()[0]); sys.exit(2)
