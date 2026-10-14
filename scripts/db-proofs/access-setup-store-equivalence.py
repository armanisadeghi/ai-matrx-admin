#!/usr/bin/env python3
"""
EQUIVALENCE PROOF for Store Tables parts — who sees and edits each column (access-setup PLAN §12, §12.1).

Everything runs on the NIGHTLY CLONE ONLY (common-docs/operations/clone/CURRENT.md; never live: a rolled-back proof
transaction held live's iam tables for 75 minutes on 2026-10-10) inside ONE transaction that is ALWAYS rolled back: a fixture organization, its
persona-factory people (auth users tagged app_metadata.test_fixture, 1-hour expiry, never committed), a "Crew pay"
Table made through the real doors, shares, field shares and the planted faults. Nothing persists.

  MODE 0  BASELINE    the live column answer (iam.may_touch_field, custom.read_mask_for) against its frozen copy
                      (iam._legacy_may_touch_field, custom._legacy_read_mask_for). Until the swap these ARE the same
                      bodies, so this must be 0 differences: it proves the oracle and the harness.
  MODE 1  FIXTURE     every fixture person x every row x every column x read/edit: the legacy answer at the person's
                      effective level on the row (record shares above Table level, field shares, the archived column,
                      the worked-out column over two parts) against iam.part_may_touch; iam.part_may_edit against
                      legacy-edit AND an editing rung; masks (visible keys per person and level) against the legacy
                      mask; every withheld column's notice (legacy keys equal, plus part and who).
  MODE 2  REAL DATA   every live Table with a non-internal column (85 Tables, 53 organizations on 2026-10-10): every
                      column x every rung (and no level) x read/edit, legacy against the part answer, and notices.
  MODE 3  PARTS       iam.parts_visible_for agrees with the per-column answer for every column with no share and no
                      portal (a part answers one way).
  SEATS               custom.store_seat_has / _holders / _records against independently known sets for every kind
                      (row_level with a record share above Table level, row_field, row_creator, org_role, field_grant)
                      and the fallback (organization owners and admins).
  WRITES              each person writes each column of one row through custom.record_update (the real write door,
                      which still asks the legacy answer); success must equal iam.part_may_edit.
  PANEL               custom.field_access_setup / field_access_set: admin may change, viewer may not, an agent never,
                      the record-naming and worked-out columns are refused, "who loses sight" counts before saving.
  PLANTS              in savepoints: the knob ignored in the preset cells, the column share dropped, the worked-out
                      closure dropped — each must make MODE 1 report differences.

Not exercised here (they read mask->'visible', unchanged until the swap, PLAN §12 order 5): saved views, dashboards,
group headers, drill, table_duplicate, AI fill, portal lists (custom._store_portal_allows is the verbatim portal arm).

Exit 1 when MODE 0/1/2/3 differ, a seat check fails, a write disagrees, a panel check fails, or a plant is not caught.
Run from aidream so its .env and the persona factory are found:
  cd aidream && uv run python ../matrx-frontend/scripts/db-proofs/access-setup-store-equivalence.py
"""
import json, os, re, sys, threading, time, uuid
from collections import Counter

import psycopg
from dotenv import dotenv_values

sys.path.insert(0, '/Users/armanisadeghi/code/aidream')
from aidream.testing.persona import make_persona, build_tag  # noqa: E402

env = dotenv_values('/Users/armanisadeghi/code/aidream/.env')
SUITE = 'access-setup/store-equivalence'
# one ladder (Arman 2026-10-11): edit_content is retired, so no fixture person or rung holds it
LEVELS = [None, 'viewer', 'commenter', 'editor', 'admin']
T0 = time.time()
failures = []


def log(msg):
    print(f"[{time.time() - T0:7.1f}s] {msg}", flush=True)


def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label:74s} {detail}"[:300], flush=True)
    if not ok:
        failures.append(label)


CLONE_REF_FILE = '/Users/armanisadeghi/code/common-docs/operations/clone/CLONE-REF'


def refuse(msg, code=2):
    print(f"REFUSED: {msg}\nThis proof runs ONLY on the nightly clone (common-docs/operations/clone/CURRENT.md). It never "
          f"runs on live: on 2026-10-10 one rolled-back proof transaction held live's iam tables for 75 minutes.", flush=True)
    sys.exit(code)


def clone_ref_values():
    vals = {}
    for line in open(CLONE_REF_FILE):
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            vals[k.strip()] = v.strip()
    return vals


def clone_connect():
    """A connection to the clone named by CLONE-REF, proven by the connection's project ref; never SUPABASE_MATRIX_*."""
    ref = clone_ref_values().get('clone_ref')
    if not ref:
        refuse(f"{CLONE_REF_FILE} names no clone_ref")
    url = env.get('CLONE_DATABASE_URL') or dotenv_values(
        '/Users/armanisadeghi/code/matrx-frontend/.env.local').get('CLONE_DATABASE_URL')
    if url:
        m = re.match(r'postgres(?:ql)?://([^:@/]+)(?::[^@]*)?@([^:/?]+)', url)
        user, host = (m.group(1), m.group(2)) if m else ('', '')
        if user != f'postgres.{ref}' and host != f'db.{ref}.supabase.co':
            refuse(f"CLONE_DATABASE_URL names user {user!r} on {host!r}, not the clone {ref} named by CLONE-REF")
        return psycopg.connect(url, autocommit=False, prepare_threshold=None), ref
    v = clone_ref_values()
    pw_file = os.path.expanduser(v.get('password_file', ''))
    if not pw_file or not os.path.exists(pw_file):
        refuse('neither CLONE_DATABASE_URL nor the CLONE-REF password file is present')
    return psycopg.connect(host=v['pooler_host'], port=int(v.get('pooler_port', 6543)), dbname=v.get('database', 'postgres'),
                           user=f'postgres.{ref}', password=open(pw_file).read().strip(), autocommit=False,
                           prepare_threshold=None), ref


def quarantined(c):
    """The clone's quarantine facts, never true of production: pg_net absent AND no active pg_cron job."""
    with c.cursor() as k:
        k.execute("""select not exists (select 1 from pg_extension where extname = 'pg_net')
                       and (to_regclass('cron.job') is null
                            or not exists (select 1 from cron.job where active))""")
        return bool(k.fetchone()[0])


if '--self-test' in sys.argv:
    # PROVES THE REFUSAL: a CLONE_DATABASE_URL naming the live database (its SUPABASE_MATRIX user and host) must exit 2
    # before any connection is opened; so must a missing CLONE-REF clone_ref.
    _live_user, _live_host = env.get('SUPABASE_MATRIX_USER', 'postgres.live'), env.get('SUPABASE_MATRIX_HOST', 'live.example')
    env['CLONE_DATABASE_URL'] = f'postgresql://{_live_user}:not-a-password@{_live_host}:6543/postgres'
    _real_connect = psycopg.connect
    psycopg.connect = lambda *a, **k: (_ for _ in ()).throw(AssertionError('self-test: a connection was attempted'))
    try:
        clone_connect()
        print('SELF-TEST FAIL: a live CLONE_DATABASE_URL was accepted'); sys.exit(1)
    except SystemExit as e:
        if e.code != 2:
            print(f'SELF-TEST FAIL: exit {e.code}, expected 2'); sys.exit(1)
    finally:
        psycopg.connect = _real_connect
    print('SELF-TEST PASS: a live target is refused (exit 2) before any connection is opened'); sys.exit(0)
