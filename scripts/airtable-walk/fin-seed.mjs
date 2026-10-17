// AT-WALK-FINAL seed: "Ridgeback Bike Repair" — Customers + Repair jobs, plus formula battery.
import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
const { client, organizationId } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const customers = must(await declareTable(client, { name: "Ridgeback Customers", labelSingular: "Customer", labelPlural: "Customers",
  fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "email", label: "Email", type: "email", sort: 20, unique: true },
    { key: "tier", label: "Tier", type: "select", sort: 30, options: ["Regular", "Club", "Fleet"] },
  ] }), "customers");
const cids = [];
for (const [name, email, tier] of [["Dara Okonkwo","dara@ridgeback.example","Club"],["Mateus Ferreira","mateus@ridgeback.example","Regular"],["Ines Holloway","ines@ridgeback.example","Fleet"]])
  cids.push(must(await client.recordWrite({ table_id: customers, data: { name, email, tier } }), "c"));
const jobs = must(await declareTable(client, { name: "Ridgeback Jobs", labelSingular: "Job", labelPlural: "Jobs",
  fields: [
    { key: "job", label: "Job", type: "text", sort: 10 },
    { key: "customer", label: "Customer", type: "relation", relationTarget: customers, sort: 20 },
    { key: "hours", label: "Hours", type: "number", sort: 30 },
    { key: "rate", label: "Rate", type: "currency", unit: "$", sort: 40 },
    { key: "dropped", label: "Dropped off", type: "datetime", kind: "date", sort: 50 },
    { key: "status", label: "Status", type: "select", sort: 60, options: ["Waiting", "On the stand", "Done"] },
    { key: "tags", label: "Tags", type: "text", sort: 70 },
  ] }), "jobs");
