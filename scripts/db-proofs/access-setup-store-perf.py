#!/usr/bin/env python3
"""
PERFORMANCE of the Store Tables column swap (access-setup PLAN §12.1 budget (b)), on the NIGHTLY CLONE ONLY, inside ONE
transaction that is ALWAYS rolled back.

As admin@admin.com (role authenticated + claims), custom.read_records_page (first 50, and sorted by a column) is timed
by EXPLAIN ANALYZE execution time on a "Crew pay" Table at 100 and at 1000 rows, three ways:
  A  legacy   iam.may_touch_field_itself = the frozen body (iam._legacy_may_touch_field_itself), no setup
  B  swapped  the live (swapped) body, no setup row                          budget: within noise of A
  C  setup    the swapped body + a scoped setup ("Pay": Table admins edit, the person named in Employee reads)
                                                                              budget: <= 1.25 x A
Run: cd aidream && uv run python ../matrx-frontend/scripts/db-proofs/access-setup-store-perf.py
"""
import json, re, statistics, sys

import psycopg
from dotenv import dotenv_values

env = dotenv_values('/Users/armanisadeghi/code/aidream/.env')
REF = {k.strip(): v.strip() for k, v in (l.split('=', 1) for l in open('/Users/armanisadeghi/code/common-docs/operations/clone/CLONE-REF')
                                          if '=' in l and not l.lstrip().startswith('#'))}['clone_ref']
URL = env.get('CLONE_DATABASE_URL') or ''
if f'postgres.{REF}' not in URL and f'db.{REF}.supabase.co' not in URL:
    sys.exit(f'REFUSED: CLONE_DATABASE_URL is not the clone {REF}; this runs only on the clone')
conn = psycopg.connect(URL, autocommit=False, prepare_threshold=None)
cur = conn.cursor()
cur.execute("""select not exists (select 1 from pg_extension where extname = 'pg_net')
                 and (to_regclass('cron.job') is null or not exists (select 1 from cron.job where active))""")
if not cur.fetchone()[0]:
    sys.exit('REFUSED: the server does not show the clone quarantine')
cur.execute("set statement_timeout = 0")

ORG = '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f'
ADMIN = '87a6e699-3622-4869-8843-d0867456c0dd'
HOME = 'ea9db3ce-ad10-4145-8c97-d56d0dd0abb5'
RUNS = 15


def q(sql, a=None):
    cur.execute(sql, a)
    return cur.fetchall() if cur.description else None


def as_admin():
    cur.execute("reset role")
    cur.execute("select set_config('request.jwt.claims', %s, true), set_config('request.jwt.claim.sub', %s, true)",
                (json.dumps({'sub': ADMIN, 'role': 'authenticated'}), ADMIN))
    cur.execute("set local role authenticated")


def owner():
    cur.execute("reset role")


def make_table(n):
    as_admin()
    t = q("""select custom.table_declare(%s, jsonb_build_object('name', %s::text, 'slug', %s::text, 'type', 'entity', 'label_singular', 'Crew member',
             'label_plural', 'Crew pay', 'title_field', 'name', 'display', 'list', 'weight', 'light', 'ordered', false, 'row_order', 'sorted',
             'agent_writable', true, 'retention_days', 3650, 'default_sort', '[]'::jsonb, 'parent_id', %s::text,
             'fields', jsonb_build_array(jsonb_build_object('name', 'name'))))::text""",
          (ORG, f'Crew pay {n}', f'crew_pay_perf_{n}', HOME))[0][0]
    f = {}
    for s in [{'key': 'name', 'label': 'Name', 'type': 'text', 'sort': 10}, {'key': 'role', 'label': 'Role', 'type': 'text', 'sort': 20},
              {'key': 'hourly_rate', 'label': 'Hourly rate', 'type': 'number', 'sort': 30, 'sensitivity': 'confidential'},
              {'key': 'bonus', 'label': 'Bonus', 'type': 'number', 'sort': 40, 'sensitivity': 'restricted'},
              {'key': 'employee', 'label': 'Employee', 'type': 'member', 'sort': 50}]:
        f[s['key']] = q("select custom.field_declare(%s, %s, %s::jsonb)::text", (ORG, t, json.dumps(s)))[0][0]
    roles = ['Lead framer', 'Framer', 'Apprentice', 'Site foreman', 'Finish carpenter']
    for i in range(n):
        q("select custom.record_write(%s, %s, %s::jsonb)",
          (ORG, t, json.dumps({'name': f'Crew member {i:04d}', 'role': roles[i % 5], 'hourly_rate': 20 + i % 30, 'bonus': (i * 37) % 2500})))
    owner()
    return t, f


