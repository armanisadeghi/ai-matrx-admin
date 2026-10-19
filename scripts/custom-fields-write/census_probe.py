"""One rolled-back custom-value save per registered token, as admin@admin.com (CF-WRITE-2 census).
Usage (from aidream): uv run python ../matrx-frontend/scripts/custom-fields-write/census_probe.py [token ...]
Every save is rolled back. Per token the outcome is one of:
  SAVED      the door saved a value
  READ_ONLY  the ladder says this reader may not edit this row: the door answers may_edit=false AND refuses in words
             ("takes edit access") - the section shows the values read-only with "Needs Edit access"
  NO_ROW / NO_COLS / NOT_READABLE  nothing to probe for this reader
  REFUSED    anything else (printed with the store's words)"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collections import Counter
from db import conn, as_person, ADMIN

only = set(sys.argv[1:])
c = conn(autocommit=False)
c.execute("set statement_timeout='8s'")
toks = c.execute("select token, schema_name, table_name from platform.entity_types where is_active and custom_fields_enabled order by token").fetchall()
res = {}
for tok, sch, tab in toks:
    if only and tok not in only:
        continue
    q = f'{sch}.{tab}'
    has = c.execute("select exists(select 1 from pg_attribute a where a.attrelid=to_regclass(%s) and a.attname='custom_fields' and not a.attisdropped), "
                    "exists(select 1 from pg_attribute a where a.attrelid=to_regclass(%s) and a.attname='organization_id' and not a.attisdropped)", (q, q)).fetchone()
    if not (has[0] and has[1]):
        res[tok] = ('NO_COLS', ''); continue
    c.execute("savepoint s")
    try:
        # a row in an organization the reader is in (found as the superuser, so a row she cannot read is still tried)
        row = c.execute(f'select id, organization_id from "{sch}"."{tab}" where organization_id in '
                        '(select organization_id from iam.organization_member where user_id=%s) limit 1', (ADMIN,)).fetchone()
        if not row:
            res[tok] = ('NO_ROW', ''); continue
        as_person(c)
        try:
            ans = c.execute("select custom.entity_record_read(%s,%s,%s)", (row[1], tok, row[0])).fetchone()[0]
            may = ans.get('may_edit')
        except Exception as e:
            res[tok] = ('NOT_READABLE', str(e).splitlines()[0][:140]); continue
        c.execute("savepoint w")
        try:
            c.execute("select custom.entity_row_write(%s,%s,%s,'{}'::jsonb,%s::jsonb)", (row[1], tok, row[0], '{"zz_probe":"x"}'))
            res[tok] = ('SAVED', f'may_edit={may}')
        except Exception as e:
            msg = str(e).splitlines()[0]
            if may is False and 'edit access' in msg:
                res[tok] = ('READ_ONLY', msg[:140])
            else:
                res[tok] = ('REFUSED', f'may_edit={may}: {msg[:140]}')
    except Exception as e:
        res[tok] = ('ERR', str(e).splitlines()[0][:140])
    finally:
        try:
            c.execute("rollback to savepoint s")
        except Exception:
            c.rollback()
c.rollback()
print(Counter(v[0] for v in res.values()))
for k, v in res.items():
    if v[0] not in ('SAVED', 'NO_ROW', 'NO_COLS'):
        print(k, v)
