#!/usr/bin/env npx tsx
/**
 * check:table-field-types — KNOWN FIELD TYPES DECIDE THE FILTER (Arman, 2026-10-17).
 *
 *   "the key is to not guess but to have some 'known' field types … for data that comes from our
 *    database, it's our database and we know all of the information and we can be much more
 *    opinionated … put some rules in place that then we get an army of agents to go and fix so
 *    that we don't have to guess."
 *
 * The rule (canonical-table-usage rule 10): a table column over a database field declares its
 * field type in `format` (or the matching `filter`), so its filter is a date range for a moment
 * and a value list for an enum — never a text box. This script reads every column definition
 * (an object literal with `header` and `accessorKey`/`id`) in files that use the canonical table
 * and checks it against what the DATABASE says that field is:
 *
 *   scripts/table-field-types/db-column-types.generated.json — column name → field type, taken
 *   from information_schema across every app schema, kept only when the name means the same type
 *   in ≥95% of the tables that have it (created_at → datetime in 1,085 tables).
 *   Regenerate (Supabase MCP, project brsgrqvjdzwihsvnfqkf): the SQL in REGENERATE below, then
 *   the reduction in `buildMap` (run with --rebuild <raw.json>).
 *
 * Plus the names our schema uses for enums stored as text (status, kind, type, role, tier, stage…).
 *
 * FINDINGS
 *   date-untyped   a moment column with neither `format: { id: "date"|"datetime"… }` nor `filter: "date"`
 *   date-as-text   a moment column declared `filter: "text"`
 *   enum-untyped   an enum column with neither `format: { id: "choice"… }` nor `filter: "select"`
 *   filter-off     a moment/enum column with `filter: false` and no `// table-filter-off: <reason>`
 *
 * Advisory by default (exit 0): it is the army's work list. `--strict` exits 1 on any finding.
 *   pnpm check:table-field-types                 # summary + every finding
 *   pnpm check:table-field-types --json          # machine-readable
 *   pnpm check:table-field-types --files a.tsx b.tsx
 *   pnpm check:table-field-types --self-test     # RED per finding kind, GREEN on a clean column
 *
 * REGENERATE (SQL):
 *   select c.column_name, <field_type case over data_type / enum udt>, count(*)
 *   from information_schema.columns c join information_schema.tables t using (table_schema, table_name)
 *   where t.table_type = 'BASE TABLE' and c.table_schema not in (system schemas) group by 1, 2;
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(__dirname, "..");
const MAP_PATH = path.join(ROOT, "scripts/table-field-types/db-column-types.generated.json");

type FieldType = "datetime" | "date" | "boolean" | "integer" | "number" | "choice";
const MOMENT_FORMATS = new Set(["date", "datetime", "created_time", "modified_time", "relative_time"]);
const CHOICE_FORMATS = new Set(["choice", "multi_choice", "tags", "person"]);
/** Enums our schema stores as text: the name says what it is. */
const ENUM_NAME = /(^|_)(status|state|kind|type|role|category|tier|level|priority|stage|source|mode|channel|plan|scope|visibility|lane|seat|provider|format)$/;
const NOT_ENUM = new Set(["content_type", "mime_type", "file_type", "data_type"]);

export interface Finding {
  file: string;
  line: number;
  column: string;
  expected: "moment" | "enum";
  kind: "date-untyped" | "date-as-text" | "enum-untyped" | "filter-off";
  detail: string;
}

function loadMap(): Record<string, { type: FieldType }> {
  if (!existsSync(MAP_PATH)) return {};
  return (JSON.parse(readFileSync(MAP_PATH, "utf8")) as { columns: Record<string, { type: FieldType }> }).columns;
}

