#!/usr/bin/env python3
"""ONE-LADDER-3 proof (clone only, always rolled back): may_grant_as (from the main migration) + one_ladder_ui_doors.sql applied inside
the transaction, then creator / Edit / Full / viewer through platform.set_shown_to and iam.my_grantable_levels."""
import json, psycopg
from dotenv import dotenv_values
env = dotenv_values('/Users/armanisadeghi/code/aidream/.env')
D='/Users/armanisadeghi/code/matrx-frontend/migrations/campaign/'
M=open(D+'one_ladder_edit_is_content_full_is_structure.sql').read()
F=open(D+'one_ladder_share_lane_and_seat_level.sql').read()
U=open(D+'one_ladder_ui_doors.sql').read()
c = psycopg.connect(env['CLONE_DATABASE_URL'], autocommit=False); cur=c.cursor()
cur.execute("set local statement_timeout='60s'; set local lock_timeout='5s'")
cur.execute("select to_regprocedure('iam.may_grant_as(uuid,text,uuid,permission_level,text,uuid)')"); have=cur.fetchone()[0]
if not have:
    cur.execute(M[M.index("insert into platform.feature_knob"):M.index("-- The level the actor holds")])
    cur.execute(M[M.index("create or replace function iam.holds_level_as"):M.index("insert into platform.client_callable_door")])
cur.execute(U)
ORG='2643e470-b275-47f3-95f3-ae275ad3ca47'; OWNER='87a6e699-3622-4869-8843-d0867456c0dd'
cur.execute("select custom.table_kernel_id()"); kern=cur.fetchone()[0]
cur.execute("select id from custom.record where organization_id=%s and table_id=%s and created_by=%s limit 1",(ORG,kern,OWNER)); tbl=cur.fetchone()[0]
cur.execute("select user_id from iam.organization_member where organization_id=%s and user_id<>%s limit 4",(ORG,OWNER)); mem=[x[0] for x in cur.fetchall()]
edit,full,viewer,_=mem
def seat(uid):
    cur.execute("reset role")
    cur.execute("select set_config('request.jwt.claims', %s, true), set_config('request.jwt.claim.sub', %s, true)", (json.dumps({"sub": str(uid), "role":"authenticated"}), str(uid)))
    cur.execute("set local role authenticated")
def grant(u,l):
    cur.execute("reset role")
    cur.execute("insert into iam.permissions(resource_type,resource_id,granted_to_user_id,permission_level,status,created_by) values('record',%s,%s,%s,'active',%s)",(tbl,u,l,OWNER))
grant(edit,'editor'); grant(full,'admin'); grant(viewer,'viewer')
n=[0]
def run(label,uid,sql,args):
    seat(uid); n[0]+=1; sp=f"sp{n[0]}"; cur.execute(f"savepoint {sp}")
    try:
        cur.execute(sql,args); r=cur.fetchone()[0]; print(f"{label:38s} ALLOWED", json.dumps(r)[:150] if isinstance(r,(dict,list)) else r)
    except Exception as e:
        print(f"{label:38s} REFUSED {getattr(e,'sqlstate',None)} {str(e).splitlines()[0][:120]}"); cur.execute(f"rollback to savepoint {sp}")
    cur.execute("reset role")
S="select platform.set_shown_to('record',%s,%s)"
for who,uid in (("creator",OWNER),("edit",edit),("full",full),("viewer",viewer)):
    run(f"{who:7s} shown_to -> default (org)",uid,S,(tbl,None))
    run(f"{who:7s} shown_to -> only_me",uid,S,(tbl,'only_me'))
    run(f"{who:7s} shown_to -> everyone_on_ai_matrx",uid,S,(tbl,'everyone_on_ai_matrx'))
    run(f"{who:7s} my_grantable_levels",uid,"select iam.my_grantable_levels('record',%s)",(tbl,))
c.rollback(); print("rolled back")