conn, CLONE_REF = clone_connect()
if not quarantined(conn):
    conn.close()
    refuse(f"the server behind the {CLONE_REF} connection does not show the clone's quarantine (pg_net absent and no "
           f"active pg_cron job)")
conn.rollback()
cur = conn.cursor()
cur.execute("set local statement_timeout = 0")
# READ WRITE said out loud: a transaction-pooler backend can carry a leaked session default_transaction_read_only
# (scripts/apply-migration.ts does the same); this is still the one rolled-back transaction on the clone
cur.execute("set transaction read write")
PROOF_PID = None
WATCHDOG_LIMIT = float(os.environ.get('PROOF_MAX_XACT_SECONDS', '120'))
WATCHDOG_TRIPPED = threading.Event()


def watchdog():
    """Second connection: while the target cannot be proven the clone, no proof transaction may outlive the limit."""
    try:
        w, _ = clone_connect()
        w.autocommit = True
    except SystemExit:
        return
    while PROOF_PID is not None and not WATCHDOG_TRIPPED.is_set():
        try:
            if not quarantined(w):
                with w.cursor() as k:
                    k.execute("""select extract(epoch from now() - xact_start) from pg_stat_activity
                                  where pid = %s and xact_start is not null""", (PROOF_PID,))
                    row = k.fetchone()
                    if row and row[0] > WATCHDOG_LIMIT:
                        print(f"WATCHDOG: the target no longer shows the clone's quarantine and the proof transaction is "
                              f"{row[0]:.0f}s old (> {WATCHDOG_LIMIT:.0f}s): terminating backend {PROOF_PID}", flush=True)
                        k.execute("select pg_terminate_backend(%s)", (PROOF_PID,))
                        WATCHDOG_TRIPPED.set()
                        return
        except Exception as e:   # a failed check is reported, never silent
            print(f"WATCHDOG: check failed ({e.__class__.__name__}: {e})", flush=True)
        time.sleep(15)


def q(sql, args=None):
    cur.execute(sql, args)
    return cur.fetchall() if cur.description else None


def one(sql, args=None):
    r = q(sql, args)
    return r[0][0] if r else None


def owner():
    cur.execute("reset role")
    cur.execute("select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true)")


def seat(uid):
    cur.execute("reset role")
    cur.execute("select set_config('request.jwt.claims', %s, true), set_config('request.jwt.claim.sub', %s, true)",
                (json.dumps({"sub": uid, "role": "authenticated"}), uid))
    cur.execute("set local role authenticated")


# key, organization role, Table share (None = the organization's default), what the person is for
PEOPLE = [
    ('maker', 'owner', None, 'organization owner who made the Table'),
    ('t_admin', 'member', 'admin', 'Table admin by share'),
    ('t_editor', 'member', 'editor', 'Table editor'),
    ('t_comm', 'member', 'commenter', 'Table commenter'),
    ('t_view', 'member', 'viewer', 'Table viewer'),
    ('row_up', 'member', 'viewer', 'viewer on the Table, editor share on one row (record share above Table level)'),
    ('share_v', 'member', 'viewer', 'viewer with a VIEWER share of Hourly rate (below what it needs)'),
    ('share_e', 'member', 'viewer', 'viewer with an EDITOR share of Hourly rate'),
    ('share_a', 'member', 'editor', 'editor with an ADMIN share of Bonus'),
    ('org_admin', 'admin', None, 'organization admin, no Table share'),
    ('employee', 'member', 'viewer', 'named in the Employee column of row 1'),
    ('outsider', None, None, 'not in the organization'),
]
P = {}
F = {}       # field key -> id
ROWS = []    # row ids
ORG = None
TABLE = None


def build_fixture():
    global ORG, TABLE
    q("select set_config('app.actor_system', 'access-setup-store-equivalence', true)")
    tag = build_tag(suite=SUITE, purpose='rolled-back fixture person (never committed)', ttl_hours=1)
    for i, (key, _role, _share, _what) in enumerate(PEOPLE):
        pe = make_persona(seed=5200 + i)
        uid = str(uuid.uuid4())
        q("""insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, -- matrx-fixture:rollback-only the proof's one transaction always rolls back; tagged persona-factory personas
                                     raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
             values ('00000000-0000-0000-0000-000000000000', %s, 'authenticated', 'authenticated', %s, '', now(), %s, %s,
                     now(), now())""",
          (uid, pe.email, json.dumps({'provider': 'email', 'providers': ['email'], 'test_fixture': tag}),
           json.dumps({'full_name': pe.full_name})))
        P[key] = {'uid': uid, 'name': pe.full_name}
    ORG = str(uuid.uuid4())
    maker = P['maker']['uid']
    q("select set_config('request.jwt.claims', %s, true)", (json.dumps({'sub': maker, 'role': 'authenticated'}),))
    q("""insert into iam.organizations (id, name, slug, abbreviation, created_by)
         values (%s, 'Lakeside Framing Crew', %s, 'LFC', %s)""", (ORG, 'lakeside-framing-' + ORG[:8], maker))
    for key, role, _s, _w in PEOPLE:
        if role:
            q("""insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status)
                 values (%s, 'organization', %s, %s, %s, 'active') on conflict do nothing""", (ORG, ORG, P[key]['uid'], role))
    q("""insert into platform.knob_override (feature, key, scope_kind, scope_id, organization_id, value, set_note) values
         ('custom', 'system_enabled', 'organization', %s, %s, 'true'::jsonb, 'store-equivalence fixture'),
         ('custom', 'member_default_level', 'organization', %s, %s, '"viewer"'::jsonb, 'store-equivalence fixture')""",
      (ORG, ORG, ORG, ORG))
    home = one("insert into custom.record (organization_id, table_id, data) values (%s, null, '{\"name\":\"Home\"}') returning id",
               (ORG,))
    seat(maker)
    TABLE = one("""select custom.table_declare(%s, jsonb_build_object('name', 'Crew pay', 'slug', 'crew_pay', 'type', 'entity',
                     'label_singular', 'Crew member', 'label_plural', 'Crew pay', 'title_field', 'name', 'display', 'list',
                     'weight', 'light', 'ordered', false, 'row_order', 'sorted', 'agent_writable', true, 'retention_days', 3650,
                     'default_sort', '[]'::jsonb, 'parent_id', %s::text,
                     'fields', jsonb_build_array(jsonb_build_object('name', 'name'))))::text""", (ORG, home))
    specs = [
        {'key': 'name', 'label': 'Name', 'type': 'text', 'required': True, 'sort': 10},
        {'key': 'role', 'label': 'Role', 'type': 'text', 'sort': 20},
        {'key': 'hourly_rate', 'label': 'Hourly rate', 'type': 'number', 'sort': 30, 'sensitivity': 'confidential'},
        {'key': 'bonus', 'label': 'Bonus', 'type': 'number', 'sort': 40, 'sensitivity': 'restricted'},
        {'key': 'phone', 'label': 'Phone', 'type': 'text', 'sort': 50, 'sensitivity': 'public'},
        {'key': 'employee', 'label': 'Employee', 'type': 'member', 'sort': 60},
        {'key': 'old_rate', 'label': 'Old rate', 'type': 'number', 'sort': 70, 'sensitivity': 'confidential'},
    ]
    for s in specs:
        F[s['key']] = one("select custom.field_declare(%s, %s, %s::jsonb)::text", (ORG, TABLE, json.dumps(s)))
    F['total_pay'] = one("select custom.field_declare(%s, %s, %s::jsonb)::text",
                         (ORG, TABLE, json.dumps({'key': 'total_pay', 'label': 'Total pay', 'type': 'formula',
                                                  'formula_text': '{Hourly rate} * 40 + {Bonus}', 'sort': 80})))
    owner()
    emp_person = one("select custom.work_person(%s, %s, true)::text", (ORG, P['employee']['uid']))
    seat(maker)
    for i, (nm, role, rate, bonus) in enumerate([('Marisol Vega', 'Lead framer', 42.5, 1800), ('Darnell Okafor', 'Framer', 31, 600),
                                                 ('Priya Raman', 'Apprentice', 22, 0), ('Tomasz Kowal', 'Site foreman', 48, 2500)]):
        doc = {'name': nm, 'role': role, 'hourly_rate': rate, 'bonus': bonus, 'phone': f'555-01{i:02d}', 'old_rate': rate - 2}
        if i == 0:
            doc['employee'] = emp_person
        ROWS.append(one("select custom.record_write(%s, %s, %s::jsonb)::text", (ORG, TABLE, json.dumps(doc))))
    # Table shares, the record share above Table level, the field shares (live has none: these are the fixture)
    for key, _r, share, _w in PEOPLE:
        if share:
            q("select public.share_resource_with_user('record', %s, %s, %s)", (TABLE, P[key]['uid'], share))
    q("select public.share_resource_with_user('record', %s, %s, 'editor')", (ROWS[1], P['row_up']['uid']))
    owner()
    # ... and a share of the worked-out column ALONE (it still reads Bonus, so it must stay withheld)
    for key, field, level in [('share_v', 'hourly_rate', 'viewer'), ('share_e', 'hourly_rate', 'editor'), ('share_a', 'bonus', 'admin'),
                              ('t_editor', 'total_pay', 'admin')]:
        q("""insert into iam.permissions (resource_type, resource_id, granted_to_user_id, permission_level, status, created_by)
             values ('record', %s, %s, %s, 'active', %s)""", (F[field], P[key]['uid'], level, P['maker']['uid']))
    # the archived column: archived after rows were written, so its key is in the rows but never returned
    q("update custom.record set deleted_at = now() where id = %s", (F['old_rate'],))
    log(f"fixture: organization {ORG}, Table {TABLE}, {len(P)} people, {len(F)} columns, {len(ROWS)} rows")