function propOf(obj: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined {
  return obj.properties.find(
    (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === name,
  );
}
function stringValue(expr: ts.Expression | undefined): string | null {
  if (!expr) return null;
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  if (ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr)) return stringValue(expr.expression);
  return null;
}
function formatId(obj: ts.ObjectLiteralExpression): string | null | "dynamic" {
  const fmt = propOf(obj, "format");
  if (!fmt) return null;
  if (!ts.isObjectLiteralExpression(fmt.initializer)) return "dynamic";
  return stringValue(propOf(fmt.initializer, "id")?.initializer) ?? "dynamic";
}
function filterValue(obj: ts.ObjectLiteralExpression): string | false | null | "dynamic" {
  const f = propOf(obj, "filter");
  if (!f) {
    // a spread may carry it (…{ filter: "date" }) — treat as declared, don't guess
    return obj.properties.some((p) => ts.isSpreadAssignment(p)) ? "dynamic" : null;
  }
  if (f.initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
  return stringValue(f.initializer) ?? "dynamic";
}

export function scanSource(file: string, text: string, map: Record<string, { type: FieldType }>): Finding[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lines = text.split("\n");
  const out: Finding[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isObjectLiteralExpression(node) && propOf(node, "header")) {
      const key = stringValue(propOf(node, "accessorKey")?.initializer) ?? stringValue(propOf(node, "id")?.initializer);
      if (key && !propOf(node, "customActions")) {
        const name = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
        const dbType = map[name]?.type;
        const expected: Finding["expected"] | null =
          dbType === "datetime" || dbType === "date"
            ? "moment"
            : dbType === "choice" ||
                (!dbType && ENUM_NAME.test(name) && !NOT_ENUM.has(name) && !/^(is|has|can|should|max|min|total|num|count)_/.test(name))
              ? "enum"
              : null;
        const declaredFilter = filterValue(node);
        const declaredFormat = formatId(node);
        // A column that DECLARES a number/boolean type is not an enum, whatever its name says.
        const declaredScalar =
          declaredFilter === "number" || declaredFilter === "boolean" ||
          (typeof declaredFormat === "string" && /^(number|decimal|currency|percent|integer|rating|duration|progress|file_size|boolean)$/.test(declaredFormat));
        if (expected && !(expected === "enum" && declaredScalar)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          const fmt = declaredFormat;
          const filter = declaredFilter;
          const nearby = lines.slice(Math.max(0, line - 2), line + 12).join("\n");
          // A reviewed exception says why, on the column: `// table-filter-off: <reason>` (the field is
          // filtered another way, or is not what its name suggests). Never rename a column to pass.
          const excused = /table-filter-off:\s*\S/.test(nearby);
          const push = (kind: Finding["kind"], detail: string) => {
            if (!excused) out.push({ file, line, column: key, expected, kind, detail });
          };
          if (filter === false) {
            push("filter-off", `filter: false on a ${expected} column — restore it, or say why: // table-filter-off: <reason>`);
          } else if (fmt !== "dynamic" && filter !== "dynamic") {
            if (expected === "moment") {
              const typed = (fmt && MOMENT_FORMATS.has(fmt)) || filter === "date";
              if (!typed && filter === "text") push("date-as-text", `filter: "text" on a ${dbType ?? "moment"} field — declare format: { id: "${dbType === "date" ? "date" : "datetime"}" }`);
              else if (!typed) push("date-untyped", `${dbType ?? "moment"} field with no date type — add format: { id: "${dbType === "date" ? "date" : "datetime"}" } (or filter: "date")`);
            } else {
              const typed = (fmt && CHOICE_FORMATS.has(fmt)) || filter === "select";
              if (!typed) push("enum-untyped", `enum field with no value list — add filter: "select" (with filterOptions when the table is server-driven) or format: { id: "choice" }`);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function tableFiles(): string[] {
  const listed = execFileSync("git", ["ls-files", "app", "features", "components", "lib"], { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  return listed
    .split("\n")
    .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !/\.test\.|__tests__/.test(f) && existsSync(path.join(ROOT, f)))
    .filter((f) => /MatrxDataTable|MatrxColumnDef|EntityListPage/.test(readFileSync(path.join(ROOT, f), "utf8")));
}

function selfTest(): void {
  const map = { created_at: { type: "datetime" as const }, plan_kind: { type: "choice" as const } };
  const cases: Array<[string, Finding["kind"] | null]> = [
    [`const c = [{ accessorKey: "created_at", header: "Created" }];`, "date-untyped"],
    [`const c = [{ accessorKey: "created_at", header: "Created", filter: "text" }];`, "date-as-text"],
    [`const c = [{ accessorKey: "status", header: "Status" }];`, "enum-untyped"],
    [`const c = [{ accessorKey: "created_at", header: "Created", filter: false }];`, "filter-off"],
    [`const c = [{ accessorKey: "created_at", header: "Created", format: { id: "datetime" } }];`, null],
    [`const c = [{ accessorKey: "status", header: "Status", filter: "select" }];`, null],
    [`// table-filter-off: a fixed one-day report\nconst c = [{ accessorKey: "created_at", header: "Created", filter: false }];`, null],
    [`const c = [{ accessorKey: "name", header: "Name" }];`, null],
    [`const c = [{ accessorKey: "priority", header: "Priority", filter: "number" }];`, null],
    [`const c = [{\n  // table-filter-off: holds free text, not a state\n  accessorKey: "state", header: "State" }];`, null],
  ];
  let failed = 0;
  for (const [src, want] of cases) {
    const got = scanSource("fixture.tsx", src, map)[0]?.kind ?? null;
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? "GREEN" : "RED  "} expected ${want ?? "clean"}, got ${got ?? "clean"} :: ${src.split("\n").pop()}`);
  }
  if (failed) {
    console.error(`self-test FAILED (${failed})`);
    process.exit(1);
  }
  console.log("self-test passed: every finding kind fires, clean columns stay clean");
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) return selfTest();
  const map = loadMap();
  const filesArg = args.indexOf("--files");
  const files = filesArg >= 0 ? args.slice(filesArg + 1).filter((a) => !a.startsWith("--")) : tableFiles();
  const findings = files.flatMap((f) => scanSource(f, readFileSync(path.join(ROOT, f), "utf8"), map));
  if (args.includes("--json")) {
    console.log(JSON.stringify(findings, null, 2));
  } else {
    const byKind = new Map<string, number>();
    for (const f of findings) byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
    const byFile = new Map<string, Finding[]>();
    for (const f of findings) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
    for (const [file, list] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n${file} (${list.length})`);
      for (const f of list) console.log(`  ${f.line}  ${f.column}  ${f.kind}  ${f.detail}`);
    }
    console.log(`\ncheck:table-field-types — ${findings.length} finding(s) in ${byFile.size} file(s) of ${files.length}: ${[...byKind].map(([k, n]) => `${k} ${n}`).join(", ") || "none"}`);
  }
  if (args.includes("--strict") && findings.length > 0) process.exit(1);
}

main();
