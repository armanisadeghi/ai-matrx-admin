"""CF-WRITE-4 link-target fixture. From aidream: uv run python ../matrx-frontend/scripts/custom-fields-write/link_targets_fixture.py up|down
Org: Cedar Ridge Dental (admin@admin.com is its owner). up: one disposable custom table with a title and two link columns
(to a pay period and to a workflow run), one row. The link itself is made through the UI. down: the row and the table are
archived through the store's own doors. State: $TMPDIR/cfw4_link_fixture.json."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import conn, as_person, ADMIN

ORG = '23c2ac41-8044-49ed-9af9-35761370e5c0'
STATE = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'cfw4_link_fixture.json')
c = conn()
# Column shape under test: `entity` or `entity_reference` (LINK-PICKER tried both). Env LINK_FIXTURE_SHAPE.
SHAPE = os.environ.get('LINK_FIXTURE_SHAPE', 'entity_reference')


def tx(sql, args=()):
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


cmd = sys.argv[1]
if cmd == 'up':
    spec = {'name': 'CFW4 link test (disposable)', 'slug': 'cfw4_link_test', 'type': 'entity', 'weight': 'light', 'display': 'list',
            'title_field': 'title', 'ordered': False, 'row_order': 'manual', 'retention_days': 365, 'agent_writable': False,
            'default_sort': [{'field': 'title', 'direction': 'asc'}], 'label_plural': 'CFW4 link tests', 'label_singular': 'CFW4 link test',
            'fields': [{'key': 'title', 'label': 'Title', 'type': 'text'},
                       {'key': 'pay_period', 'label': 'Pay period', 'type': SHAPE, 'allowed_types': ['hr_pay_period']},
                       {'key': 'run', 'label': 'Workflow run', 'type': SHAPE, 'allowed_types': ['workflow_run']}]}
    te = tx("select custom.table_ensure(%s, %s::jsonb)", (ORG, json.dumps(spec)))[0]
    print(te)
    tid = te['table_id'] if isinstance(te, dict) else None
    rid = tx("select custom.record_write(%s, %s, %s::jsonb)", (ORG, tid, json.dumps({'title': 'CFW4 row'})))[0]
    st = {'table': str(tid), 'row': str(rid)}
    json.dump(st, open(STATE, 'w'))
    print(st)
elif cmd == 'down':
    # Every live row of the fixture table (a second `up` adds a row), then the table, through the store's own doors.
    st = json.load(open(STATE))
    rows = [r[0] for r in c.execute("select id from custom.record where table_id = %s and deleted_at is null", (st['table'],)).fetchall()]
    for rid in rows:
        print('row', tx("select custom.record_delete(%s, %s)", (ORG, str(rid)))[0])
    for _ in range(5):  # the archive carries on in chunks; the table goes last
        out = tx("select custom.table_archive(%s, %s, 500, true)", (ORG, st['table']))[0]
        print('table', out.get('message'), '| table_archived =', out.get('table_archived'))
        if out.get('table_archived'):
            break