# ---------------------------------------------------------------------------------------------------------------------
FIX_CMP = """
with people(k, u) as (select * from unnest(%(keys)s::text[], %(uids)s::uuid[])),
     rows(r) as (select unnest(%(rows)s::uuid[])),
     cols(c) as (select unnest(%(cols)s::uuid[])),
     lv as (select k, u, r, custom.effective_level(u, %(org)s::uuid, r, 'record') l from people, rows)
select lv.k, lv.r, cols.c, a.act, lv.l,
       iam._legacy_may_touch_field(lv.u, cols.c, %(org)s::uuid, lv.l, a.act) as legacy,
       iam.part_may_touch(lv.u, lv.r, cols.c, lv.l, a.act) as new
  from lv cross join cols cross join (values ('read'), ('edit')) a(act)
"""


def mode1(label='MODE 1'):
    keys = [k for k, *_ in PEOPLE]
    rows = q(FIX_CMP, {'keys': keys, 'uids': [P[k]['uid'] for k in keys], 'rows': ROWS, 'cols': list(F.values()), 'org': ORG})
    diffs = [r for r in rows if r[5] != r[6]]
    return len(rows), diffs


def run_mode1():
    n, diffs = mode1()
    names = {v: k for k, v in F.items()}
    for d in diffs[:12]:
        print(f"   DIFF {d[0]:9s} row{ROWS.index(str(d[1]))} {names.get(str(d[2]), d[2]):12s} {d[3]:4s} level={d[4]} legacy={d[5]} new={d[6]}")
    check('MODE 1 fixture: legacy column answer == iam.part_may_touch', not diffs, f'{n} answers, {len(diffs)} differences')
    by = Counter((d[0], d[3]) for d in diffs)
    if by:
        print('   by person/action:', dict(by))
    # the strata that must be non-empty (each a reason the proof is not green by construction)
    strata = {
        'record share above Table level reads Hourly rate on that row only':
            one("select iam.part_may_touch(%s, %s, %s, custom.effective_level(%s, %s, %s, 'record'), 'read') "
                "and not iam.part_may_touch(%s, %s, %s, custom.effective_level(%s, %s, %s, 'record'), 'read')",
                (P['row_up']['uid'], ROWS[1], F['hourly_rate'], P['row_up']['uid'], ORG, ROWS[1],
                 P['row_up']['uid'], ROWS[0], F['hourly_rate'], P['row_up']['uid'], ORG, ROWS[0])),
        'editor field share opens Hourly rate to a viewer':
            one("select iam.part_may_touch(%s, %s, %s, 'viewer', 'read')", (P['share_e']['uid'], ROWS[0], F['hourly_rate'])),
        'viewer field share below the need does not':
            one("select not iam.part_may_touch(%s, %s, %s, 'viewer', 'read')", (P['share_v']['uid'], ROWS[0], F['hourly_rate'])),
        'archived column is never returned (even to the maker)':
            one("select not iam.part_may_touch(%s, %s, %s, 'admin', 'read')", (P['maker']['uid'], ROWS[0], F['old_rate'])),
        'worked-out column over two parts: editor reads Hourly rate but not Total pay (Bonus is admin)':
            one("select iam.part_may_touch(%s, %s, %s, 'editor', 'read') and not iam.part_may_touch(%s, %s, %s, 'editor', 'read')",
                (P['t_editor']['uid'], ROWS[0], F['hourly_rate'], P['t_editor']['uid'], ROWS[0], F['total_pay'])),
        'a share of the worked-out column alone does not open it (it reads Bonus)':
            one("select not iam.part_may_touch(%s, %s, %s, 'editor', 'read')", (P['t_editor']['uid'], ROWS[0], F['total_pay'])),
        'admin share of Bonus lets an editor read Bonus (the share of ONE column)':
            one("select iam.part_may_touch(%s, %s, %s, 'editor', 'read') and not iam.part_may_touch(%s, %s, %s, 'editor', 'read')",
                (P['share_a']['uid'], ROWS[0], F['bonus'], P['t_editor']['uid'], ROWS[0], F['bonus'])),
    }
    for k, v in strata.items():
        check(f'stratum: {k}', bool(v))
    closure = q("select c.input_id::text, c.retired from custom.field_input_closure(%s, (select data from custom.record where id = %s), %s) c",
                (ORG, F['total_pay'], F['total_pay']))
    names = {v: k for k, v in F.items()}
    print('   Total pay reads:', [(names.get(i, i), r) for i, r in closure],
          '| share_a reads Total pay:', one("select iam.part_may_touch(%s, %s, %s, 'editor', 'read')", (P['share_a']['uid'], ROWS[0], F['total_pay'])))
    # the one write check: part_may_edit == legacy edit AND an editing rung on the row
    w = q("""with people(k, u) as (select * from unnest(%(keys)s::text[], %(uids)s::uuid[])),
                  rows(r) as (select unnest(%(rows)s::uuid[])), cols(c) as (select unnest(%(cols)s::uuid[])),
                  lv as (select k, u, r, custom.effective_level(u, %(org)s::uuid, r, 'record') l from people, rows)
             select lv.k, coalesce(iam._legacy_may_touch_field(lv.u, cols.c, %(org)s::uuid, lv.l, 'edit'), false) as legacy,
                    coalesce(lv.l >= 'editor', false) as rung, iam.part_may_edit(lv.u, lv.r, cols.c) as new
               from lv cross join cols""",
          {'keys': [k for k, *_ in PEOPLE], 'uids': [P[k]['uid'] for k, *_ in PEOPLE], 'rows': ROWS,
           'cols': list(F.values()), 'org': ORG})
    wd = [r for r in w if (r[1] and r[2]) != r[3]]
    opening = Counter(r[0] for r in w if r[1] and not r[2])
    check('iam.part_may_edit == legacy edit AND an editing rung', not wd, f'{len(w)} answers, {len(wd)} differences')
    print(f"   opening list (legacy lets a column share edit without an editing rung on the row; §12.1 asks for both): {dict(opening) or 'none'}")


