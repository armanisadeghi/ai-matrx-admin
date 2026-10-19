"""CF-WRITE-3 read-only caption fixture. Usage (from aidream): uv run python ../matrx-frontend/scripts/custom-fields-write/readonly_ui_fixture.py up|check|down
Org: the Template sweep (test) org. up: add test@test.com as a plain member, create one disposable workflow definition (by admin@admin.com; a plain member holds viewer on a colleague's workflow),
declare one text field on workflows there and save a value. check: what test@test.com's read door answers (may_edit). down: clear
the value, retire the field, archive the workflow, remove the membership this script added. State is kept in fixture_state.json."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import conn, as_person, ADMIN

ORG = '9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d'
TEST = '4060701e-706a-4c76-b3ca-0bbc69fa5a14'  # test@test.com
STATE = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'cfw3_fixture_state.json')
c = conn()


def fresh():
    global c
    c.close()
    c = conn()


def save(st):
    json.dump(st, open(STATE, 'w'))


def tx(uid, sql, args=()):
    c.autocommit = False
    try:
        as_person(c, uid)
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
    st = json.load(open(STATE)) if os.path.exists(STATE) else {}
    had = c.execute("select 1 from iam.organization_member where organization_id=%s and user_id=%s", (ORG, TEST)).fetchone()
    if not had or st.get('added_member'):
        pass
    if not had:
        st['membership'] = str(c.execute("insert into iam.memberships (organization_id, container_type, container_id, user_id, role, status, created_by) values (%s,'organization',%s,%s,'member','active',%s) on conflict (container_type, container_id, user_id) do update set status='active', deleted_at=null, role='member' returning id", (ORG, ORG, TEST, ADMIN)).fetchone()[0])
        st['added_member'] = True
        save(st)
        fresh()
    rid = tx(ADMIN, "insert into workflow.definition (name, organization_id, created_by) values ('CFW3 read-only caption (test)', %s, %s) returning id", (ORG, ADMIN))[0]
    st['row'] = str(rid)
    save(st)
    fid = tx(ADMIN, "select custom.entity_field_declare(%s,'workflow',%s::jsonb)", (ORG, json.dumps({'label': 'Cfw3 caption field', 'type': 'text'})))[0]
    st['field'] = str(fid)
    save(st)
    tx(ADMIN, "select custom.entity_row_write(%s,'workflow',%s,'{}'::jsonb,%s::jsonb)", (ORG, str(rid), json.dumps({'cfw3_caption_field': 'value kept read-only'})))
    json.dump(st, open(STATE, 'w'))
    print(st)
elif cmd == 'check':
    st = json.load(open(STATE))
    for who, uid in (('admin', ADMIN), ('test@test.com', TEST)):
        r = tx(uid, "select custom.entity_record_read(%s,'workflow',%s)", (ORG, st['row']))[0]
        print(who, 'may_edit =', r['may_edit'], '| custom =', r['custom'])
elif cmd == 'down':
    st = json.load(open(STATE))
    tx(ADMIN, "select custom.entity_row_write(%s,'workflow',%s,'{}'::jsonb,%s::jsonb)", (ORG, st['row'], json.dumps({'cfw3_caption_field': None})))
    tx(ADMIN, "select custom.entity_field_retire(%s,%s)", (ORG, st['field']))
    c.execute("update workflow.definition set deleted_at=now() where id=%s", (st['row'],))
    if st.get('added_member'):
        c.execute("update iam.memberships set status='departed', deleted_at=now() where id=%s", (st['membership'],))
    print('down; workflow archived, field retired, value cleared; membership removed =', bool(st.get('added_member')))
