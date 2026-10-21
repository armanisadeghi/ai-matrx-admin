/**
 * A migration never leaves a function that RAISES 40001/40P01 on purpose.
 *
 * PostgREST retries a transaction failing with 40001 (serialization_failure) or 40P01
 * (deadlock_detected) without limit, so a deliberate refusal with either code loops inside
 * PostgREST; on 2026-10-21 that froze Postgres (22 requests -> 49,619 calls). A deliberate
 * refusal raises PT409 (HTTP 409, answered once). Live, aidream's event trigger
 * platform._no_retried_refusal_code refuses such a function; this is the file-side half.
 * The twin is aidream/tests/test_no_deliberate_retried_refusal_code.py.
 *
 * Replay order: files without a 14-digit timestamp prefix count as older than every
 * timestamped file; timestamped files count in name order. Because unnamed files have no
 * order among themselves, ANY unnamed file that raises 40001/40P01 on purpose fails unless it
 * is on the frozen historical list below (applied history, superseded by
 * migrations/20261022163000_deliberate_refusals_raise_pt409_not_40001.sql). Catching the codes
 * (`when sqlstate '40001'`) is fine and is not matched.
 */
import { readdirSync, readFileSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");

// The event trigger's pattern (platform._no_retried_refusal_code).
const DELIBERATE =
  /errcode\s*=\s*'(40001|40P01)'|raise\s+(exception\s+)?(serialization_failure|deadlock_detected)\b/i;
const DEFINITION = /create\s+(?:or\s+replace\s+)?(?:function|procedure)\s+([\w."]+)\s*\(/gi;
const TIMESTAMPED = /^\d{14}_/;

/** Applied history: unnamed files that raised 40001 on purpose. Never add to this list. */
export const FROZEN_HISTORICAL: readonly string[] = [
  "access_ladder_t32e_revocation_rule.sql",
  "app_config_hardening_revokes_lock_optimistic.sql",
  "assist_producer_control_plane.sql",
  "atslow2_a_table_move_one_access_refresh.sql",
  "campaign/bigvalueswrite_a_text_of_any_size_simply_saves.sql",
  "campaign/errorshonest_s2_the_public_doors_say_not_found.sql",
  "campaign/errorshonest_s5_every_other_schema_says_not_found.sql",
  "campaign/errorshonest_s9_the_vault_history_writer_says_not_found.sql",
  "campaign/handover_a_refusal_never_prints_an_id_or_a_clock.sql",
  "campaign/moveout_a_move_finds_the_destination_s_home.sql",
  "campaign/sc1p_a_table_says_where_it_lives_and_its_owner_can_move_it.sql",
  "campaign/sc1t_a_column_crosses_the_wall_where_it_is_open.sql",
  "campaign/sc1t_a_table_moves_with_the_tables_inside_it.sql",
  "campaign/suitehealth2_every_door_decides_in_its_own_body.sql",
  "campaign/w2_epoch_one_version_per_organization_and_an_epoch_on_every_container.sql",
  "catalog_entries_remote_catalogs.sql",
  "communications_p2_sms_exact_action_authorization.sql",
  "communications_p6_voice_recording_lifecycle.sql",
  "communications_voice_transfer_target.sql",
  "dd199_role_helpers_refuse_non_members.sql",
  "delete_is_archive_catalog_cert_curator.sql",
  "iam_emergency_door_dd137a5_claim_current_target.sql",
  "initplan_uid_sweep_batch3.sql",
  "rcb11_comment_collaboration_doors.sql",
  "rcstore_g_document_behavior.sql",
  "web_move_site_to_organization.sql",
];

type Def = { name: string; file: string; raises: boolean };

function qualified(name: string): string {
  const n = name.replace(/"/g, "").toLowerCase();
  return n.includes(".") ? n : `public.${n}`;
}

function definitions(file: string, text: string): Def[] {
  const ms = [...text.matchAll(DEFINITION)];
  return ms.map((m, i) => {
    const body = text.slice(m.index!, i + 1 < ms.length ? ms[i + 1]!.index! : text.length);
    return { name: qualified(m[1]!), file, raises: DELIBERATE.test(body) };
  });
}

function sqlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const sub of ["", "campaign"]) {
    let names: string[] = [];
    try {
      names = readdirSync(join(dir, sub));
    } catch {
      continue;
    }
    for (const n of names) if (n.endsWith(".sql")) out.push(sub ? `${sub}/${n}` : n);
  }
  return out;
}

export function findings(dir: string, frozen: readonly string[]) {
  const files = sqlFiles(dir);
  const base = (f: string) => f.split("/").pop()!;
  const unnamed = files.filter((f) => !TIMESTAMPED.test(base(f)));
  const timestamped = files
    .filter((f) => TIMESTAMPED.test(base(f)))
    .sort((a, b) => (base(a) < base(b) ? -1 : base(a) > base(b) ? 1 : 0));
  const unnamedRaising = new Set<string>();
  const last = new Map<string, Def>();
  for (const f of [...unnamed, ...timestamped]) {
    for (const d of definitions(f, readFileSync(join(dir, f), "utf8"))) {
      if (d.raises && !TIMESTAMPED.test(base(f))) unnamedRaising.add(f);
      last.set(d.name, d);
    }
  }
  return {
    unnamedNotFrozen: [...unnamedRaising].filter((f) => !frozen.includes(f)).sort(),
    staleFrozen: frozen.filter((f) => !unnamedRaising.has(f)),
    timestampedLastRaises: [...last.values()]
      .filter((d) => d.raises && TIMESTAMPED.test(base(d.file)))
      .map((d) => `${d.name} (${d.file})`)
      .sort(),
  };
}

describe("no migration leaves a deliberate 40001/40P01 refusal", () => {
  const f = findings(join(ROOT, "migrations"), FROZEN_HISTORICAL);

  it("no unnamed file raises 40001/40P01 on purpose (outside the frozen history)", () => {
    expect(f.unnamedNotFrozen).toEqual([]);
  });

  it("no function's last timestamped definition raises 40001/40P01 on purpose", () => {
    expect(f.timestampedLastRaises).toEqual([]);
  });

  it("every frozen entry still raises (the exception dies with what it excuses)", () => {
    expect(f.staleFrozen).toEqual([]);
  });

  it("the pattern catches raises, spares handlers, and honours replay order", () => {
    const dir = mkdtempSync(join(tmpdir(), "retried-code-"));
    mkdirSync(join(dir, "campaign"));
    const fn = (name: string, body: string) =>
      `create or replace function ${name}() returns void language plpgsql as $$ begin ${body} end $$;\n`;
    writeFileSync(join(dir, "old_unnamed.sql"), fn("s.a", "raise exception 'x' using errcode = '40001';"));
    writeFileSync(join(dir, "campaign", "handler.sql"), fn("s.h", "null; exception when sqlstate '40001' then raise;"));
    writeFileSync(join(dir, "20260101000000_bad.sql"), fn("s.b", "raise serialization_failure;"));
    writeFileSync(join(dir, "20260101000001_x.sql"), fn("s.c", "raise exception 'x' using errcode='40P01';"));
    writeFileSync(join(dir, "20260101000002_fix.sql"), fn("s.c", "raise exception 'x' using errcode = 'PT409';"));
    const r = findings(dir, ["gone.sql"]);
    expect(r.unnamedNotFrozen).toEqual(["old_unnamed.sql"]);
    expect(r.timestampedLastRaises).toEqual(["s.b (20260101000000_bad.sql)"]);
    expect(r.staleFrozen).toEqual(["gone.sql"]);
  });
});
