/**
 * AT-DBFIX 1 — a block keeps its id, so a chart on a page draws.
 * Use case: the owner of Harbor Point Event Spaces lays a Venue Bookings page out with two charts,
 * each named by the id the page gave it. Run on LIVE inside one rolled-back transaction (seconds).
 * RED before atdbfix_a_a_block_keeps_its_id_so_a_chart_draws.sql: the ids come back missing.
 *   pnpm exec tsx scripts/campaign-tests/atdbfix_block_ids_green.mts
 */
import { connectDirect, loadDbEnv } from "../lib/direct-db.ts";

const ADMIN = "87a6e699-3622-4869-8843-d0867456c0dd"; // admin@admin.com
async function main() {
  const env = loadDbEnv();
  if ("missing" in env) throw new Error("db env missing");
  const c = await connectDirect(env as never, "atdbfix-block-ids");
  const fail: string[] = [];
  const must = (ok: boolean, what: string) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
    if (!ok) fail.push(what);
  };
  try {
    await c.query("begin");
    await c.query("select set_config('app.actor_system','campaign-test/atdbfix-block-ids',true)");
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ADMIN, role: "authenticated" })]);
    const org = (await c.query("select gen_random_uuid() id")).rows[0].id;
    await c.query(
      "insert into iam.organizations (id,name,slug,abbreviation,created_by) values ($1::uuid,'Harbor Point Event Spaces '||substr($1::text,1,8),'harbor-point-atdb-'||substr($1::text,1,8),'HPE',$2::uuid)",
      [org, ADMIN],
    );
    await c.query("insert into iam.memberships (organization_id,container_type,container_id,user_id,role,status) values ($1::uuid,'organization',$1::uuid,$2::uuid,'owner','active')", [org, ADMIN]);
    await c.query(
      "insert into platform.knob_override (feature,key,scope_kind,scope_id,organization_id,value,set_note) values ('custom','system_enabled','organization',$1::uuid,$1::uuid,'true'::jsonb,'atdbfix')",
      [org],
    );
    const home = (await c.query("insert into custom.record (organization_id,table_id,data) values ($1,null,jsonb_build_object('name','Home')) returning id", [org])).rows[0].id;
    const t = (
      await c.query(
        `select custom.table_declare($1, jsonb_build_object('name','Venue Bookings','slug','venue_bookings','type','entity','label_singular','Booking','label_plural','Bookings','title_field','event','display','list','weight','light','ordered',true,'row_order','sorted','agent_writable',true,'retention_days',3650,'default_sort',jsonb_build_array(jsonb_build_object('field','event','direction','asc')),'parent_id',$2::text,'fields',jsonb_build_array(jsonb_build_object('name','event')))) t`,
        [org, home],
      )
    ).rows[0].t;
    await c.query("select custom.field_declare($1,$2,jsonb_build_object('key','event','label','Event','type','text','sort',10,'required',true))", [org, t]);
    await c.query("select custom.field_declare($1,$2,jsonb_build_object('key','room','label','Room','type','text','sort',20))", [org, t]);
    for (const [e, r] of [["Chen wedding", "Ballroom"], ["Orbit Labs offsite", "Terrace"], ["Okafor retirement", "Ballroom"]])
      await c.query("select custom.record_write($1,$2,jsonb_build_object('event',$3::text,'room',$4::text))", [org, t, e, r]);
    await c.query("set local role authenticated");
    const blocks = [
      { id: "chart-rooms", title: "Bookings by room", kind: "column", group_by: ["room"], measures: [{ op: "count" }] },
      { id: "chart-total", title: "All bookings", kind: "number", measures: [{ op: "count" }] },
      { title: "No id given", kind: "number", measures: [{ op: "count" }] },
    ];
    const dash = (await c.query("select custom.dashboard_declare($1,$2,'Venue Bookings page',$3::jsonb,'{}'::jsonb,null) d", [org, t, JSON.stringify(blocks)])).rows[0].d;
    const run = (await c.query("select custom.dashboard_run($1,$2) r", [org, dash])).rows[0].r;
    const ids = (run.blocks as Array<{ id?: string }>).map((b) => b.id ?? null);
    must(ids[0] === "chart-rooms" && ids[1] === "chart-total", `the run answers each block under its own id (got ${JSON.stringify(ids)})`);
    must(ids[2] === null, "a block given no id still has none (nothing is invented)");
    must(JSON.stringify(run.blocks[0]).includes("Ballroom"), "the chart still draws its numbers");
    let tooLong = false;
    await c.query("savepoint s");
    try {
      await c.query("select custom.dashboard_declare($1,$2,'x',$3::jsonb,'{}'::jsonb,null)", [org, t, JSON.stringify([{ id: "x".repeat(81), kind: "number" }])]);
    } catch {
      tooLong = true;
    }
    await c.query("rollback to savepoint s");
    must(tooLong, "an id over 80 characters is refused by name");
  } finally {
    await c.query("rollback").catch(() => undefined);
    await c.end();
  }
  console.log(fail.length ? `RED: ${fail.length} failed` : "GREEN");
  process.exit(fail.length ? 1 : 0);
}
void main();
