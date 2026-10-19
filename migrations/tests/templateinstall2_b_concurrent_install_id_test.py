"""TEMPLATE-INSTALL-2 b: two calls with the SAME caller-chosen install id, fired at the same moment from two connections, make ONE install.
Run:  cd ../aidream && uv run python ../matrx-frontend/migrations/tests/templateinstall2_b_concurrent_install_id_test.py
Signs in as admin@admin.com (jwt claims + role authenticated), installs a real copy of Home Inventory in the test admin's organization,
checks one install row exists for the id and the live copy count rose by exactly one, then removes the copy through the uninstall door.
Red before 20261020031000 (the door refused an id it had not made); green after."""
import json, sys, threading, uuid
import psycopg
from dotenv import dotenv_values

e = dotenv_values("/Users/armanisadeghi/code/aidream/.env")
ORG = "5dc930e9-bd65-44a1-8369-af773f6e1a5b"

def conn():
    return psycopg.connect(host=e["SUPABASE_MATRIX_HOST"], port=e["SUPABASE_MATRIX_PORT"], dbname=e["SUPABASE_MATRIX_DATABASE_NAME"],
                           user=e["SUPABASE_MATRIX_USER"], password=e["SUPABASE_MATRIX_PASSWORD"])

owner = conn(); owner.autocommit = True
uid = owner.execute("select id from auth.users where email='admin@admin.com'").fetchone()[0]
tpl = owner.execute("select id from custom.template where catalogue_id='SP0215' and retired_at is null order by template_version desc limit 1").fetchone()[0]
live = lambda: owner.execute("select count(*) from custom.template_install where organization_id=%s and catalogue_id='SP0215' and state<>'uninstalled'", (ORG,)).fetchone()[0]

def door(fn, *args):
    c = conn()
    try:
        c.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({"sub": str(uid), "role": "authenticated"}),))
        c.execute("set local role authenticated")
        r = c.execute(f"select custom.{fn}", args, prepare=False).fetchone()[0]
        c.commit(); return r
    except Exception as ex:
        c.rollback(); return {"error": f"{type(ex).__name__}: {ex}"}
    finally:
        c.close()

iid = str(uuid.uuid4()); before = live(); out = [None, None]; gate = threading.Barrier(2)
def run(k):
    gate.wait()
    out[k] = door("template_install_fresh(%s,%s,%s,%s,%s)", ORG, str(tpl), "TI2b concurrent", iid, 0)
t = [threading.Thread(target=run, args=(k,)) for k in range(2)]
[x.start() for x in t]; [x.join() for x in t]
fail = []
try:
    for k in range(2):
        if out[k].get("error") or out[k].get("install_id") != iid:
            fail.append(f"call {k} did not answer the chosen id: {str(out[k])[:300]}")
    rows = owner.execute("select count(*) from custom.template_install where id=%s", (iid,)).fetchone()[0]
    if rows != 1: fail.append(f"{rows} install rows for one id")
    if live() != before + 1: fail.append(f"live copies {before} -> {live()}; the same id must add exactly one")
finally:
    # finish and remove the copy through the doors (a committed test record)
    for _ in range(40):
        r = door("template_install_fresh(%s,%s,%s,%s,%s)", ORG, str(tpl), "TI2b concurrent", iid, 6000)
        if r.get("done") or r.get("error"): break
    for _ in range(80):
        r = door("template_uninstall(%s,%s,%s)", ORG, iid, 4000)
        if r.get("done") or r.get("error"): break
    left = live()
    if left != before: fail.append(f"cleanup left {left - before} live copies")
print("FAILED: " + "; ".join(fail) if fail else "OK: two concurrent calls with one id made one install")
sys.exit(1 if fail else 0)