def run_masks_and_notices():
    diffs, nd, total = [], [], 0
    for key, *_ in PEOPLE:
        u = P[key]['uid']
        for lvl in LEVELS:
            legacy = one("select custom._legacy_read_mask_for(%s, %s, %s, %s, 'read')", (u, ORG, TABLE, lvl))
            new_vis = one("""select coalesce(array_agg(f.data ->> 'key' order by f.data ->> 'key'), '{}') from custom.record f
                              where f.organization_id = %s and f.table_id = custom.field_kernel_id() and f.deleted_at is null
                                and (f.data ->> 'entity_definition_id')::uuid = %s
                                and iam.part_may_touch(%s, null, f.id, %s, 'read')""", (ORG, TABLE, u, lvl))
            total += 1
            if sorted(legacy['visible']) != sorted(new_vis):
                diffs.append((key, lvl, legacy['visible'], new_vis))
            for k, notice in legacy['notices'].items():
                new_n = one("""select custom.store_part_notice(f, 'read') from custom.record f
                                where f.id = %s""", (legacy['key_ids'][k],))
                core = {kk: new_n.get(kk) for kk in notice}
                if core != notice or (new_n.get('part') and not new_n.get('who')):
                    nd.append((key, lvl, k, notice, new_n))
    for d in diffs[:6]:
        print('   MASK DIFF', d)
    for d in nd[:4]:
        print('   NOTICE DIFF', d)
    check('masks: legacy visible keys == part answer, every person x every rung', not diffs, f'{total} masks, {len(diffs)} differences')
    live = q("""with people(u) as (select unnest(%(uids)s::uuid[])), lv(l) as (select unnest(array[null,'viewer','commenter','editor','admin']::public.permission_level[]))
                select count(*), count(*) filter (where custom.read_mask_for(u, %(org)s::uuid, %(t)s::uuid, l, a) - 'all_key_ids'
                                                   is distinct from custom._legacy_read_mask_for(u, %(org)s::uuid, %(t)s::uuid, l, a) - 'all_key_ids')
                  from people, lv, (values ('read'), ('edit')) x(a)""", {'uids': [P[k]['uid'] for k, *_ in PEOPLE], 'org': ORG, 't': TABLE})[0]
    check('masks: live custom.read_mask_for == frozen copy (visible, notices, ids), read and edit', live[1] == 0, f'{live[0]} masks, {live[1]} differences')
    check('notices: legacy {reason, needs, or, reads, says} kept, plus part and who', not nd, f'{len(nd)} differences')
    sample = one("select custom.store_part_notice(f, 'read') from custom.record f where f.id = %s", (F['bonus'],))
    print(f"   notice for Bonus: part={sample.get('part')!r} who={sample.get('who')!r}")


def run_mode0():
    r = q("""with t as (select f.id, f.organization_id org, (f.data ->> 'entity_definition_id')::uuid tbl
                          from custom.record f where f.table_id = custom.field_kernel_id() and f.deleted_at is null
                           and coalesce(f.data ->> 'sensitivity', 'internal') <> 'internal'),
                 cols as (select f.id, t.org from t join custom.record f on f.table_id = custom.field_kernel_id()
                           and f.deleted_at is null and (f.data ->> 'entity_definition_id')::uuid = t.tbl and f.organization_id = t.org
                           group by f.id, t.org),
                 who as (select distinct on (organization_id) organization_id org, user_id u from iam.memberships
                          where container_type = 'organization' and role = 'owner' and deleted_at is null)
            select count(*), count(*) filter (where iam.may_touch_field(who.u, cols.id, cols.org, l.l::public.permission_level, a.a)
                                                is distinct from iam._legacy_may_touch_field(who.u, cols.id, cols.org, l.l::public.permission_level, a.a))
              from cols join who on who.org = cols.org
              cross join (values (null), ('viewer'), ('commenter'), ('editor'), ('admin')) l(l)
              cross join (values ('read'), ('edit')) a(a)""")[0]
    check('MODE 0 baseline: live iam.may_touch_field == frozen copy (real Tables)', r[1] == 0, f'{r[0]} answers, {r[1]} differences')
    return r


