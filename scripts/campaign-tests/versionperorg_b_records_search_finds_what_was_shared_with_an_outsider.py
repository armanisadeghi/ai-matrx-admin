#!/usr/bin/env python3
"""VERSION-PER-ORG b: custom.records_search finds what was shared with an outsider.

    cd aidream && uv run python ../matrx-frontend/scripts/campaign-tests/versionperorg_b_records_search_finds_what_was_shared_with_an_outsider.py

test@test.com is not a member of the throwaway organization (ACCESS-REVOKE guard's fixture: "Harbor Light Sales",
a Sales deal Table with two "Quillfeather" deals). As her, records_search('Quillfeather') must:
  1  find nothing while nothing is shared with her;
  2  find BOTH deals while the Table is shared with her (a Table share);
  3  find ONLY D1 while D1 alone is shared with her (a record share: the Table's own list rule decides the rows,
     the search adds no rule of its own);
  4  find nothing again once the share is revoked (iam.grant_in_force: a revoked grant is in force nowhere).
RED before VERSION-PER-ORG b (the search only looked inside her own organizations: cases 2 and 3 found nothing).
Exit 0 GREEN, 1 RED, 2 could not run. The fixture is committed and removed at the end.
"""
import importlib.util, sys
from pathlib import Path
import psycopg

_spec = importlib.util.spec_from_file_location(
    'accessrevoke_a_a', Path(__file__).with_name('accessrevoke_a_a_revoked_share_opens_no_door.py'))
ar = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ar)


def search(c):
    with c.transaction():
        ar.seat(c, ar.TEST)
        rows = c.execute("select record_id::text from custom.records_search(%s, 50, 0, null, null, false)", (ar.WORD,)).fetchall()
    return {r[0] for r in rows} & {ar.D1, ar.D2}


def main():
    red = []
    with ar.conn() as c:
        ar.teardown(c)
        ar.plant(c)
        try:
            got = search(c)
            if got:
                red.append(f"1 nothing shared: found {sorted(got)}")
            for way, subject, want in (("TABLE share", ar.TBL, {ar.D1, ar.D2}), ("RECORD share", ar.D1, {ar.D1})):
                ar.as_owner(c, "select custom.share_grant(%s,%s,'user',%s,'viewer'::public.permission_level)", (ar.ORG, subject, ar.TEST))
                got = search(c)
                print(f"{way}: found {len(got)} of the Quillfeather deals, must find {len(want)}")
                if got != want:
                    red.append(f"{way}: found {sorted(got)}, must find exactly {sorted(want)}")
                ar.as_owner(c, "select custom.share_revoke(%s,%s,'user',%s)", (ar.ORG, subject, ar.TEST))
                got = search(c)
                if got:
                    red.append(f"{way} revoked: still found {sorted(got)}")
        finally:
            ar.teardown(c)
        with c.transaction():
            n = c.execute("select count(*) from custom.record where organization_id = %s", (ar.ORG,)).fetchone()[0]
        if n:
            print(f"TEARDOWN FAILED: {n} records left"); return 2
    if red:
        print("RED"); [print("  " + r) for r in red]; return 1
    print("GREEN: records_search finds exactly what was shared with an outsider, and nothing once it is revoked.")
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except psycopg.Error as e:
        print("COULD NOT RUN:", e.sqlstate, str(e).splitlines()[0]); sys.exit(2)
