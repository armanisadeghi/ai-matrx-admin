#!/usr/bin/env python3
"""
LANE STORE-READ-PERF-7 — EVERY TABLE A LIST COUNTS IS COUNTED ON ONE WALK: SAME ANSWERS (dev clone only).

  cd matrx-frontend && python3 scripts/campaign-tests/storereadperf7_green.py                 # the file, live
  cd matrx-frontend && python3 scripts/campaign-tests/storereadperf7_green.py --plant copy    # the file as pg_temp copies (before it is live)
  cd matrx-frontend && python3 scripts/campaign-tests/storereadperf7_green.py --plant plus_one # must go RED

The file's new path (the admitted pairs named in 'custom.qvi_pairs:<person>') is read by
custom.query_visible_ids only in a transaction that has written NOTHING, so this suite never writes: in ONE
REPEATABLE READ transaction (one snapshot) it asks, for every person and every organization:
  on   custom.table_row_counts(o, every live Table of o + one invented id) with nothing written (memos ON:
       one walk for every admitted Table);
  old  the body the file replaced (migrations/inverse/storereadperf7_..._down.sql, loaded as a pg_temp
       copy), at the same moment;
  off  custom.table_row_counts again after pg_current_xact_id() has given the transaction an id (every
       statement memo OFF: each Table takes the per-Table path);
and compares every answer byte for byte — which Tables are answered (a refused Table stays absent, an
organization she may not reach stays the same refusal, sqlstate and all) and every count. It also checks
  R  an outer door's own 'custom.qvi_pairs:<person>' list is still there, unchanged, after the counts.
People: admin@admin.com, test@test.com (the two seats, asked about EVERY organization that keeps a Table,
member or not) and every live member of an organization that keeps a Table (asked about their own).
Every door call is its own top-level statement (the memos are per statement).
--plant NAME loads the file's body with one fault planted (in the named-pairs path only) as a pg_temp copy:
  plus_one     a count read through the named pairs is one too many            (counts differ)
  prior_lost   an outer door's pair list is dropped instead of put back         (R)
Exit 0 GREEN, 1 RED, 2 could not run.
"""
import os, re, subprocess, sys, tempfile, collections

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FILE = os.path.join(ROOT, "migrations/campaign/storereadperf7_every_table_counted_on_one_walk.sql")
DOWN = os.path.join(ROOT, "migrations/inverse/storereadperf7_every_table_counted_on_one_walk_down.sql")

def _clone_ref() -> str:
    # the clone of tonight (rewritten by the nightly refresh): common-docs/operations/clone/CLONE-REF
    path = os.path.join(os.path.dirname(ROOT), "common-docs/operations/clone/CLONE-REF")
    for line in open(path):
        m = re.match(r"^\s*clone_ref\s*=\s*(\w+)", line)
        if m:
            return m.group(1)
    sys.exit("REFUSED: no clone_ref in " + path)

CLONE_REF = _clone_ref()
PSQL = os.environ.get("PSQL", "/opt/homebrew/opt/libpq/bin/psql")

def clone_url() -> str:
    for line in open(os.path.join(ROOT, ".env.local")):
        m = re.match(r"^\s*CLONE_DATABASE_URL\s*=\s*['\"]?(.*?)['\"]?\s*$", line)
        if m:
            url = m.group(1)
            if CLONE_REF not in url:
                sys.exit("REFUSED: CLONE_DATABASE_URL does not name the clone " + CLONE_REF)
            # the session pooler: pg_temp copies and the transaction must share one backend
            return url.replace(":6543/", ":5432/")
    sys.exit("REFUSED: no CLONE_DATABASE_URL in .env.local")

URL = clone_url()

def psql(script: str, timeout=3600) -> str:
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False) as f:
        f.write(script)
        path = f.name
    try:
        r = subprocess.run([PSQL, URL, "-X", "-At", "-v", "ON_ERROR_STOP=1", "-f", path],
                           capture_output=True, text=True, timeout=timeout)
    finally:
        os.unlink(path)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-4000:])
        sys.exit(2)
    return r.stdout

