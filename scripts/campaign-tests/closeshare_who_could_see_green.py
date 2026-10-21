"""LANE CLOSE-SHARE — CD-SHARE-14: "who could see this record on a past date", including people who have since lost access.

  python3 scripts/campaign-tests/closeshare_who_could_see_green.py

Live, one connection, short transactions (History needs real moments, so the share and the revoke are COMMITTED):
admin@admin.com writes one disposable record in the "ATFJ main wfob" test table, shares it with an outside person, a moment
passes, the share is revoked; then custom.who_could_see_on(record, the moment in between) must list the outside person with
has_access_now false, an outsider asking is refused, and the record is put away (custom.record_delete = soft delete) at the end.
RED before 20261021132000_closeshare_c_who_could_see_a_record_on_a_date (the door is missing), GREEN after.
"""
import json, re, time
import psycopg

ADMIN = "87a6e699-3622-4869-8843-d0867456c0dd"
OUT = "000eaa28-cf5d-402a-8f01-5e2c24191323"   # an outside person (not in admin's Workspace)
ORG = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f"   # admin's Workspace
TABLE = "3c0440ef-6f75-4064-afd4-fd35409d33df"  # ATFJ main wfob (test table)
env = {}
for line in open("/Users/armanisadeghi/code/aidream/.env"):
    m = re.match(r"^(SUPABASE_MATRIX_\w+)=(.*)$", line.strip())
    if m:
        env[m[1]] = m[2].strip().strip('"').strip("'")
conn = psycopg.connect(host=env["SUPABASE_MATRIX_HOST"], port=env.get("SUPABASE_MATRIX_PORT", 5432), user=env["SUPABASE_MATRIX_USER"],
                       password=env["SUPABASE_MATRIX_PASSWORD"], dbname=env["SUPABASE_MATRIX_DATABASE_NAME"], autocommit=False, prepare_threshold=None)


def as_(who, sql, args=()):
    with conn.cursor() as cur:
        cur.execute("set local statement_timeout='30s'")
        cur.execute("select set_config('request.jwt.claims', %s, true), set_config('app.actor_system', 'campaign-test/closeshare', true)",
                    (json.dumps({"sub": who, "role": "authenticated"}),))
        cur.execute("set local role authenticated")
        cur.execute(sql, args)
        row = cur.fetchone() if cur.description else None
    conn.commit()
    return row


rec = as_(ADMIN, "select custom.record_write(%s, %s, %s::jsonb)", (ORG, TABLE, json.dumps({"name": "CLOSE-SHARE who-could-see probe"})))[0]
print("record", rec)
status = "FAIL"
try:
    as_(ADMIN, "select custom.share_grant(%s, %s, 'user', %s, 'viewer')", (ORG, rec, OUT))
    time.sleep(2)
    between = as_(ADMIN, "select now()")[0]
    time.sleep(2)
    as_(ADMIN, "select custom.share_revoke(%s, %s, 'user', %s)", (ORG, rec, OUT))
    try:
        ans = as_(ADMIN, "select custom.who_could_see_on(%s, %s)", (rec, between))[0]
    except Exception as e:  # noqa: BLE001
        conn.rollback()
        print("ERROR", type(e).__name__, str(e)[:300])
        ans = None
    print("answer", json.dumps(ans)[:900] if ans else None)
    refused = None
    try:
        refused = as_(OUT, "select custom.who_could_see_on(%s, %s)", (rec, between))[0]
    except Exception as e:  # noqa: BLE001
        conn.rollback()
        refused = {"error": str(e)[:200]}
    print("outsider asks", refused)
    people = (ans or {}).get("people") or []
    gone = [p for p in people if p.get("id") == OUT]
    ok = bool(ans and ans.get("success") and gone and gone[0].get("has_access_now") is False and refused and not refused.get("success"))
    status = "PASS" if ok else "FAIL"
    if gone:
        print("the person who lost access:", gone[0])
finally:
    as_(ADMIN, "select custom.record_delete(%s, %s)", (ORG, rec))
    print("record put away")
print("RESULT", status)
