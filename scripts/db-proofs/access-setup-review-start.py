#!/usr/bin/env python3
"""
PROOF for the manager-started standard review (access-setup PLAN §7; migration accesssetup_n_a_manager_starts_one_review).

ONE transaction on live, ALWAYS rolled back, a few seconds long:

  1. LAUNCH UNCHANGED  As admin@admin.com (HR in the org): create a cycle, launch it for test@test.com's employment with
                       the launch body that is live now -> answer A. Roll back to a savepoint, install the OTHER body
                       (before apply: the migration; after apply: its inverse), launch again -> answer B. A == B once the
                       freshly generated ids (review, cycle, workflow instance) are masked. Either way one side is the
                       legacy body and the other the body that calls hr._review_create_one.
  2. START DOOR        With hr.hr_review_start installed: admin (test@test.com's manager by position and HR) starts one
                       -> ok + access_setup; again -> already_open; test@test.com for admin / for themselves -> not_permitted;
                       wrong organization -> not_permitted; an HR caller for an employee with no manager -> no_manager;
                       test@test.com reads it as the employee (seats, can-flags); admin's People involved names HR holders;
                       candidates: admin sees test@test.com with the open review, test@test.com sees nobody.

Nothing persists. Run from aidream so its .env is found:
  cd aidream && uv run python ../matrx-frontend/scripts/db-proofs/access-setup-review-start.py [pre|post]
"""
import json, re, sys, time, psycopg
from pathlib import Path
from dotenv import dotenv_values

env = dotenv_values('/Users/armanisadeghi/code/aidream/.env')
HERE = Path(__file__).resolve().parents[2]
UP = HERE / 'migrations/campaign/accesssetup_n_a_manager_starts_one_review.sql'
DOWN = HERE / 'migrations/inverse/accesssetup_n_a_manager_starts_one_review_down.sql'
MODE = sys.argv[1] if len(sys.argv) > 1 else 'pre'

ADMIN = '87a6e699-3622-4869-8843-d0867456c0dd'
TEST = '4060701e-706a-4c76-b3ca-0bbc69fa5a14'
ORG = '884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f'
TEST_EMP = '59bc7d74-6b17-4349-b75e-7a324e42b77e'
ADMIN_EMP = '6ee5ede7-fead-4de5-a0c3-523fa5073af7'
NO_MGR_ORG = '2643e470-b275-47f3-95f3-ae275ad3ca47'
NO_MGR_EMP = '70f823da-c641-413b-b98d-563912bc4099'
failures = []