def run_mode2():
    r = q("""with t as (select distinct (f.data ->> 'entity_definition_id')::uuid tbl, f.organization_id org
                          from custom.record f where f.table_id = custom.field_kernel_id() and f.deleted_at is null
                           and coalesce(f.data ->> 'sensitivity', 'internal') <> 'internal'),
                 cols as (select f.id, t.org from t join custom.record f on f.table_id = custom.field_kernel_id()
                           and f.deleted_at is null and (f.data ->> 'entity_definition_id')::uuid = t.tbl and f.organization_id = t.org),
                 who as (select distinct on (organization_id) organization_id org, user_id u from iam.memberships
                          where container_type = 'organization' and role = 'owner' and deleted_at is null)
            select count(*),
                   count(*) filter (where coalesce(iam._legacy_may_touch_field(who.u, cols.id, cols.org, l.l::public.permission_level, a.a), false)
                                    is distinct from coalesce(iam.part_may_touch(who.u, null, cols.id, l.l::public.permission_level, a.a), false)),
                   count(distinct cols.org), count(distinct cols.id)
              from cols join who on who.org = cols.org
              cross join (values (null), ('viewer'), ('commenter'), ('editor'), ('admin')) l(l)
              cross join (values ('read'), ('edit')) a(a)""")[0]
    check('MODE 2 real data: legacy == part answer on every live Table with a non-internal column', r[1] == 0,
          f'{r[0]} answers over {r[3]} columns in {r[2]} organizations, {r[1]} differences')
    nd = one("""select count(*) from custom.record f
                 where f.table_id = custom.field_kernel_id() and f.deleted_at is null
                   and coalesce(f.data ->> 'sensitivity', 'internal') <> 'internal'
                   and exists (select 1 from jsonb_each(custom._legacy_hidden_field_notice(f, 'read')) e
                                where custom.store_part_notice(f, 'read') -> e.key is distinct from e.value)""")
    check('MODE 2 notices: legacy keys unchanged on every non-internal live column', nd == 0, f'{nd} differences')


def run_mode3():
    bad = q("""with people(k, u) as (select * from unnest(%(keys)s::text[], %(uids)s::uuid[])),
                    lv(l) as (select unnest(array['viewer','commenter','editor','admin']::public.permission_level[])),
                    cols as (select f.id, f.data from custom.record f where f.table_id = custom.field_kernel_id() and f.deleted_at is null
                              and (f.data ->> 'entity_definition_id')::uuid = %(t)s and coalesce(f.data ->> 'type', '') <> 'formula')
               select people.k, lv.l, cols.data ->> 'key', pv.may_read, iam.part_may_touch(people.u, null, cols.id, lv.l, 'read')
                 from people cross join lv cross join cols
                 join lateral (select * from iam.parts_visible_for(people.u, %(t)s, lv.l)) pv on pv.part = custom.store_field_part(cols.data)
                where iam.granted_level(people.u, 'record', cols.id) is null
                  and pv.may_read is distinct from iam.part_may_touch(people.u, null, cols.id, lv.l, 'read')""",
            {'keys': [k for k, *_ in PEOPLE], 'uids': [P[k]['uid'] for k, *_ in PEOPLE], 't': TABLE})
    check('MODE 3 parts: parts_visible_for agrees with the per-column answer', not bad, f'{len(bad)} differences {bad[:3]}')


def run_seats():
    def has(k, row, s):
        return one("select custom.store_seat_has(%s, %s, %s::jsonb)", (P[k]['uid'], row, json.dumps(s)))

    def holders(row, s):
        return {str(r[0]) for r in q("select user_id from custom.store_seat_holders(%s, %s::jsonb)", (row, json.dumps(s)))}

    def records(k, s):
        return {str(r[0]) for r in q("select custom.store_seat_records(%s, %s, %s::jsonb)", (P[k]['uid'], TABLE, json.dumps(s)))}
    uid = {k: P[k]['uid'] for k in P}
    s_emp = {'kind': 'row_field', 'field_id': F['employee']}
    check('seat row_field: the employee holds it on row 1, not row 2', has('employee', ROWS[0], s_emp) and not has('employee', ROWS[1], s_emp))
    check('seat row_field holders on row 1 = {employee}', holders(ROWS[0], s_emp) == {uid['employee']})
    check('seat row_field set form = {row 1}', records('employee', s_emp) == {ROWS[0]})
    s_cr = {'kind': 'row_creator'}
    check('seat row_creator: the maker on every row, nobody else', all(has('maker', r, s_cr) for r in ROWS) and not has('t_admin', ROWS[0], s_cr))
    check('seat row_creator set form = every row', records('maker', s_cr) == set(ROWS))
    s_ed = {'kind': 'row_level', 'min': 'editor'}
    check('seat row_level>=editor: record share above Table level counts on that row only',
          has('row_up', ROWS[1], s_ed) and not has('row_up', ROWS[0], s_ed))
    check('seat row_level>=editor set form for row_up = {row 2}', records('row_up', s_ed) == {ROWS[1]})
    # organization owners and admins reach every Table of their organization at admin (the kernel's org lane)
    want = {uid[k] for k in ('maker', 'org_admin', 't_admin', 't_editor', 'share_a', 'row_up')}
    got = holders(ROWS[1], s_ed)
    key_of = {v: k for k, v in uid.items()}
    check('seat row_level>=editor holders on row 2 = owner, org admin, Table admin, editors, row_up', got == want,
          f'missing {[key_of.get(x, x) for x in want - got]} extra {[key_of.get(x, x) for x in got - want]}')
    s_role = {'kind': 'org_role', 'role': 'admin'}
    check('seat org_role:admin = {org_admin}', holders(ROWS[0], s_role) == {uid['org_admin']} and has('org_admin', ROWS[0], s_role))
    s_fg = {'kind': 'field_grant', 'field_id': F['hourly_rate'], 'min': 'editor'}
    check('seat field_grant (Hourly rate, >=editor) = {share_e}', holders(ROWS[0], s_fg) == {uid['share_e']}
          and has('share_e', ROWS[0], s_fg) and not has('share_v', ROWS[0], s_fg))
    fb = {str(r[0]) for r in q("select custom.store_seat_fallback(%s)", (ORG,))}
    check('fallback = organization owners and admins', fb == {uid['maker'], uid['org_admin']})
    check('outsider holds nothing', not any(has('outsider', ROWS[0], s) for s in (s_emp, s_cr, s_ed, s_role, s_fg)))
    check('an invalid seat is refused in words', one("select custom.store_seat_invalid('{\"kind\":\"team\"}'::jsonb)") is not None)


def run_writes():
    names = {v: k for k, v in F.items()}
    value = {'name': 'Marisol V.', 'role': 'Lead', 'hourly_rate': 43, 'bonus': 1900, 'phone': '555-0199'}
    bad, n = [], 0
    for key, *_ in PEOPLE:
        for fk, v in value.items():
            owner()
            want = one("select iam.part_may_edit(%s, %s, %s)", (P[key]['uid'], ROWS[0], F[fk]))
            seat(P[key]['uid'])
            q("savepoint w")
            try:
                q("select custom.record_update(%s, %s, %s::jsonb, null)", (ORG, ROWS[0], json.dumps({fk: v})))
                got = True
            except Exception:
                got = False
                q("rollback to savepoint w")
            q("rollback to savepoint w")
            n += 1
            if bool(want) != got:
                bad.append((key, names[F[fk]], want, got))
    owner()
    for b in bad[:8]:
        print('   WRITE DIFF', b)
    check('WRITES: the real write door (legacy answer) agrees with iam.part_may_edit', not bad, f'{n} attempts, {len(bad)} differences')


