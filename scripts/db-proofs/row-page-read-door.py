"""ROW-PAGE-READ forcing test (live, always ROLLED BACK): a viewer of a row resolves its page through content.row_page_for; a stranger and no-session cannot; the viewer still has no access to unshared sibling rows. Run: cd aidream && uv run python ../matrx-frontend/scripts/db-proofs/row-page-read-door.py"""
import sys, json, psycopg
from dotenv import dotenv_values
e = dotenv_values('/Users/armanisadeghi/code/aidream/.env')
c = psycopg.connect(host=e['SUPABASE_MATRIX_HOST'], port=e['SUPABASE_MATRIX_PORT'], user=e['SUPABASE_MATRIX_USER'], password=e['SUPABASE_MATRIX_PASSWORD'], dbname=e['SUPABASE_MATRIX_DATABASE_NAME'], autocommit=False)
cur = c.cursor()
cur.execute("set local statement_timeout='30s'; set local lock_timeout='5s'")
cur.execute(open('/Users/armanisadeghi/code/matrx-frontend/migrations/campaign/row_pages_read_door.sql').read())
ROW='1868dc08-d230-49ac-9d09-1440ceb89967'; PAGE='3d332e49-47a9-4454-8b86-03bcc5682bed'; TBL='32145251-6c79-402d-bdad-6c0c370a0262'
ADMIN='87a6e699-3622-4869-8843-d0867456c0dd'; TEST='4060701e-706a-4c76-b3ca-0bbc69fa5a14'
cur.execute("select id from auth.users where id not in (%s,%s) and id not in (select granted_to_user_id from iam.permissions where granted_to_user_id is not null and resource_id in (%s,%s)) and id not in (select user_id from iam.organization_member where organization_id='2643e470-b275-47f3-95f3-ae275ad3ca47') limit 1",(ADMIN,TEST,ROW,PAGE))
STRANGER=cur.fetchone()[0]
cur.execute("insert into iam.permissions(resource_type,resource_id,granted_to_user_id,permission_level,status,created_by) values('record',%s,%s,'viewer','active',%s)",(ROW,TEST,ADMIN))
cur.execute("select id from custom.record where table_id=%s and id<>%s and deleted_at is null limit 1",(TBL,ROW)); SIB=cur.fetchone()[0]
def seat(u):
    cur.execute("reset role"); cur.execute("select set_config('request.jwt.claims',%s,true), set_config('request.jwt.claim.sub',%s,true)",(json.dumps({"sub":str(u),"role":"authenticated"}),str(u))); cur.execute("set local role authenticated")
def q(label, sql, args=()):
    cur.execute(sql,args); print(f"{label:58s}", cur.fetchall())
for name,u in (("viewer test@test.com",TEST),("stranger",STRANGER),("admin",ADMIN)):
    seat(u)
    q(f"{name}: sees row_body edge directly (old path)","select count(*) from platform.associations where source_id=%s and label='row_body'",(ROW,))
    q(f"{name}: row_page_for(row)","select content.row_page_for(%s)",(ROW,))
    q(f"{name}: has_access(document page)","select iam.has_access('document',%s,'viewer')",(PAGE,))
    q(f"{name}: has_access(row)","select iam.has_access('record',%s,'viewer')",(ROW,))
    q(f"{name}: has_access(an unshared sibling row)","select iam.has_access('record',%s,'viewer')",(SIB,))
seat(TEST); q("viewer: row_page_for(null)","select content.row_page_for(null)")
cur.execute("reset role"); c.rollback(); print("ROLLED BACK")
