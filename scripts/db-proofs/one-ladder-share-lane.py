#!/usr/bin/env python3
"""ONE-LADDER share_lane_set proof (clone only, always rolled back): may_grant_as + the follow-up migration applied inside the transaction, then owner / Full / Edit / viewer through custom.share_lane_set. Run: cd aidream && uv run python ../matrx-frontend/scripts/db-proofs/one-ladder-share-lane.py"""
import json, psycopg, re, sys
from dotenv import dotenv_values
env = dotenv_values('/Users/armanisadeghi/code/aidream/.env')
M=open('/Users/armanisadeghi/code/matrx-frontend/migrations/campaign/one_ladder_edit_is_content_full_is_structure.sql').read()
F=open('/Users/armanisadeghi/code/matrx-frontend/migrations/campaign/one_ladder_share_lane_and_seat_level.sql').read()
knobs=M[M.index("insert into platform.feature_knob"):M.index("-- The level the actor holds")]
fns=M[M.index("create or replace function iam.holds_level_as"):M.index("insert into platform.client_callable_door")]
c = psycopg.connect(env['CLONE_DATABASE_URL'], autocommit=False); cur=c.cursor()
cur.execute("set local statement_timeout='60s'; set local lock_timeout='5s'")
cur.execute(knobs); cur.execute(fns); cur.execute(F)
ORG='2643e470-b275-47f3-95f3-ae275ad3ca47'; OWNER='87a6e699-3622-4869-8843-d0867456c0dd'
cur.execute("select custom.table_kernel_id()"); kern=cur.fetchone()[0]
cur.execute("select id from custom.record where organization_id=%s and table_id=%s and created_by=%s limit 1",(ORG,kern,OWNER))
r=cur.fetchone(); print("table record",r)
tbl=r[0]
cur.execute("select user_id from iam.organization_member where organization_id=%s and user_id<>%s limit 4",(ORG,OWNER)); mem=[x[0] for x in cur.fetchall()]
edit,full,viewer,_=mem
def seat(uid):
    cur.execute("reset role")
    cur.execute("select set_config('request.jwt.claims', %s, true), set_config('request.jwt.claim.sub', %s, true)", (json.dumps({"sub": str(uid), "role":"authenticated"}), str(uid)))
    cur.execute("set local role authenticated")
def grant(u,l):
    cur.execute("reset role")
    cur.execute("insert into iam.permissions(resource_type,resource_id,granted_to_user_id,permission_level,status,created_by) values('record',%s,%s,%s,'active',%s)",(tbl,u,l,OWNER))
grant(edit,'editor'); grant(full,'admin')
n=[0]
def go(label,uid,choice,level=None):
    seat(uid); n[0]+=1; sp=f"sp{n[0]}"; cur.execute(f"savepoint {sp}")
    try:
        cur.execute("select custom.share_lane_set(%s,%s,%s,%s)",(ORG,tbl,choice,level)); print(f"{label:34s} ALLOWED", str(cur.fetchone()[0])[:90])
    except Exception as e:
        print(f"{label:34s} REFUSED {getattr(e,'sqlstate',None)} {str(e).splitlines()[0][:110]}"); cur.execute(f"rollback to savepoint {sp}")
    cur.execute("reset role")
go("owner world (fresh)",OWNER,"world")
go("full  world (fresh)",full,"community")
go("owner org->viewer",OWNER,'organization','viewer')
go("full  org->editor",full,'organization','editor')
go("full  world",full,'world')
go("edit  org->viewer",edit,'organization','viewer')
go("edit  org->editor",edit,'organization','editor')
go("edit  org->admin (above own)",edit,'organization','admin')
go("edit  community (anyone link)",edit,'community')
go("edit  world",edit,'world')
go("edit  mine (takes sharing away)",edit,'mine')
go("viewer org->viewer",viewer,'organization','viewer')
go("full  mine",full,'mine')
# entity_seat_level body check
cur.execute("select pg_get_functiondef('custom.entity_seat_level(uuid,text,uuid)'::regprocedure) like '%edit_content%'"); print("entity_seat_level still names edit_content:",cur.fetchone()[0])
c.rollback()