def run_panel():
    owner()
    q("savepoint panel")
    seat(P['maker']['uid'])
    s = one("select custom.field_access_setup(%s, null)", (F['bonus'],))
    check('panel: maker reads Bonus, may change', s['ok'] and s['may_change'], f"people={len(s['people'])} word={s['field']['word']}")
    pv = one("select custom.field_access_setup(%s, %s::jsonb)", (F['phone'], json.dumps({'word': 'restricted', 'part': 'Pay'})))
    check('panel: who loses sight before saving (Phone -> restricted)', pv['proposed']['loses_sight'] > 0, json.dumps(pv['proposed']))
    tt = one("select custom.field_access_setup(%s, null)", (F['name'],))
    check('panel: the record-naming column cannot be moved', not tt['may_change'] and 'names each record' in (tt['why_not'] or ''))
    q("savepoint p")
    try:
        q("select custom.field_access_set(%s, 'Pay', 'restricted')", (F['name'],))
        refused = False
    except Exception:
        refused = True
    q("rollback to savepoint p")
    check('panel: field_access_set refuses the record-naming column', refused)
    q("savepoint p")
    try:
        q("select custom.field_access_set(%s, 'Pay', 'confidential')", (F['total_pay'],))
        refused = False
    except Exception:
        refused = True
    q("rollback to savepoint p")
    check('panel: field_access_set refuses a worked-out column', refused)
    r = one("select custom.field_access_set(%s, 'Pay', 'confidential')", (F['bonus'],))
    r2 = one("select custom.field_access_set(%s, 'Pay', 'restricted')", (F['hourly_rate'],))
    owner()
    words = dict(q("select data ->> 'key', data ->> 'sensitivity' from custom.record where id in (%s, %s)", (F['bonus'], F['hourly_rate'])))
    parts = dict(q("select data ->> 'key', data ->> 'part' from custom.record where id in (%s, %s)", (F['bonus'], F['hourly_rate'])))
    check('panel: a part answers one way (both Pay columns take the last word)',
          r['ok'] and r2['columns'] == 2 and set(words.values()) == {'restricted'} and set(parts.values()) == {'Pay'},
          f'{words} {parts}')
    check('panel: the change is audited', one("select count(*) from iam.access_audit where id = %s", (r2['audit_id'],)) == 1)
    seat(P['maker']['uid'])
    q("select set_config('app.actor_tier', 'agent', true)")
    q("savepoint p")
    try:
        q("select custom.field_access_set(%s, null, 'internal')", (F['bonus'],))
        refused = False
    except Exception:
        refused = True
    q("rollback to savepoint p")
    q("savepoint p")
    try:
        q("select custom.field_update(%s, %s, '{\"part\":\"Medical\"}'::jsonb)", (ORG, F['phone']))
        refused2 = False
    except Exception:
        refused2 = True
    q("rollback to savepoint p")
    q("select set_config('app.actor_tier', '', true)")
    check('panel: an agent never writes a part (set door and field door)', refused and refused2)
    seat(P['t_view']['uid'])
    v = one("select custom.field_access_setup(%s, null)", (F['phone'],))
    check('panel: a viewer reads but may not change', v['ok'] and not v['may_change'])
    q("savepoint p")
    try:
        q("select custom.field_access_set(%s, 'Pay', 'restricted')", (F['phone'],))
        refused = False
    except Exception:
        refused = True
    q("rollback to savepoint p")
    check('panel: a viewer cannot write a part', refused)
    seat(P['outsider']['uid'])
    o = one("select custom.field_access_setup(%s, null)", (F['phone'],))
    check('panel: an outsider gets not_reachable', o['reason'] == 'not_reachable')
    owner()
    # the part writes above are undone so the plants run on the fixture as built
    q("rollback to savepoint panel")


