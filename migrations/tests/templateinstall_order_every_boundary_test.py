"""INSTALL-ORDER: a fresh install survives a failed call at EVERY step boundary and finishes with all its tables and a bound assistant.
Run:  cd ../aidream && uv run python ../matrx-frontend/migrations/tests/templateinstall_order_every_boundary_test.py [CATALOGUE_ID]
Signs in as admin@admin.com (jwt claims + role authenticated) in the Template sweep (test) org. One install of the template (default SP0101),
one step per call (budget 0). At each step boundary the call is first run and ROLLED BACK (the failure the retry layer re-asks: the server undid
everything, nothing reached the caller), then asked again with the same install id and committed. At the end the answer must be done, hold
every table the plan makes, and every table the assistant binds must be one of them (a binding to a table the install never made is the
"The template binds ... which was not created" failure on the first press). Removes the copy through the uninstall door.
Red before the SP0101 pack named its real table (variable related_tables bound to "team", a table the plan never makes); green after."""
import json, sys, uuid
import psycopg
from dotenv import dotenv_values

e = dotenv_values("/Users/armanisadeghi/code/aidream/.env")
ORG = "9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d"  # Template sweep (test)
CAT = sys.argv[1] if len(sys.argv) > 1 else "SP0101"

def conn():
    c = psycopg.connect(host=e["SUPABASE_MATRIX_HOST"], port=e["SUPABASE_MATRIX_PORT"], dbname=e["SUPABASE_MATRIX_DATABASE_NAME"],
                        user=e["SUPABASE_MATRIX_USER"], password=e["SUPABASE_MATRIX_PASSWORD"])
    return c

owner = conn(); owner.autocommit = True
uid = owner.execute("select id from auth.users where email='admin@admin.com'").fetchone()[0]
tpl, plan = owner.execute("select id, plan from custom.template where catalogue_id=%s and retired_at is null order by template_version desc limit 1", (CAT,)).fetchone()
plan_tables = {s["label"] for s in plan["steps"] if s["label"].startswith("tables.")}
live = lambda: owner.execute("select count(*) from custom.template_install where organization_id=%s and catalogue_id=%s and state<>'uninstalled'", (ORG, CAT)).fetchone()[0]

def door(fn, args, commit=True):
    c = conn()
    try:
        c.execute("set statement_timeout = '120s'")
        c.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({"sub": str(uid), "role": "authenticated"}),))
        c.execute("set local role authenticated")
        r = c.execute(f"select custom.{fn}", args, prepare=False).fetchone()[0]
        (c.commit if commit else c.rollback)()
        return r
    except Exception as ex:
        c.rollback(); return {"error": f"{type(ex).__name__}: {ex}"}
    finally:
        c.close()

iid = str(uuid.uuid4()); before = live(); fail = []; answer = {}; calls = 0
try:
    for _ in range(200):
        lost = door("template_install_fresh(%s,%s,%s,%s,%s)", (ORG, str(tpl), "order guard", iid, 0), commit=False)  # a failed call: all undone
        if lost.get("error"): fail.append(f"a call that was rolled back refused its own retry: {lost['error'][:200]}"); break
        answer = door("template_install_fresh(%s,%s,%s,%s,%s)", (ORG, str(tpl), "order guard", iid, 0)); calls += 1
        if answer.get("error") or answer.get("state") == "refused": fail.append(f"call {calls}: {str(answer.get('error') or answer.get('refusal'))[:300]}"); break
        if answer.get("done"): break
    else:
        fail.append("the install did not finish in 200 calls")
    if not fail:
        made = {m["ref"]: m["id"] for m in answer.get("made", []) if m["kind"] == "table"}
        missing = plan_tables - set(made)
        if missing: fail.append(f"tables the plan makes were not made: {sorted(missing)}")
        gone = [r for r, i in made.items() if not owner.execute("select 1 from custom.record where id=%s and deleted_at is null", (i,)).fetchone()]
        if gone: fail.append(f"tables listed but not live: {gone}")
        for b in (answer.get("agent") or {}).get("bindings", []):
            if not b.get("table_id") or b["table_id"] not in made.values():
                fail.append(f'the assistant binds "{b.get("variable")}" to "{b.get("tableToken")}", a table this install never made')
finally:
    for _ in range(120):
        r = door("template_uninstall(%s,%s,%s)", (ORG, iid, 4000))
        if r.get("done") or r.get("error"): break
    left = live() - before
    if left: fail.append(f"cleanup left {left} live copies")
print("FAILED: " + "; ".join(fail) if fail else f"OK: {CAT} finished in {calls} calls with a failed call at every boundary; every bound table exists")
sys.exit(1 if fail else 0)