def timed(t):
    as_admin()
    out = {}
    for label, sql in [('first 50', "select custom.read_records_page(%s, %s, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0)"),
                       ('sorted', "select custom.read_records_page(%s, %s, '{}'::jsonb, null, '[{\"field\":\"role\",\"direction\":\"asc\"}]'::jsonb, null, false, 50, 0)")]:
        ms = []
        for _ in range(RUNS):
            plan = q("explain (analyze, format json) " + sql, (ORG, t))[0][0]
            ms.append(plan[0]['Execution Time'])
        ms.sort()
        out[label] = (statistics.median(ms), ms[int(len(ms) * 0.95) - 1])
    owner()
    return out


try:
    q("select set_config('app.actor_system', 'access-setup-store-perf', true)")
    legacy_body = q("select pg_get_functiondef('iam.may_touch_field_itself(uuid,uuid,uuid,permission_level,text)'::regprocedure)")[0][0]
    head = legacy_body[:legacy_body.index('AS $function$')]
    legacy = head + "AS $function$\nbegin\n  return iam._legacy_may_touch_field_itself(p_user_id, p_field_id, p_organization_id, p_level_on_record, p_action);\nend $function$"
    results = {}
    for n in (100, 1000):
        t, f = make_table(n)
        q("savepoint a")
        q(legacy)
        results[(n, 'A legacy')] = timed(t)
        q("rollback to savepoint a")
        results[(n, 'B swapped, no setup')] = timed(t)
        q("savepoint c")
        for k in ('hourly_rate', 'bonus'):
            q("update custom.record set data = data || '{\"part\":\"Pay\"}'::jsonb where id = %s", (f[k],))
        st = lambda key, g, req=False: {'key': key, **({'required': True, 'fallback': 'org_owners_admins'} if req else {}),
                                        'resolver': {'kind': 'store', 'seat': g, 'fn': 'custom.store_seat_holders(uuid,jsonb)',
                                                     'set_fn': 'custom.store_seat_records(uuid,uuid,jsonb)', 'has_fn': 'custom.store_seat_has(uuid,uuid,jsonb)'}}
        setup = {'admin_seats': ['table_admin'],
                 'seats': [st('table_admin', {'kind': 'row_level', 'min': 'admin'}, True), st('the_employee', {'kind': 'row_field', 'field_id': f['employee']}, True)],
                 'grid': {'table_admin': {'part:pay': {'level': 'editor'}}, 'the_employee': {'part:pay': {'level': 'viewer'}}}}
        q("insert into iam.access_setup (entity_type, scope, setup, declared_by) values ('record', %s::jsonb, %s::jsonb, 'perf fixture')",
          (json.dumps({'table_id': t}), json.dumps(setup)))
        results[(n, 'C swapped + setup')] = timed(t)
        q("rollback to savepoint c")
    print(f"{'rows':>5} {'case':22s} {'first 50 p50/p95 ms':>22s} {'sorted p50/p95 ms':>20s}   ratio vs A (p50)")
    for (n, case), r in results.items():
        a = results[(n, 'A legacy')]
        ratio = ' / '.join(f"{r[k][0] / a[k][0]:.2f}x" for k in ('first 50', 'sorted'))
        print(f"{n:>5} {case:22s} {r['first 50'][0]:9.1f} / {r['first 50'][1]:7.1f}   {r['sorted'][0]:8.1f} / {r['sorted'][1]:7.1f}   {ratio}")
finally:
    conn.rollback()
    conn.close()
    print('rolled back; nothing persisted')