const rows = [["Brake bleed & pads",0,2.5,85,"2026-10-02","Done","brake, urgent"],["Wheel true",1,1,60,"2026-10-05","On the stand","wheel"],["Full tune-up",2,4,85,"2026-10-09","Waiting","tune, fleet, urgent"],["Chain swap",0,0.5,60,"2026-10-12","Done","drivetrain"],["Hub rebuild",2,3.25,95,"2026-10-14","Waiting","hub"]];
const jids = [];
for (const [job, c, hours, rate, dropped, status, tags] of rows) jids.push(must(await client.recordWrite({ table_id: jobs, data: { job, customer: cids[c], hours, rate, dropped, status, tags } }), "j"));
const F = async (t, key, label, type, extra = {}) => { const r = await client.fieldDeclare({ table_id: t, spec: { key, label, type, ...extra } }); if (!r.ok) console.log("FIELD FAIL", key, JSON.stringify(r.error).slice(0, 200)); return r.ok; };
const fx = {
  f_concat: '{Job} & " / " & UPPER({Status})',
  f_text: 'LEFT({Job}, 4) & "|" & RIGHT({Job}, 3) & "|" & LEN({Job}) & "|" & LOWER({Job}) & "|" & TRIM("  x  ") & "|" & SUBSTITUTE({Job}, "Full", "Half")',
  f_text2: 'MID({Job}, 2, 3) & "|" & REPLACE({Job}, 1, 2, "ZZ") & "|" & REPT("ab", 3) & "|" & SEARCH("tune", {Job}) & "|" & FIND("e", {Job}) & "|" & ENCODE_URL_COMPONENT("a b&c")',
  f_logic: 'IF({Hours} > 2, "long", "short") & "|" & SWITCH({Status}, "Done", "D", "Waiting", "W", "other") & "|" & AND({Hours} > 0, {Rate} > 50) & "|" & OR({Hours} > 10, {Rate} > 90) & "|" & NOT({Hours} > 2) & "|" & XOR(TRUE(), FALSE()) & "|" & IF(BLANK(), "blank", "no")',
  f_iserr: 'IF(ISERROR(1/0), "err", "ok") & "|" & IF(ISERROR({Hours}), "err", "ok")',
  f_num: 'ABS(-3) & "|" & ROUND({Hours} * 1.37, 1) & "|" & MOD(17, 5) & "|" & MAX({Hours}, 3) & "|" & MIN({Hours}, 3) & "|" & SUM({Hours}, {Rate}) & "|" & AVERAGE({Hours}, {Rate})',
  f_num2: 'CEILING({Hours}) & "|" & FLOOR({Hours}) & "|" & INT({Hours}) & "|" & EVEN({Hours}) & "|" & ODD({Hours}) & "|" & POWER(2, 5) & "|" & SQRT(81) & "|" & EXP(0) & "|" & LOG(100, 10) & "|" & ROUNDDOWN({Hours}, 0) & "|" & ROUNDUP({Hours}, 0) & "|" & VALUE("12.5") & "|" & COUNT(1, 2, "x") & "|" & COUNTA(1, "", "x") & "|" & COUNTALL(1, "", "x")',
  f_date: 'DATETIME_FORMAT(DATEADD({Dropped off}, 10, "days"), "YYYY-MM-DD") & "|" & DAY({Dropped off}) & "|" & MONTH({Dropped off}) & "|" & YEAR({Dropped off}) & "|" & DATETIME_DIFF(DATE_ADD_PLACEHOLDER, {Dropped off}, "days")',
  f_date2: 'DATESTR({Dropped off}) & "|" & HOUR({Dropped off}) & "|" & MINUTE({Dropped off}) & "|" & SECOND({Dropped off}) & "|" & IS_AFTER({Dropped off}, "2026-10-01") & "|" & IS_BEFORE({Dropped off}, "2026-10-01") & "|" & IS_SAME({Dropped off}, "2026-10-02", "day") & "|" & DATETIME_FORMAT(WORKDAY({Dropped off}, 3), "YYYY-MM-DD") & "|" & DATETIME_FORMAT(DATETIME_PARSE("2026-03-04", "YYYY-MM-DD"), "YYYY-MM-DD") & "|" & DATETIME_FORMAT(SET_TIMEZONE({Dropped off}, "America/Chicago"), "YYYY-MM-DD HH:mm")',
  f_arr: 'ARRAYJOIN(ARRAYUNIQUE(ARRAYCOMPACT(SPLIT({Tags}, ", "))), "+") & "|" & ARRAYJOIN(ARRAYSLICE(SPLIT({Tags}, ", "), 1, 2), "+")',
  f_rec: 'RECORD_ID() & "|" & IF(CREATED_TIME(), "ct", "no") & "|" & IF(LAST_MODIFIED_TIME(), "lm", "no")',
  f_rx: 'REGEX_MATCH({Job}, "[Tt]une") & "|" & REGEX_REPLACE({Job}, "[aeiou]", "_") & "|" & REGEX_EXTRACT({Job}, "(\\\\w+) ")',
  f_ops: '({Hours} + 1) & "|" & ({Hours} - 1) & "|" & ({Hours} * 2) & "|" & ({Hours} / 2) & "|" & ({Hours} = 1) & "|" & ({Hours} != 1) & "|" & ({Hours} < 2) & "|" & ({Hours} > 2) & "|" & ({Hours} <= 1) & "|" & ({Hours} >= 1)',
  f_beyond: 'ARRAYJOIN(SORT(SPLIT({Tags}, ", ")), ",") & "|" & CONTAINS({Tags}, "urgent") & "|" & FIRST(SPLIT({Tags}, ", ")) & "|" & LAST(SPLIT({Tags}, ", ")) & "|" & ISBLANK({Tags}) & "|" & ARRAYJOIN(REVERSE(SPLIT({Tags}, ", ")), ",")',
};
const res = {};
for (const [k, v] of Object.entries(fx)) res[k] = await F(jobs, k, k, "formula", { declaration: { formula_text: v.replace("DATE_ADD_PLACEHOLDER", "TODAY()") } });
console.log(JSON.stringify({ customers, jobs, cids, jids, res }));
