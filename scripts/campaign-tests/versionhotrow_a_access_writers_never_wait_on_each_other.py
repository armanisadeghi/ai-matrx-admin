#!/usr/bin/env python3
"""VERSION-HOTROW guard a: TWO ACCESS WRITERS NEVER WAIT ON EACH OTHER, AND NO CHANGE IS EVER MISSED.

    cd matrx-frontend && python3 scripts/campaign-tests/versionhotrow_a_access_writers_never_wait_on_each_other.py

Live, two connections, short transactions. Every access-changing write moves the access version
(custom._access_version_bump, from the statement triggers on the 13 access tables and from the record and
association triggers). Before VERSION-HOTROW the version was ONE row per organization (and one platform row)
updated in place, so a transaction that changed access held that row until it committed and every other
access writer waited behind it.

  1  platform door: A runs `delete from platform.knob_override where false` (fires the statement trigger)
     and stays open; B does the same with lock_timeout 3 s. B must finish without waiting. Both roll back.
  2  organization door: the same with custom._access_version_bump(<Template sweep (test)>) (the record and
     association path). Both roll back.
  3  no change is missed when bumps commit out of order: A bumps the org and stays open; B bumps and COMMITS;
     B reads v1 = custom._access_versions(org); A commits; B reads v2. v2 must differ from v1 (a reader that
     kept something stamped v1 must see it stale once A's change is visible). This is the case a plain
     max(sequence) version gets wrong. Commits two bumps on the test org only (harmless: its kept reader
     judgements and masks are worked out again).

  4  a fold of the org's events into its base row leaves the version unchanged and the log empty (rolled back).

RED before VERSION-HOTROW a (1, 2 and 3 hit the lock timeout; 4 cannot run), GREEN after.
Exit 0 GREEN, 1 RED, 2 could not run.
"""
import sys, time
from pathlib import Path
import psycopg

ORG = '9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d'  # Template sweep (test)
WAIT_LIMIT_S = 1.0


def conn():
    env = {}
    for line in Path('/Users/armanisadeghi/code/aidream/.env').read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return psycopg.connect(host=env['SUPABASE_MATRIX_HOST'], port=5432,
                           dbname=env['SUPABASE_MATRIX_DATABASE_NAME'], user=env['SUPABASE_MATRIX_USER'],
                           password=env['SUPABASE_MATRIX_PASSWORD'], autocommit=False)


def begin(c):
    c.execute("set local statement_timeout = '20s'")
    c.execute("set local lock_timeout = '3s'")


def timed(c, sql, args=None):
    t = time.perf_counter()
    try:
        c.execute(sql, args)
        return time.perf_counter() - t, None
    except psycopg.Error as e:
        return time.perf_counter() - t, (e.sqlstate, str(e).splitlines()[0])


def pair(a, b, sql, args=None):
    begin(a); begin(b)
    a.execute(sql, args)                 # A holds whatever the bump takes
    dt, err = timed(b, sql, args)        # B must not wait for A's commit
    a.rollback(); b.rollback()
    return dt, err


def main():
    results = []
    try:
        a, b = conn(), conn()
    except Exception as e:
        print('could not connect:', e); return 2
    with a, b:
        dt, err = pair(a, b, "delete from platform.knob_override where false")
        results.append(('1 platform door: second writer', err is None and dt < WAIT_LIMIT_S, f'{dt*1000:.0f} ms', err))

        dt, err = pair(a, b, "select custom._access_version_bump(%s::uuid)", (ORG,))
        results.append(('2 org door: second writer', err is None and dt < WAIT_LIMIT_S, f'{dt*1000:.0f} ms', err))

        begin(a); begin(b)
        a.execute("select custom._access_version_bump(%s::uuid)", (ORG,))
        dt, err = timed(b, "select custom._access_version_bump(%s::uuid)", (ORG,))
        if err:
            a.rollback(); b.rollback()
            results.append(('3 out-of-order commits move the version', False, f'{dt*1000:.0f} ms', err))
        else:
            b.commit()
            v1 = b.execute("select custom._access_versions(%s::uuid)", (ORG,)).fetchone()[0]; b.commit()
            a.commit()
            v2 = b.execute("select custom._access_versions(%s::uuid)", (ORG,)).fetchone()[0]; b.commit()
            results.append(('3 out-of-order commits move the version', v2 != v1, f'v1={v1} v2={v2}', None))

        # 4  a fold (events into the base row) never moves the version and empties the log; rolled back
        begin(a)
        a.execute("select custom._access_version_bump(%s::uuid)", (ORG,))
        v1 = a.execute("select custom._access_versions(%s::uuid)", (ORG,)).fetchone()[0]
        a.execute("select custom._access_version_fold(%s::uuid)", (ORG,))
        v2 = a.execute("select custom._access_versions(%s::uuid)", (ORG,)).fetchone()[0]
        left = a.execute("select count(*) from custom.access_version_event where organization_id = %s::uuid", (ORG,)).fetchone()[0]
        a.rollback()
        results.append(('4 a fold keeps the version and empties the log', v1 == v2 and left == 0, f'v1={v1} v2={v2} left={left}', None))

    ok = all(r[1] for r in results)
    for name, good, detail, err in results:
        print(('PASS' if good else 'FAIL'), name, detail, err or '')
    print('GREEN' if ok else 'RED')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