def run_scoped():
    """A Table WITH a scoped setup (accesssetup_store_f/g): "Pay" = Hourly rate + Bonus, read by Table admins (edit)
    and the person named in Employee on THAT row (read); per-row cells answer only with a row."""
    owner()
    q("savepoint scoped")
    for k in ('hourly_rate', 'bonus'):
        q("update custom.record set data = data || '{\"part\":\"Pay\"}'::jsonb where id = %s", (F[k],))
    def seat(key, grammar, required=False):
        d = {'key': key, 'resolver': {'kind': 'store', 'seat': grammar, 'fn': 'custom.store_seat_holders(uuid,jsonb)',
                                      'set_fn': 'custom.store_seat_records(uuid,uuid,jsonb)', 'has_fn': 'custom.store_seat_has(uuid,uuid,jsonb)'}}
        if required:
            d.update({'required': True, 'fallback': 'org_owners_admins'})
        return d
    setup = {'admin_seats': ['table_admin'],
             'seats': [seat('table_admin', {'kind': 'row_level', 'min': 'admin'}, True),
                       seat('the_employee', {'kind': 'row_field', 'field_id': F['employee']}, True),
                       seat('row_maker', {'kind': 'row_creator'})],
             'grid': {'table_admin': {'part:pay': {'level': 'editor'}}, 'the_employee': {'part:pay': {'level': 'viewer'}}}}
    q("insert into iam.access_setup (entity_type, scope, setup, declared_by) values ('record', %s::jsonb, %s::jsonb, 'store-equivalence fixture')",
      (json.dumps({'table_id': TABLE}), json.dumps(setup)))
    chk = one("select iam.access_setup_check('record', %s::jsonb)", (json.dumps({'table_id': TABLE}),))
    check('scoped: the store check passes the Crew pay setup', chk['ok'], json.dumps(chk['problems']))
    for bad, why in [({**setup, 'subject_seat': 'the_employee'}, 'a subject seat'),
                     ({**setup, 'grid': {'table_admin': {'part:pay': {'level': 'editor', 'rows': 'own'}}}}, 'rows own'),
                     ({**setup, 'seats': [{**setup['seats'][0], 'resolver': {**setup['seats'][0]['resolver'], 'has_fn': None}}] + setup['seats'][1:]}, 'no person-scoped form'),
                     ({**setup, 'grid': {'table_admin': {'part:medical': {'level': 'editor'}}}}, 'a part no column carries')]:
        q("savepoint bad")
        try:
            q("update iam.access_setup set setup = %s::jsonb where entity_type = 'record' and scope_key = %s::jsonb",
              (json.dumps(bad), json.dumps({'table_id': TABLE})))
            refused = False
        except Exception:
            refused = True
        q("rollback to savepoint bad")
        check(f'scoped: the check refuses {why}', refused)
    def reads(k, row, f, lvl=None):
        if lvl is None:
            return one("select iam.part_may_read(%s, %s, %s)", (P[k]['uid'], row, F[f]))
        return one("select iam.part_may_touch(%s, %s, %s, %s, 'read')", (P[k]['uid'], row, F[f], lvl))
    check('per-row: the employee reads Hourly rate and Bonus on the row naming them',
          reads('employee', ROWS[0], 'hourly_rate') and reads('employee', ROWS[0], 'bonus'))
    check('per-row: ...and not on another row', not reads('employee', ROWS[1], 'hourly_rate'))
    check('per-row: the employee cannot edit Pay (a read cell)', not one("select iam.part_may_edit(%s, %s, %s)", (P['employee']['uid'], ROWS[0], F['hourly_rate'])))
    check('per-row: a Table editor no longer reads Pay (confidential let them)', not reads('t_editor', ROWS[0], 'hourly_rate'))
    check('per-row: the Table admin reads and edits Pay', reads('t_admin', ROWS[2], 'bonus')
          and one("select iam.part_may_edit(%s, %s, %s)", (P['t_admin']['uid'], ROWS[2], F['bonus'])))
    check('set-wide: a per-row part is hidden without a row (sort, filter, search, aggregates)',
          not reads('employee', None, 'hourly_rate', 'viewer') and reads('t_admin', None, 'hourly_rate', 'admin'))
    pv = {r[0]: r for r in q("select * from iam.parts_visible_for(%s, %s, 'viewer')", (P['employee']['uid'], TABLE))}
    check('parts_visible_for: Pay hidden set-wide, marked per row', pv.get('part:pay') is not None
          and pv['part:pay'][2] is False and pv['part:pay'][4] is True, str(pv.get('part:pay')))
    check('per-row: Role (no part) unchanged for the employee', reads('employee', ROWS[0], 'role'))
    # the required seat nobody holds on a row falls to the organization owners and admins
    org_admin_lvl = one("select custom.effective_level(%s, %s, %s, 'record')", (P['org_admin']['uid'], ORG, ROWS[1]))
    check('fallback: row 2 names nobody, so organization admins hold the employee seat there',
          one("select custom._store_column_itself(%s, %s, %s, %s, 'viewer', 'read')", (P['org_admin']['uid'], ROWS[1], F['hourly_rate'], ORG))
          and not one("select custom._store_column_itself(%s, %s, %s, %s, 'viewer', 'read')", (P['org_admin']['uid'], ROWS[0], F['hourly_rate'], ORG)),
          f'org admin level on row 2 = {org_admin_lvl}')
    who = one("select custom.store_part_notice(f, 'read') ->> 'who' from custom.record f where id = %s", (F['bonus'],))
    check('notice: who reads Pay, from the setup', who is not None and 'Employee' in who, repr(who))
    check('share of ONE column still opens it on top of the part', reads('share_e', None, 'hourly_rate', 'viewer'))
    # through the REAL write door (after the swap it asks the per-row form): editor refused on Pay, Table admin allowed
    def door_write(k, field, value):
        seat_as = P[k]['uid']
        cur.execute("reset role")
        cur.execute("select set_config('request.jwt.claims', %s, true), set_config('request.jwt.claim.sub', %s, true)",
                    (json.dumps({"sub": seat_as, "role": "authenticated"}), seat_as))
        cur.execute("set local role authenticated")
        q("savepoint dw")
        try:
            q("select custom.record_update(%s, %s, %s::jsonb, null)", (ORG, ROWS[0], json.dumps({field: value})))
            ok = True
        except Exception:
            ok = False
        q("rollback to savepoint dw")
        owner()
        return ok
    swapped = one("select pg_get_functiondef('iam.may_touch_field_itself(uuid,uuid,uuid,permission_level,text)'::regprocedure) like '%_store_column_itself%'")
    if swapped:
        check('write door (swapped): a Table editor cannot change Pay; Role still', not door_write('t_editor', 'hourly_rate', 50) and door_write('t_editor', 'role', 'Lead'))
        check('write door (swapped): the Table admin changes Pay', door_write('t_admin', 'bonus', 2000))
        m = one("select custom.read_mask_for(%s, %s, %s, 'viewer', 'read')", (P['employee']['uid'], ORG, TABLE))
        check('read mask (swapped): Pay is withheld set-wide from the employee, with its part and who',
              'hourly_rate' not in m['visible'] and (m['notices'].get('hourly_rate') or {}).get('part') == 'Pay', json.dumps(m['notices'].get('hourly_rate')))
    # ROW-SCOPED PARTS IN READS (accesssetup_store_j): the employee's page reveals Pay on their own row only
    def as_seat(k):
        seat_as = P[k]['uid']
        cur.execute("reset role")
        cur.execute("select set_config('request.jwt.claims', %s, true), set_config('request.jwt.claim.sub', %s, true)",
                    (json.dumps({"sub": seat_as, "role": "authenticated"}), seat_as))
        cur.execute("set local role authenticated")
    if one("select to_regprocedure('custom.store_row_visible(uuid,uuid,custom.record,text[])') is not null"):
        as_seat('employee')
        page = one("select custom.read_records_page(%s, %s, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0)", (ORG, TABLE))
        docs = {r['id']: r['document'] for r in page['rows']}
        own, other = docs.get(ROWS[0], {}), docs.get(ROWS[1], {})
        check('page: the employee sees Hourly rate and Bonus on their own row', own.get('hourly_rate') == 42.5 and own.get('bonus') == 1800, json.dumps({k: own.get(k) for k in ('hourly_rate', 'bonus')}))
        check('page: ...and not on another row (withheld)', other.get('hourly_rate') is None and other.get('bonus') is None)
        sp = one("""select custom.read_records_page(%s, %s, '{}'::jsonb, null, '[{"field":"hourly_rate","direction":"desc"}]'::jsonb, null, false, 50, 0)""", (ORG, TABLE))
        check('page: sorting by Hourly rate is ignored for the employee', 'hourly_rate' in json.dumps(sp.get('sort_ignored')), json.dumps(sp.get('sort_ignored')))
        q("savepoint agg")
        try:
            ag = one("""select custom.record_aggregate(%s, %s, '[]'::jsonb, '[{"op":"sum","key":"hourly_rate"}]'::jsonb)""", (ORG, TABLE))
            agg_txt = json.dumps(ag)[:220]
            agg_ok = 'withheld' in agg_txt and '42.5' not in json.dumps(ag)
        except Exception as e:
            agg_txt = 'refused: ' + str(e).splitlines()[0]
            agg_ok = 'withheld' in agg_txt or 'not yours' in agg_txt or 'cannot' in agg_txt
            q("rollback to savepoint agg")
        check('aggregate: a sum over Hourly rate is withheld from the employee', agg_ok, agg_txt)
        owner()
        card = one("select custom.record_card(%s, %s, %s)", (P['employee']['uid'], ORG, ROWS[0]))
        card2 = one("select custom.record_card(%s, %s, %s)", (P['employee']['uid'], ORG, ROWS[1]))
        check('card: own row reveals Pay, another row does not', (card or {}).get('hourly_rate') == 42.5 and (card2 or {}).get('hourly_rate') is None)
        owner()
        as_seat('t_editor')
        ep = one("select custom.read_records_page(%s, %s, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0)", (ORG, TABLE))
        check('page: a Table editor sees Pay on no row', all(r['document'].get('hourly_rate') is None for r in ep['rows']))
        owner()
        body2 = one("select pg_get_functiondef('custom.store_row_visible(uuid,uuid,custom.record,text[])'::regprocedure)")
        q("savepoint plant3")
        q(body2.replace("if jsonb_array_length(r) = 0 or p_row.id is null then return p_visible; end if;", "return p_visible;"))
        as_seat('employee')
        pp = one("select custom.read_records_page(%s, %s, '{}'::jsonb, null, '[]'::jsonb, null, false, 50, 0)", (ORG, TABLE))
        owner()
        q("rollback to savepoint plant3")
        check('PLANT caught: row reveals dropped -> the employee loses their own Pay',
              {r['id']: r['document'] for r in pp['rows']}.get(ROWS[0], {}).get('hourly_rate') is None)
    # THE SETUP DOOR (accesssetup_store_k)
    if one("select to_regprocedure('custom.table_access_setup_set(uuid,jsonb,jsonb,text)') is not null"):
        def door(k, sql, args):
            as_seat(k)
            q("savepoint door")
            try:
                r = one(sql, args); ok = True
            except Exception as e:
                r, ok = str(e).splitlines()[0], False
                q("rollback to savepoint door")
            owner()
            return ok, r
        scope_k = json.dumps({'table_id': TABLE})
        q("delete from iam.access_setup where entity_type = 'record' and scope_key = %s::jsonb", (scope_k,))
        q("update custom.record set data = data - 'part' where id in (%s, %s)", (F['hourly_rate'], F['bonus']))
        org_admin_seat = seat('org_admins', {'kind': 'org_role', 'role': 'admin'}, True)
        narrow = {'admin_seats': ['org_admins'], 'seats': [org_admin_seat, setup['seats'][1]],
                  'grid': {'org_admins': {'part:pay': {'level': 'editor'}}, 'the_employee': {'part:pay': {'level': 'viewer'}}}}
        moves = {F['hourly_rate']: 'Pay', F['bonus']: 'Pay'}
        ok, pv = door('t_admin', "select custom.table_access_setup_preview(%s, %s::jsonb, %s::jsonb)", (TABLE, json.dumps(narrow), json.dumps(moves)))
        check('door preview: who loses sight is counted before saving', ok and pv['ok'] and pv['loses_sight'] > 0 and pv['problems'] == [], json.dumps({k: pv.get(k) for k in ('loses_sight', 'gains_sight', 'problems')}) if ok else pv)
        ok, r1 = door('t_admin', "select custom.table_access_setup_set(%s, %s::jsonb, %s::jsonb, 'Pay to org admins')", (TABLE, json.dumps(narrow), json.dumps(moves)))
        check('door: a table admin writes the setup and moves the columns', ok and r1['ok'], str(r1)[:160])
        meta = one("select request_context from iam.access_audit where id = %s", (r1['audit_id'],)) if ok else None
        check('door: audited with before and after', meta is not None and 'before' in meta and meta['after']['setup'] == narrow)
        check('door: the Table admin (not an org admin) no longer reads Pay', not reads('t_admin', ROWS[2], 'bonus'))
        widen = {**narrow, 'seats': narrow['seats'] + [setup['seats'][0]], 'grid': {**narrow['grid'], 'table_admin': {'part:pay': {'level': 'editor'}}}}
        ok, r2 = door('t_admin', "select custom.table_access_setup_set(%s, %s::jsonb, '{}'::jsonb, 'admins read Pay again')", (TABLE, json.dumps(widen)))
        notes = 'n/a'
        check('door: an admin widening their own sight notifies the other admins', ok and r2['ok'] and r2['notified'] >= 1 and len(r2['widened']) > 0, f"{r2 if not ok else {k: r2[k] for k in ('widened', 'notified')}} notices={notes}")
        ok, rv = door('t_admin', "select custom.table_access_setup_revert(%s, %s)", (TABLE, r2['audit_id'] if isinstance(r2, dict) else None))
        cur_setup = one("select setup from iam.access_setup where entity_type = 'record' and scope_key = %s::jsonb", (scope_k,))
        check('door: one-click revert restores the archived version', ok and cur_setup == narrow, str(rv)[:160])
        ok, rbad = door('t_admin', "select custom.table_access_setup_set(%s, %s::jsonb, '{}'::jsonb, null)", (TABLE, json.dumps({**narrow, 'subject_seat': 'x'})))
        check('door: the store check refuses a bad setup', not ok and 'cannot be saved' in rbad, rbad[:120])
        ok, rv2 = door('t_editor', "select custom.table_access_setup_set(%s, %s::jsonb, '{}'::jsonb, null)", (TABLE, json.dumps(widen)))
        check('door: a non-admin is refused', not ok)
        as_seat('t_admin'); q("select set_config('app.actor_tier', 'agent', true)")
        q("savepoint ag2")
        try:
            q("select custom.table_access_setup_set(%s, %s::jsonb, '{}'::jsonb, null)", (TABLE, json.dumps(widen))); agent_refused = False
        except Exception:
            agent_refused = True
        q("rollback to savepoint ag2"); q("select set_config('app.actor_tier', '', true)"); owner()
        check('door: an agent is refused', agent_refused)
    # plant: per-row cells ignored -> the employee loses Pay on their own row
    body = one("select pg_get_functiondef('custom._store_column_itself(uuid,uuid,uuid,uuid,permission_level,text)'::regprocedure)")
    q("savepoint plant2")
    q(body.replace("if custom.store_seat_has(p_person, p_row, v_cell -> 'seat') then return true; end if;", ""))
    caught = not reads('employee', ROWS[0], 'hourly_rate')
    q("rollback to savepoint plant2")
    check('PLANT caught: per-row cells ignored', caught)
    q("rollback to savepoint scoped")


