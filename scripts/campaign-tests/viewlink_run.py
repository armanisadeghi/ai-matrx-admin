"""Runs a campaign SQL suite inside ONE transaction that always ends in ROLLBACK (lane VIEW-LINK).

  python3 scripts/campaign-tests/viewlink_run.py scripts/campaign-tests/viewlink_green.sql                 # RED: the suite alone
  python3 scripts/campaign-tests/viewlink_run.py scripts/campaign-tests/viewlink_green.sql <migration.sql> # GREEN: migration, then the suite

The migration is applied INSIDE the same transaction, so nothing reaches the database; `pnpm db:apply` is the one real apply.
"""
import pathlib, re, sys
import psycopg

suite = pathlib.Path(sys.argv[1]).read_text()
migration = pathlib.Path(sys.argv[2]).read_text() if len(sys.argv) > 2 else None
env = {}
for line in open("/Users/armanisadeghi/code/aidream/.env"):
    m = re.match(r"^(SUPABASE_MATRIX_\w+)=(.*)$", line.strip())
    if m:
        env[m[1]] = m[2].strip().strip('"').strip("'")
conn = psycopg.connect(host=env["SUPABASE_MATRIX_HOST"], port=env.get("SUPABASE_MATRIX_PORT", 5432), user=env["SUPABASE_MATRIX_USER"],
                       password=env["SUPABASE_MATRIX_PASSWORD"], dbname=env["SUPABASE_MATRIX_DATABASE_NAME"], autocommit=False, prepare_threshold=None)
notices = []
conn.add_notice_handler(lambda d: notices.append(d.message_primary))
cur = conn.cursor()
status = "PASS"
try:
    cur.execute("set local statement_timeout='60s'; set local lock_timeout='5s'")
    if migration:
        # the declared door rows are re-inserted by the migration itself; on a re-run inside a transaction they are new
        cur.execute(migration)
    cur.execute(suite)
except Exception as e:  # noqa: BLE001
    status = "FAIL"
    print("ERROR", type(e).__name__, str(e)[:700])
finally:
    conn.rollback()
for n in notices:
    print("  ", n)
print("RESULT", status, "(rolled back)", "with migration" if migration else "WITHOUT migration")
