/**
 * The disk-side mirror of `public.migration_slot(text)` — the slot rule that the
 * ledger trigger enforces. SQL definition:
 * aidream/db/migrations/20261021184500_migration_slot_understands_timestamps.sql.
 * Three filename families, checked in this order:
 *   1. `<14 digits><letter?>[_slug].sql`            -> ` @<ts><letter>`
 *   2. `<series>_<1-4 digits><letter?>[_<letter slug>].sql` -> `<series> #nnnn<letter>`
 *   3. `<1-4 digits><letter?>[_<letter slug>].sql`  -> ` #nnnn<letter>` (empty series)
 * Keep in lockstep with the SQL; `--self-test-slots` in check-migrations proves it.
 */
const TS_RE = /^([0-9]{14})([a-z]?)(?:_.*)?\.sql$/;
const FULL_RE = /^(.*?)_([0-9]{1,4})([a-z]?)(?:_[a-z].*)?\.sql$/;
const BARE_RE = /^([0-9]{1,4})([a-z]?)(?:_[a-z].*)?\.sql$/;

/** Canonical slot key for a filename, or null when it claims no slot. */
export function migrationSlot(filename: string): string | null {
  const ts = filename.match(TS_RE);
  if (ts) return ` @${ts[1]}${ts[2]}`;
  const full = filename.match(FULL_RE);
  if (full) return `${full[1]} #${full[2].padStart(4, "0")}${full[3]}`;
  const bare = filename.match(BARE_RE);
  if (bare) return ` #${bare[1].padStart(4, "0")}${bare[2]}`;
  return null;
}

export function isTimestampSlot(slot: string): boolean {
  return slot.startsWith(" @");
}

export function slotSeries(slot: string): string {
  return slot.split(" #")[0] ?? "";
}

export function slotNumber(slot: string): number {
  return parseInt((slot.split(" #")[1] ?? "").replace(/[a-z]$/, ""), 10);
}

/** Lowest number in `series` that no file on disk and no ledger row has claimed. */
export function nextFreeNumber(series: string, allSlots: Iterable<string>): number {
  let max = 0;
  for (const slot of allSlots) {
    if (isTimestampSlot(slot) || slotSeries(slot) !== series) continue;
    const n = slotNumber(slot);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

/** The next timestamp (one second steps) after `slot` that no known slot holds. */
export function nextFreeTimestamp(slot: string, allSlots: Iterable<string>): string {
  const held = new Set(allSlots);
  const raw = slot.slice(2, 16);
  const d = new Date(
    Date.UTC(+raw.slice(0, 4), +raw.slice(4, 6) - 1, +raw.slice(6, 8), +raw.slice(8, 10), +raw.slice(10, 12), +raw.slice(12, 14)),
  );
  for (let i = 0; i < 100000; i++) {
    d.setUTCSeconds(d.getUTCSeconds() + 1);
    const ts = d.toISOString().replace(/[-:T]/g, "").slice(0, 14);
    if (!held.has(` @${ts}`)) return ts;
  }
  return raw;
}

/** Groups of >=2 files sharing a slot; actionable when one is on disk and unledgered. */
export function classifySlotCollisions(
  files: Iterable<string>,
  isLedgered: (f: string) => boolean,
  isOnDisk: (f: string) => boolean,
): { slotMembers: Map<string, Set<string>>; actionable: Array<{ slot: string; files: string[] }>; historical: number } {
  const slotMembers = new Map<string, Set<string>>();
  for (const f of files) {
    const slot = migrationSlot(f);
    if (!slot) continue;
    let set = slotMembers.get(slot);
    if (!set) slotMembers.set(slot, (set = new Set()));
    set.add(f);
  }
  const actionable: Array<{ slot: string; files: string[] }> = [];
  let historical = 0;
  for (const [slot, set] of slotMembers) {
    if (set.size < 2) continue;
    const fs = [...set].sort();
    if (fs.some((f) => !isLedgered(f) && isOnDisk(f))) actionable.push({ slot, files: fs });
    else historical += 1;
  }
  return { slotMembers, actionable, historical };
}

/** Self-test: planted cases must be classified exactly as the SQL function does. */
export function runSlotSelfTest(): number {
  const fails: string[] = [];
  const eq = (name: string, got: unknown, want: unknown) => {
    if (got !== want) fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  };
  eq("timestamp", migrationSlot("20261021150000_agent_factory_tool_job_min_tier_fast.sql"), " @20261021150000");
  eq("timestamp+letter", migrationSlot("20261011223000a_whatsapp_external_inbox.sql"), " @20261011223000a");
  eq("timestamp slug digits", migrationSlot("20261016090600_config_truth_models_defaults_2.sql"), " @20261016090600");
  eq("series", migrationSlot("hr_l3_20_registry_preconditions.sql"), "hr_l3 #0020");
  eq("series leftmost digits", migrationSlot("hr_l3_107_check_35_cross_schema.sql"), "hr_l3 #0107");
  eq("bare", migrationSlot("0807_thing.sql"), " #0807");
  eq("bare+letter", migrationSlot("0807a_thing.sql"), " #0807a");
  eq("no slot", migrationSlot("some_plain_name.sql"), null);

  // Timestamp collision between two UNAPPLIED files on disk is actionable.
  const tsPair = ["20261021150000_a.sql", "20261021150000_b.sql"];
  const ts = classifySlotCollisions(tsPair, () => false, () => true);
  eq("timestamp collision actionable", ts.actionable.length, 1);
  // Bare-number collision, one ledgered, one new on disk: actionable.
  const barePair = ["0807_a.sql", "0807_b.sql"];
  const bare = classifySlotCollisions(barePair, (f) => f === "0807_a.sql", () => true);
  eq("bare collision actionable", bare.actionable.length, 1);
  // Grandfathered pair, both ledgered: history, never actionable.
  const old = classifySlotCollisions(tsPair, () => true, () => true);
  eq("ledgered pair not actionable", old.actionable.length, 0);
  eq("ledgered pair counted historical", old.historical, 1);
  // Distinct timestamps do not collide.
  eq("distinct timestamps", classifySlotCollisions(["20261021150000_a.sql", "20261021150001_b.sql"], () => false, () => true).actionable.length, 0);
  eq("next free timestamp", nextFreeTimestamp(" @20261021150000", [" @20261021150000", " @20261021150001"]), "20261021150002");

  if (fails.length) {
    console.error(`migration-slot self-test FAILED:\n  ${fails.join("\n  ")}`);
    return 1;
  }
  console.log("migration-slot self-test passed (SQL parity, timestamp + bare collisions, grandfathered pair).");
  return 0;
}