def check(label, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'}  {label:60s} {detail}"[:300])
    if not ok:
        failures.append(label)


def body(path):
    return '\n'.join(l for l in path.read_text().splitlines() if not l.startswith('-- '))


def as_user(cur, uid):
    # one round trip: claims + role (the transaction stays short)
    cur.execute("select set_config('request.jwt.claims', %s, true), set_config('request.jwt.claim.sub', %s, true),"
                " set_config('role', 'authenticated', true)",
                (json.dumps({'sub': uid, 'role': 'authenticated'}), uid))


TIMES = []


def call(cur, uid, sql, args=()):
    as_user(cur, uid)
    t = time.time()
    cur.execute(sql, args)
    v = cur.fetchone()[0]
    TIMES.append((round(time.time() - t, 2), sql[7:40]))
    return v


MASK = {'review_id', 'cycle_id', 'workflow_instance_id'}


def masked(v):
    if isinstance(v, dict):
        return {k: ('<id>' if k in MASK and v[k] else ('<ids>' if k == 'ids' else masked(x))) for k, x in v.items()}
    if isinstance(v, list):
        return [masked(x) for x in v]
    return v


def launch(cur):
    made = call(cur, ADMIN, "select hr.hr_review_cycle_create(%s::jsonb)",
                (json.dumps({'organization_id': ORG, 'name': 'Mid-year check-in', 'period_start': '2026-07-01',
                             'period_end': '2026-12-31'}),))
    assert made.get('ok'), made
    return call(cur, ADMIN, "select hr.hr_review_cycle_launch(%s, %s::jsonb)",
                (made['cycle_id'], json.dumps({'employment_ids': [TEST_EMP]})))


def main():
    conn = psycopg.connect(host=env['SUPABASE_MATRIX_HOST'], port=5432, dbname=env['SUPABASE_MATRIX_DATABASE_NAME'],
                           user=env['SUPABASE_MATRIX_USER'], password=env['SUPABASE_MATRIX_PASSWORD'], autocommit=False)
    try:
        cur = conn.cursor()
        t0 = time.time()
        cur.execute("set local statement_timeout = '20s'")
        cur.execute("set local lock_timeout = '3s'")
        cur.execute("select coalesce(string_agg(name || '=' || setting, ', '), 'none') from pg_settings where name like 'mx.%'")
        print('mx.* settings:', cur.fetchone()[0])
        cur.execute("select to_regprocedure('hr.hr_review_start(uuid,uuid)') is not null")
        live_has_start = cur.fetchone()[0]
        print(f"mode {MODE}; live has hr_review_start: {live_has_start}")

        # 1. launch's answer, live body vs the other body
        cur.execute("savepoint a")
        a = launch(cur)
        cur.execute("rollback to savepoint a")
        cur.execute("reset role")
        cur.execute(body(DOWN if live_has_start else UP))
        cur.execute("savepoint b")
        b = launch(cur)
        check('launch ok on both bodies', a.get('ok') is True and b.get('ok') is True)
        check('launch created one review on both', len(a.get('created', [])) == 1 and len(b.get('created', [])) == 1)
        check('launch answer identical (ids masked)', masked(a) == masked(b),
              '' if masked(a) == masked(b) else json.dumps([masked(a), masked(b)])[:280])
        print('   launch answer keys:', sorted(a.keys()), '| created[0] keys:', sorted(a['created'][0].keys()))
        cur.execute("reset role")
        if live_has_start:
            cur.execute("rollback to savepoint a")  # back to the live body, which has the start door
        else:
            cur.execute("rollback to savepoint b")  # keep the migration's bodies, drop launch B's rows

        # 2. the start door
        s = call(cur, ADMIN, "select hr.hr_review_start(%s, %s)", (TEST_EMP, ORG))
        check('admin starts a review for test@test.com', s.get('ok') is True, json.dumps(s)[:200])
        rid = s.get('review_id')
        acc = s.get('access_setup') or {}
        check('answer carries access_setup for that review', acc.get('head_type') == 'hr_review' and acc.get('ids') == [rid]
              and isinstance(acc.get('needs_confirm'), bool), json.dumps(acc))
        check('review workflow launched', (s.get('created') or {}).get('workflow', {}).get('launched') is True,
              json.dumps((s.get('created') or {}).get('workflow')))
        cur.execute("reset role")
        cur.execute("select c.name, c.status, c.metadata->>'standing_cycle', r.manager_employment_id::text, r.manager_user_id::text, r.employee_user_id::text, r.status"
                    " from hr.review r join hr.review_cycle c on c.id = r.cycle_id where r.id = %s", (rid,))
        row = cur.fetchone()
        check('in the open Individual reviews cycle', row[:3] == ('Individual reviews', 'open', 'individual'), str(row[:3]))
        check('manager = admin by position; employee = test@test.com', row[3:6] == (ADMIN_EMP, ADMIN, TEST), str(row[3:]))

        again = call(cur, ADMIN, "select hr.hr_review_start(%s, %s)", (TEST_EMP, ORG))
        check('second start refused already_open', again.get('reason') == 'already_open' and again.get('review_id') == rid, json.dumps(again))
        r1 = call(cur, TEST, "select hr.hr_review_start(%s, %s)", (ADMIN_EMP, ORG))
        check('test@test.com (no seat) refused for admin', r1 == {'ok': False, 'reason': 'not_permitted'}, json.dumps(r1))
        r2 = call(cur, TEST, "select hr.hr_review_start(%s, %s)", (TEST_EMP, ORG))
        check('test@test.com refused for themselves', r2 == {'ok': False, 'reason': 'not_permitted'}, json.dumps(r2))
        r3 = call(cur, ADMIN, "select hr.hr_review_start(%s, %s)", (TEST_EMP, NO_MGR_ORG))
        check('wrong organization refused', r3 == {'ok': False, 'reason': 'not_permitted'}, json.dumps(r3))
        r4 = call(cur, ADMIN, "select hr.hr_review_start(%s, %s)", (NO_MGR_EMP, NO_MGR_ORG))
        check('HR, employee with no manager -> no_manager', r4 == {'ok': False, 'reason': 'no_manager'}, json.dumps(r4))

        g = call(cur, TEST, "select hr.hr_review_get(%s)", (rid,))
        gr = g.get('review') or {}
        can = gr.get('can') or {}
        check('test@test.com reads it as the employee', g.get('ok') is True and gr.get('seats') == ['employee'], json.dumps(gr.get('seats')))
        check('employee may write only the self-evaluation', can.get('save_self') is True
              and not any(v for k, v in can.items() if k not in ('save_self', 'submit_self')), json.dumps(can))
        ga = call(cur, ADMIN, "select hr.hr_review_get(%s)", (rid,))
        gar = ga.get('review') or {}
        check('admin holds manager + hr', {'manager', 'hr'} <= set(gar.get('seats') or []), json.dumps(gar.get('seats')))
        panel = call(cur, ADMIN, "select iam.record_access_setup('hr_review', %s)", (rid,))
        seats = {x.get('key'): [h.get('source') or h.get('basis') or h.get('name') for h in (x.get('holders') or [])] for x in (panel.get('seats') or [])}
        check('People involved answers for the review', panel.get('ok') is True, json.dumps({k: panel.get(k) for k in ('ok', 'reason')}))
        check('HR seat filled', len(seats.get('hr') or []) > 0, json.dumps(seats)[:280])
        check('upper management seat present', 'upper_management' in seats, json.dumps(sorted(seats)))
        print('   hr seat entry:', json.dumps([x for x in (panel.get('seats') or []) if x.get('key') == 'hr'])[:400])
        print('   seats:', json.dumps(seats)[:400])

        ca = call(cur, ADMIN, "select hr.hr_review_start_candidates(%s)", (ORG,))
        pick = [p for p in ca.get('people', []) if p['employment_id'] == TEST_EMP]
        check('admin candidates list test@test.com with the open review', bool(pick) and pick[0]['open_review_id'] == rid
              and pick[0]['relation'] == 'report', json.dumps(ca)[:200])
        ct = call(cur, TEST, "select hr.hr_review_start_candidates(%s)", (ORG,))
        check('test@test.com candidates empty', ct.get('people') == [] and ct.get('is_hr') is False, json.dumps(ct))
    finally:
        conn.rollback()
        conn.close()
    print('timings:', TIMES)
    print(f"rolled back; {time.time() - t0:.1f}s; {len(failures)} failure(s)")
    sys.exit(1 if failures else 0)


main()
