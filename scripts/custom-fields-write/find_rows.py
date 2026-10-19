"""List the rows (any kind) that still hold a value under a custom-field key, read as the superuser.
Usage (from aidream): uv run python ../matrx-frontend/scripts/custom-fields-write/find_rows.py <token> <key>
  e.g. find_rows.py hr_pay_period audit2_test_field"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import conn

token, key = sys.argv[1], sys.argv[2]
c = conn()
sch, tab = c.execute("select schema_name, table_name from platform.entity_types where token=%s", (token,)).fetchone()
for r in c.execute(f'select id, organization_id, custom_fields -> %s from "{sch}"."{tab}" where custom_fields ? %s', (key, key)).fetchall():
    print(token, key, 'row', r[0], 'org', r[1], 'value', r[2])
f = c.execute("select id, organization_id, deleted_at from custom.record where data->>'table_token'=%s and data->>'key'=%s", (token, key)).fetchall()
for x in f:
    print('field', x[0], 'org', x[1], 'retired_at', x[2])
