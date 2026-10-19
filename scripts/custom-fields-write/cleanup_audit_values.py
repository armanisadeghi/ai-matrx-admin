"""Clear a leftover custom value under a RETIRED test field, through the doors, as admin@admin.com:
restore the field (custom.field_restore) -> clear the value (custom.entity_row_write, key = null) -> retire it again
(custom.entity_field_retire). Each step is its own committed transaction. Nothing is touched but the named field and the
rows that hold its key.
Usage (from aidream): uv run python ../matrx-frontend/scripts/custom-fields-write/cleanup_audit_values.py <token> <key> [--go]
Without --go it only lists what it would do."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import conn, as_person

token, key = sys.argv[1], sys.argv[2]
go = '--go' in sys.argv
c = conn()
sch, tab = c.execute("select schema_name, table_name from platform.entity_types where token=%s", (token,)).fetchone()
rows = c.execute(f'select id, organization_id from "{sch}"."{tab}" where custom_fields ? %s', (key,)).fetchall()
field = c.execute("select id, organization_id, deleted_at from custom.record where data->>'table_token'=%s and data->>'key'=%s order by created_at desc", (token, key)).fetchone()
print('rows holding the key:', rows, '| field:', field)
if not go or not field:
    sys.exit(0)
fid, forg, retired = field


def tx(sql, args):
    c.autocommit = False
    try:
        as_person(c)
        out = c.execute(sql, args).fetchone()
        c.commit()
        return out
    except Exception:
        c.rollback()
        raise
    finally:
        c.autocommit = True


if retired:
    print('restore', tx("select custom.field_restore(%s,%s)", (forg, fid)))
for rid, org in rows:
    print('cleared', rid, tx("select custom.entity_row_write(%s,%s,%s,'{}'::jsonb,%s::jsonb)", (org, token, rid, json.dumps({key: None}))))
print('retired', tx("select custom.entity_field_retire(%s,%s)", (forg, fid)))