def plant(label, sql_fn):
    q("savepoint plant")
    q(sql_fn)
    q("select platform.memo_clear_stmt_all()") if False else None
    n, diffs = mode1()
    q("rollback to savepoint plant")
    check(f'PLANT caught: {label}', len(diffs) > 0, f'{len(diffs)} differences')


def run_plants():
    cells = one("select pg_get_functiondef('custom._store_part_cells(uuid,uuid,text,text)'::regprocedure)")
    plant('the knob ignored in the preset cells (everything opens at viewer)',
          cells.replace("iam.field_sensitivity_level(coalesce(p_word, 'internal'), 'read', p_org)", "'viewer'"))
    itself = one("select pg_get_functiondef('custom._store_column_itself(uuid,uuid,uuid,uuid,permission_level,text)'::regprocedure)")
    plant('the share of one column dropped', itself.replace("if v_grant is not null and v_grant >= v_share then return true; end if;", ""))
    touch = one("select pg_get_functiondef('iam.part_may_touch(uuid,uuid,uuid,permission_level,text)'::regprocedure)")
    plant('the worked-out closure dropped', touch.replace("if not custom._store_column_itself(p_person, p_row, v_input.input_id, v_org, p_level, 'read') then return false; end if;", ""))


try:
    PROOF_PID = one("select pg_backend_pid()")
    threading.Thread(target=watchdog, daemon=True).start()
    log(f"target: clone {CLONE_REF} (quarantine confirmed), backend {PROOF_PID}")
    build_fixture()
    run_mode0()
    run_mode1()
    run_masks_and_notices()
    run_mode2()
    run_mode3()
    run_seats()
    run_writes()
    run_panel()
    run_plants()
    run_scoped()
finally:
    PROOF_PID = None
    conn.rollback()
    conn.close()
    log('rolled back; nothing persisted')

print(f"\n{'GREEN' if not failures else 'RED'}: {len(failures)} failure(s)")
for f in failures:
    print('  -', f)
sys.exit(1 if failures else 0)
