"""LIVE (committed) custom-value save on a kind, as admin@admin.com, then cleanup through the doors:
declare a text field -> save a value -> read it back (as the superuser) -> clear it -> retire the field.
Usage (from aidream): uv run python ../matrx-frontend/scripts/custom-fields-write/live_save.py <token> <row id> <org id>"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import conn, as_person

token, rid, org = sys.argv[1:4]
c = conn()
sch, tab = c.execute("select schema_name, table_name from platform.entity_types where token=%s", (token,)).fetchone()


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


fid = tx("select custom.entity_field_declare(%s,%s,%s::jsonb)", (org, token, json.dumps({'label': 'Cfw2 live field', 'type': 'text'})))[0]
try:
    tx("select custom.entity_row_write(%s,%s,%s,'{}'::jsonb,%s::jsonb)", (org, token, rid, json.dumps({'cfw2_live_field': 'live saved'})))
    print(token, 'stored:', c.execute(f'select custom_fields ->> %s from "{sch}"."{tab}" where id=%s', ('cfw2_live_field', rid)).fetchone()[0])
finally:
    tx("select custom.entity_row_write(%s,%s,%s,'{}'::jsonb,%s::jsonb)", (org, token, rid, json.dumps({'cfw2_live_field': None})))
    tx("select custom.entity_field_retire(%s,%s)", (org, fid))
    print(token, 'cleared+retired; left:', c.execute(f'select custom_fields ? %s from "{sch}"."{tab}" where id=%s', ('cfw2_live_field', rid)).fetchone()[0])
