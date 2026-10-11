#!/usr/bin/env python3
"""ONE-LADDER page-trash proof (clone only, always rolled back): the migration's patch of content.space_set_trashed, then creator / Full / Edit (refused) / org admin / plain-member creator. Run: cd aidream && uv run python ../matrx-frontend/scripts/db-proofs/one-ladder-page-trash.py"""
import json, psycopg, re
from dotenv import dotenv_values
env = dotenv_values('/Users/armanisadeghi/code/aidream/.env')
c = psycopg.connect(env['CLONE_DATABASE_URL'], autocommit=False); cur=c.cursor()
cur.execute("set local statement_timeout='30s'; set local lock_timeout='5s'")
# patch like migration
cur.execute("select pg_get_functiondef('content.space_set_trashed(uuid,boolean)'::regprocedure)")
d = cur.fetchone()[0]
rx = r"(iam\.has_access\('document', p_(space|document)_id, )'editor'(::public\.permission_level)?\)"
nd = re.sub(rx, r"\1'admin'::public.permission_level)", d)
print("patched:", nd != d)
cur.execute(nd)
ORG='2643e470-b275-47f3-95f3-ae275ad3ca47'
cur.execute("select id, created_by from content.document where format='spaces' and deleted_at is null and organization_id=%s and created_by='87a6e699-3622-4869-8843-d0867456c0dd' limit 1",(ORG,))
doc, creator = cur.fetchone()
cur.execute("select user_id, role from iam.organization_member where organization_id=%s and user_id<>%s order by role",(ORG,creator))
mem = cur.fetchall(); print(mem)
admins=[u for u,r in mem if str(r) in('admin','owner')]; others=[u for u,r in mem if str(r) not in('admin','owner')]
print("admins",admins[:2],"others",others[:3])
def grant(u, lvl):
    cur.execute("reset role")
    cur.execute("insert into iam.permissions(resource_type,resource_id,granted_to_user_id,permission_level,status,created_by) values('document',%s,%s,%s,'active',%s)",(doc,u,lvl,creator))
def seat(uid):
    cur.execute("reset role")
    cur.execute("select set_config('request.jwt.claims', %s, true), set_config('request.jwt.claim.sub', %s, true)", (json.dumps({"sub": str(uid), "role":"authenticated"}), str(uid)))
    cur.execute("set local role authenticated")
def attempt(label, uid, trash=True):
    seat(uid); cur.execute("savepoint sp")
    try:
        cur.execute("select content.space_set_trashed(%s,%s)",(doc,trash)); print(label,"ALLOWED",cur.fetchone()[0])
    except Exception as e:
        print(label,"REFUSED",getattr(e,'sqlstate',None),str(e).splitlines()[0]); cur.execute("rollback to savepoint sp")
    cur.execute("reset role")
full, edit = others[0], others[1]
grant(full,'admin'); grant(edit,'editor')
attempt("creator",creator)
cur.execute("reset role"); cur.execute("update content.document set deleted_at=null where id=%s",(doc,))
attempt("full",full)
cur.execute("reset role"); cur.execute("update content.document set deleted_at=null where id=%s",(doc,))
attempt("edit",edit)
if admins: 
    attempt("orgadmin",admins[0])

# org admin seat: a member promoted inside the txn
oa=others[2]
cur.execute("reset role"); cur.execute("update iam.memberships set role='admin' where container_type='organization' and container_id=%s and user_id=%s",(ORG,oa)); cur.execute("update content.document set deleted_at=null where id=%s",(doc,))
attempt("orgadmin",oa)
# plain-member creator
pm=others[3]
cur.execute("reset role"); cur.execute("update content.document set deleted_at=null, created_by=%s where id=%s",(pm,doc))
cur.execute("select created_by from content.document where id=%s",(doc,)); print('creator now',cur.fetchone())
attempt("member-creator",pm)
cur.execute("reset role"); cur.execute("update content.document set deleted_at=null where id=%s",(doc,))
attempt("member-creator-restore-after-trash",pm,True)
c.rollback()
