"""One rolled-back custom-value save per registered token, as admin@admin.com (CF-WRITE-2 census).
Usage (from aidream): uv run python ../matrx-frontend/scripts/custom-fields-write/census_probe.py [token ...]
Every save is rolled back. Per token the outcome is one of:
  SAVED      the door saved a value
  READ_ONLY  the ladder says this reader may not edit this row: the door answers may_edit=false AND refuses in words
             ("takes edit access") - the section shows the values read-only with "Needs Edit access"
  NO_ROW / NO_COLS / NOT_READABLE  nothing to probe for this reader
  REFUSED    the write refused although may_edit said true (a DISAGREEMENT: the control is enabled, then refuses)
  OTHER      anything else (printed with the store's words)
  CF-WRITE-3 rule: for every token may_edit must AGREE with the write outcome: SAVED needs may_edit=true, and a refusal
  needs may_edit=false. Any SAVED with may_edit=false or REFUSED with may_edit=true is listed under DISAGREE and the
  script exits 1."""
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
        # up to 8 rows, one per organization the reader is in, read AS the reader (a row she cannot open is no row for her);
        # the first one the read door opens (an archived organization or a row hidden from her is skipped)
        as_person(c)
        cands = c.execute(f'select distinct on (organization_id) id, organization_id from "{sch}"."{tab}" where organization_id in '
                          '(select organization_id from iam.organization_member where user_id=%s) limit 8', (ADMIN,)).fetchall()
        if not cands:
            res[tok] = ('NO_ROW', 'none she can open'); continue
        row = may = None
        last = ''
        for cand in cands:
            c.execute("savepoint r")
            try:
                ans = c.execute("select custom.entity_record_read(%s,%s,%s)", (cand[1], tok, cand[0])).fetchone()[0]
                row, may = cand, ans.get('may_edit')
                break
            except Exception as e:
                last = str(e).splitlines()[0][:140]
                c.execute("rollback to savepoint r")
        if row is None:
            res[tok] = ('NOT_READABLE', last); continue
        c.execute("savepoint w")
        try:
            c.execute("select custom.entity_row_write(%s,%s,%s,'{}'::jsonb,%s::jsonb)", (row[1], tok, row[0], '{"zz_probe":"x"}'))
            res[tok] = ('SAVED' if may is not False else 'DISAGREE', f'may_edit={may}, the write saved')
        except Exception as e:
            msg = str(e).splitlines()[0]
            if may is False:
                res[tok] = ('READ_ONLY' if ('edit access' in msg or 'not yours to change' in msg) else 'READ_ONLY_OTHER', msg[:140])
            else:
                res[tok] = ('DISAGREE', f'may_edit={may} but the write refused: {msg[:140]}')
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
sys.exit(1 if any(v[0] == 'DISAGREE' for v in res.values()) else 0)