PLANTS = {
    # (old text, new text)
    "plus_one": ("    select count(*) into visible_rows from custom.query_visible_ids(p_organization_id, v_t, 'viewer');",
                 "    select count(*) + case when v_key is not null and pg_catalog.pg_current_xact_id_if_assigned() is null\n"
                 "                           then 1 else 0 end\n"
                 "      into visible_rows from custom.query_visible_ids(p_organization_id, v_t, 'viewer');"),
    "prior_lost": ("      perform platform.memo_k_put(v_key, v_prior);", "      perform platform.memo_k_drop(v_key);"),
}

def body_of(path: str) -> str:
    text = open(path).read()
    got = re.findall(r"(CREATE OR REPLACE FUNCTION custom\.table_row_counts\(.*?\n\$function\$;)", text, re.S)
    assert len(got) == 1, path
    return got[0]

def main():
    plant = None
    if "--plant" in sys.argv:
        plant = sys.argv[sys.argv.index("--plant") + 1]
        if plant != "copy" and plant not in PLANTS:
            sys.exit(f"unknown plant {plant}; one of copy, {', '.join(PLANTS)}")
    guard = psql("select current_database(), (select count(*) from pg_stat_replication), "
                 "coalesce(current_setting('mx.production', true), 'f');").strip().split("|")
    if guard[1] != "0" or guard[2] != "f":
        sys.exit(f"REFUSED: not the quarantined clone ({guard})")

    pre = ["\\set QUIET on", "set client_min_messages = warning;"]
    ns = "custom"
    # the body the file replaced, always, as pg_temp.trc_old
    pre.append(body_of(DOWN).replace("custom.table_row_counts(", "pg_temp.trc_old(", 1))
    if plant:
        ns = "pg_temp"
        b = body_of(FILE)
        if plant != "copy":
            old, new = PLANTS[plant]
            assert b.count(old) == 1, f"plant {plant} found nothing to change"
            b = b.replace(old, new)
        pre.append(b.replace("custom.table_row_counts(", "pg_temp.table_row_counts(", 1))

    # One answer line per call; a refusal is answered by its sqlstate (the wrapper's own subtransaction
    # writes nothing, so the memos stay ON).
    pre.append(f"""
create function pg_temp.p7_ask(p_which text, p_org uuid, p_tables uuid[]) returns text language plpgsql as $$
declare q text;
begin
  if p_which = 'old' then
    select coalesce(string_agg(c.table_id::text || '=' || c.visible_rows::text, ',' order by c.table_id), '')
      into q from pg_temp.trc_old(p_org, p_tables) c;
  else
    select coalesce(string_agg(c.table_id::text || '=' || c.visible_rows::text, ',' order by c.table_id), '')
      into q from {ns}.table_row_counts(p_org, p_tables) c;
  end if;
  return 'N|' || q;
exception when others then
  return 'E|' || sqlstate;
end $$;
create function pg_temp.p7_prior(p_user uuid, p_org uuid, p_tables uuid[]) returns text language plpgsql as $$
declare v_list text := 'p7-outer-door:' || md5(random()::text); v_after text;
begin
  perform platform.memo_k_put('custom.qvi_pairs:' || p_user::text, v_list);
  begin
    perform count(*) from {ns}.table_row_counts(p_org, p_tables);
  exception when others then
    null;
  end;
  v_after := platform.memo_k_get('custom.qvi_pairs:' || p_user::text);
  perform platform.memo_k_drop('custom.qvi_pairs:' || p_user::text);
  return case when v_after is not distinct from v_list then 'ok' else 'LOST' end;
end $$;
""")
    # the people and questions are worked out BEFORE the transaction (a temp table is a write)
    pre.append("""
create temp table if not exists p7_orgs as
  select t.organization_id as org,
         array_append(array_agg(t.id order by t.id), gen_random_uuid()) as tables
    from custom.record t
    join iam.organizations o on o.id = t.organization_id and o.archived_at is null
   where t.table_id = custom.table_kernel_id() and t.data_class = 'table' and t.deleted_at is null
   group by 1;
create temp table if not exists p7_ask as
  select u.id, u.email, g.org, g.tables
    from auth.users u cross join p7_orgs g
   where u.email in ('admin@admin.com', 'test@test.com')
  union
  select m.user_id, u.email, g.org, g.tables
    from iam.organization_member m
    join auth.users u on u.id = m.user_id
    join p7_orgs g on g.org = m.organization_id;
""")
    stmts = r"""
select z.s from (
  select p.email, 0 as k, null::uuid as org,
         format('select %L || ''|claims|'' || set_config(''request.jwt.claims'', %L, false);',
                p.email || '|' || :'phase', json_build_object('sub', p.id, 'role', 'authenticated')::text) as s
    from (select distinct id, email from p7_ask) p
  union all
  select a.email, 1, a.org, format('select %L || ''|on|%s|'' || pg_temp.p7_ask(''new'', %L, %L::uuid[]);',
                                   a.email || '|' || :'phase', a.org, a.org, a.tables)
    from p7_ask a
  union all
  select a.email, 2, a.org, format('select %L || ''|old|%s|'' || pg_temp.p7_ask(''old'', %L, %L::uuid[]);',
                                   a.email || '|' || :'phase', a.org, a.org, a.tables)
    from p7_ask a where :'phase' = 'on'
  union all
  select a.email, 3, a.org, format('select %L || ''|R|%s|'' || pg_temp.p7_prior(%L, %L, %L::uuid[]);',
                                   a.email || '|' || :'phase', a.org, a.id, a.org, a.tables)
    from p7_ask a
) z order by z.email, z.org nulls first, z.k
"""
    script = "\n".join(pre) + f"""
begin isolation level repeatable read;
set local statement_timeout = 0;
\\set phase on
{stmts} \\gexec
select pg_current_xact_id() is not null as wrote \\gset
\\set phase off
{stmts} \\gexec
select 'WROTE|' || (pg_current_xact_id_if_assigned() is not null)::text;
rollback;
"""
    out = psql(script)
    ans = collections.defaultdict(dict)
    prior_bad = []
    n_r = 0
    for line in out.splitlines():
        p = line.split("|", 4)
        if len(p) == 5 and p[1] in ("on", "off") and p[2] in ("on", "old", "R"):
            email, phase, kind, org, val = p
            if kind == "R":
                n_r += 1
                if val != "ok":
                    prior_bad.append((email, phase, org))
                continue
            col = "old" if kind == "old" else phase          # on (memos on) / off (memos off) / old body
            ans[(email, org)][col] = val
    n = len(ans)
    differ = [(k, v) for k, v in ans.items()
              if not (v.get("on") is not None and v.get("on") == v.get("off") == v.get("old"))]
    counted = sum(1 for v in ans.values() for x in (v.get("on") or "").split("|", 1)[-1].split(",") if "=" in x)
    refused = sum(1 for v in ans.values() if (v.get("on") or "").startswith("E|"))
    print(f"# {'plant ' + plant if plant else 'the file, live'}: {n} (person, organization) answers compared "
          f"three ways, {counted} Table counts, {refused} refusals, {len({k[0] for k in ans})} people, "
          f"{len(differ)} differ; {n_r} outer-list checks, {len(prior_bad)} lost")
    for k, v in differ[:12]:
        print("  DIFFER", k[0], k[1], "| on:", str(v.get("on"))[:70], "| off:", str(v.get("off"))[:70],
              "| old:", str(v.get("old"))[:70])
    for b in prior_bad[:6]:
        print("  LOST", *b)
    if n < 20 or counted < 100:
        print("RED: too few answers to mean anything")
        sys.exit(1)
    ok = not differ and not prior_bad
    print("GREEN" if ok else "RED")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
