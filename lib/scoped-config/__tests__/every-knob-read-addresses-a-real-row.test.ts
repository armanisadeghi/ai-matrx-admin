/**
 * EVERY CLIENT KNOB READ ADDRESSES A ROW THAT EXISTS.
 *
 * THE DEFECT THIS PINS (VERIFY-U-P2-R4, V13-2). `platform.knob_resolve` takes a
 * PAIR — `(p_feature, p_key)` — and `platform.feature_knob`'s primary key is
 * that pair. The client addressed a knob with ONE dotted string and split it at
 * the LAST dot, which is a guess: the live register holds 635 rows whose
 * `feature` itself contains a dot and 58 rows whose `key` contains one (read
 * live 2026-09-17), so no rule recovers the pair from the string. The connector
 * prompt card read `connectors.prompt.resurface_days`, the split sent
 * `('connectors.prompt', 'resurface_days')`, and the live row is
 * `('connectors', 'prompt.resurface_days')`:
 *
 *   knob_resolve('connectors.prompt','resurface_days') → P0001 … is not seeded
 *   knob_resolve('connectors','prompt.resurface_days') → 0
 *
 * So every mount fired an RPC that RAISED, `useEffectiveKnob` swallowed it in an
 * empty catch, and the value stayed `undefined` for ever — the knob PLAN §7 rules
 * could never resolve, and nothing said so (law 4, law 6).
 *
 * THE CLASS FIX THIS CENSUSES: the address is the pair. A reader may pass
 * `{ feature, key }` — the only form that cannot be wrong — and the dotted
 * string stays as a convenience whose last-dot convention is now MEASURED here
 * rather than assumed. Every full-key-family read in the repo is resolved to its
 * address and matched against the knob rows DECLARED by the two repos'
 * migrations; a read whose address matches no declared row fails BY NAME.
 *
 * This is the static half. The live half is `pnpm check:settings-unregistered`,
 * which grades the same addresses against the live table and is credential
 * gated; it could not see this call at all until 2026-09-17, because its
 * matcher required the closing paren right after the key and this call site
 * carries a trailing comma (fixed in `scripts/settings-guards/lib.ts`).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { knobAddress } from "../effectiveKnobs";
import { execFileSync } from "node:child_process";
import { RUN_OUTPUT_KINDS, RUN_WAIT_KNOB_FEATURE, runWaitKnobKey } from "@/lib/api/run-wait";
import {
  REMOTE_IMAGE_DEFAULTS,
  REMOTE_IMAGE_KNOB_FEATURE,
} from "@ai-matrx/rich-content/levels/prose/remote-image-policy";

const ROOT = join(__dirname, "..", "..", "..");
const AIDREAM = process.env.AIDREAM_DIR ?? join(ROOT, "..", "aidream");

/** Where a knob row is DECLARED — the seeds, in both repos. */
const MIGRATION_DIRS = [
  join(ROOT, "migrations"),
  join(AIDREAM, "db", "migrations"),
];

/**
 * Every `(feature, key)` a `platform.feature_knob` seed writes. The seeds are
 * written both as value tuples and as `insert … select 'feature', 'key', …`, so
 * the reader takes any adjacent quoted pair inside a file that touches the
 * table. Over-reading here can only make the census more permissive, and a
 * fabricated pair matching a real read's address by accident is not a shape any
 * of these files produces.
 */
/** Every `.sql` under `dir`, at any depth. */
function sqlFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sqlFiles(full, out);
      continue;
    }
    if (entry.endsWith(".sql")) out.push(full);
  }
  return out;
}

function declaredPairs(): { pairs: Set<string>; files: number } {
  const pairs = new Set<string>();
  let files = 0;
  const re =
    /'([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*)'\s*,\s*'([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*)'\s*,/gi;
  for (const dir of MIGRATION_DIRS) {
    // 🚨 RECURSIVE. This used to be a flat `readdirSync`, and BOTH repos keep
    // seeds in subdirectories — `migrations/campaign/`, `migrations/inverse/`,
    // aidream's `db/migrations/campaign/`. So every campaign knob looked
    // undeclared: `custom.code_paths_enabled` IS seeded (the register migration
    // and its inverse both name it) and the census could not see the row, so a
    // call site addressing it would have been reported as a miss. It only never
    // fired because the one client read of it was ALSO invisible — an inline
    // `{ feature: X.FEATURE, key: X.KEY }` the address reader cannot follow.
    // Two blind spots canceling out is not a green guard.
    for (const file of sqlFiles(dir)) {
      // 🚨 RACE-SAFE READ. `migrations/inverse/` is also where
      // `scripts/__tests__/chair-step-confirmation.test.ts` writes and removes a
      // throwaway probe file (`zz_chair_step_probe_<pid>.sql`) while its own suite
      // runs — a real chair step lives there too, so that is the correct place for
      // the probe, not a thing this census gets to move. Under the full battery's
      // parallel workers, `sqlFiles` can list that probe and then lose the race to
      // its `finally { rmSync(...) }` before this read runs (ENOENT). A file that
      // vanished between listing and reading was never a durable declaration, so
      // skipping it can only make this census MORE permissive, never less — it
      // still fails BY NAME on every seed file that is actually present.
      let text: string;
      try {
        text = readFileSync(file, "utf8");
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw err;
      }
      if (!/platform\.feature_knob/i.test(text)) continue;
      files += 1;
      re.lastIndex = 0;
      for (let m = re.exec(text); m; m = re.exec(text)) {
        pairs.add(`${m[1]} ${m[2]}`);
      }
    }
  }
  // The LIVE register. Rows are created live through the Supabase MCP, never as migration
  // files, so the `.sql` scan above cannot see them; `npx tsx scripts/refresh-knob-snapshot.ts` commits
  // the live keys. A read matching neither source still fails by name.
  const snapshot = JSON.parse(
    readFileSync(join(__dirname, "..", "knob-keys.snapshot.json"), "utf8"),
  ) as { knobs: [string, string][] };
  for (const [feature, key] of snapshot.knobs) pairs.add(`${feature} ${key}`);
  return { pairs, files };
}

/**
 * THE ONE EXTRACTOR. The census reads the source with `scanKnobReads` — the same function the
 * config attestation manifest and `check:settings-unregistered` use — so it can neither disagree
 * with them about what a read is nor mistake a function DEFINITION for one (this test used to carry
 * its own regex, which flagged `export function useSessionKnob(` in FrameSessionKnob.ts).
 */
interface ReadSite {
  file: string;
  line: number;
  fn: string;
  feature: string;
  key: string;
}

const stripRepo = (rel: string) => rel.replace(/^matrx-frontend\//, "");

interface Unresolved {
  file: string;
  line: number;
  fn: string;
  raw: string;
  why: string;
}

/** `scanKnobReads` runs in a tsx child (scripts/settings-guards/dump-knob-reads.ts): the module is ESM. */
function scan(files?: { abs: string; rel: string; text: string }[]): {
  sites: ReadSite[];
  dynamic: Unresolved[];
} {
  const out = execFileSync(
    join(ROOT, "node_modules", ".bin", "tsx"),
    ["scripts/settings-guards/dump-knob-reads.ts", ...(files ? ["--stdin"] : [])],
    { cwd: ROOT, input: files ? JSON.stringify(files) : undefined, maxBuffer: 1 << 28 },
  );
  const { sites, dynamic } = JSON.parse(out.toString("utf8")) as {
    sites: ReadSite[];
    dynamic: Unresolved[];
  };
  return {
    sites: sites.map((s) => ({ ...s, file: stripRepo(s.file) })),
    dynamic: dynamic.map((d) => ({ ...d, file: stripRepo(d.file) })),
  };
}

let whole: ReturnType<typeof scan> | undefined;
/** The whole tree, scanned once per run. */
function scanWhole(): ReturnType<typeof scan> {
  whole ??= scan();
  return whole;
}

function readSites(): ReadSite[] {
  return scanWhole().sites;
}

/**
 * A read whose ref is assembled at run time. Each one is named WITH the reason
 * it is unresolvable here and where its addresses are declared, so the list
 * cannot quietly absorb a new unaddressable read.
 */
const COMPUTED_REFS: Record<string, string> = {
  "features/agents/factory/door.ts":
    "one `knobRef(door)` helper over the three declared `door_<door>` rows (`agent_factory`, " +
    "`door_from_chat` / `door_mandate_holder_draft` / `door_generate`), all in the knob snapshot",
  "components/selection-toolbar/SelectionToolbarRoot.tsx":
    "reads its own declared HIGHLIGHT_WHILE_EDITING_KNOB constant from selection-actions.ts, the pair " +
    "`selection_toolbar` / `highlight_while_editing`, which is a row in the knob snapshot",
  "app/(dev)/demos/composer/ComposerPlayground.tsx":
    "dev demo: reads `COMPOSER_KNOBS.compactInputMaxHeightPct`, a member access on the composer's " +
    "own declared COMPOSER_KNOBS table; the same knob the composer itself reads",
  "components/official/drill-explorer/drillKnob.ts":
    "reads `drillKnobAddress(name)`, the door's own last-segment split; names are passed by the explorer's callers",
  "features/audio/limits.ts":
    "reads one address per limit out of its own declared AUDIO_LIMITS table; every entry is a pair in that file",
  "features/masterwork/capture-plan/useCapturePlanSettings.ts":
    "one local `read(key)` helper over its own declared KNOB_* constants",
  "features/window-panels/detail/DetailHost.tsx":
    "forwards its own KNOB constants through a local helper",
  "lib/knobs/toolKnobGating.ts":
    "reads each pair straight out of its own declared TOOL_ORG_KNOBS table via " +
    "refs.map((ref) => ensureEffectiveKnob(...)) — a member access on a local " +
    "declaration, the same shape as the other three entries above",
  "lib/knobs/collabOtRooms.ts":
    "reads each product's pair out of its own declared OWN table (`collab` / `ot_rooms_docs`, `collab` / `ot_rooms_sheets`) " +
    "and the shared `collab` / `ot_rooms`; all three are rows in the knob snapshot and the wf_116 seed",
  "lib/api/run-wait.ts":
    "one read per output kind at `agents.run_wait` / runWaitKnobKey(kind); every kind in " +
    "RUN_OUTPUT_KINDS is proven seeded by the 'run-wait' case below",
  "features/ai-models/preferredModelChoice.ts":
    "reads the default-model knob each of its three callers passes as its own declared " +
    "*_MODEL_KNOB constant, and that knob's class companion from the declared map in " +
    "lib/scoped-config/modelClassCompanion.ts (rows created live 2026-10-01 via the MCP)",
  "features/admin/users/support-sessions/StartSupportSessionDialog.tsx":
    "reads `SUPPORT_SESSION_KNOBS.lengthChoices` / `.defaultMinutes`, literal pairs declared in " +
    "support-sessions/service.ts (`support_sessions` / `length_choices`, `default_minutes`; live rows)",
  "features/admin/users/support-sessions/SupportSessionPill.tsx":
    "reads `SUPPORT_SESSION_KNOBS.extendMinutes`, the literal pair `support_sessions` / `extend_minutes` " +
    "declared in support-sessions/service.ts (live row)",
  "features/agents/agent-creators/services/agentBuilderService.ts":
    "hands `ensureEffectiveKnob` to `@ai-matrx/agents/models` resolveNewAgentModelId, which asks exactly " +
    "NEW_AGENT_DEFAULT_MODEL_KNOB (`agents.model_prefs` / `new_agent_default_model`; live row, migration 1512)",
  "../aidream/apps/shared/chat/src/agents/identity/new-agent-model.ts":
    "the chat package's twin of the agentBuilderService read: resolveNewAgentModelId asks exactly " +
    "NEW_AGENT_DEFAULT_MODEL_KNOB (`agents.model_prefs` / `new_agent_default_model`; live row, migration 1512)",
  "../aidream/apps/shared/chat/src/agents/routing/model-access.ts":
    "reads the pair straight out of its own declared CONFIDENTIAL_KNOBS table — " +
    "`chat.confidential` / `require_own_hardware`, a live row (boolean, default false, " +
    "organization-overridable), the same shape as the other table-backed entries here",
  "features/kg-suggestions/hooks/useAutoRagPreference.ts":
    "reads its own declared AUTO_RAG_KNOB constant from features/kg-suggestions/autoRagKnobs.ts, " +
    "the pair `knowledge` / `auto_rag_enabled`, which is a row in the knob snapshot",
  "features/organizations/hooks/useOrgAutoRagPreference.ts":
    "reads the same file's AUTO_RAG_KNOB and SUGGESTION_SWEEPS_KNOB constants — the pairs " +
    "`knowledge` / `auto_rag_enabled` and `knowledge` / `suggestion_sweeps_enabled`, both rows in " +
    "the knob snapshot. ONE home for both addresses on purpose: a hand-typed second copy of a " +
    "register key is how a rename becomes a control that governs nothing",
  "components/rich-content/prose/remote-image-policy.tsx":
    "one read per authorship at `rich_content.remote_images` / `autoload_${authorship}`; every " +
    "authorship in REMOTE_IMAGE_DEFAULTS is proven seeded by the 'remote images' case below",
};

/**
 * Computed reads the shared extractor (`scanKnobReads`, strict) sees that the old per-test regex
 * could not. They are counted and ratcheted by `pnpm check:knob-reads-declared`
 * (scripts/config-attestation/unresolved-ceiling.json, shrink-only) and by the chat package's own
 * declaration; this list only stops a NEW file joining them unexplained. Shrink it, never grow it:
 * explain a new computed read in COMPUTED_REFS above, or make it a literal pair.
 */
const COUNTED_BY_THE_ATTESTATION_CEILING = new Set([
  "features/masterwork/review/NextSessionAgenda.tsx",
  "features/masterwork/review/vocabulary.ts",
  "features/notes/hooks/useNotePicker.ts",
  "features/rich-content-host/app-bindings.tsx",
  "features/rich-document/annotations/AnnotationSidecar.tsx",
  "features/rich-document/annotations/comment-remarks.tsx",
  "features/spaces/state/knobs.ts",
  "features/window-panels/detail/listContextCap.ts",
  "../aidream/apps/shared/chat/src/agents/components/inputs/smart-input/composer/ComposerSplash.tsx",
  "../aidream/apps/shared/chat/src/agents/components/inputs/smart-input/composer/useCompactInputMaxHeight.ts",
  "../aidream/apps/shared/chat/src/agents/components/inputs/smart-input/composer/useComposerMode.ts",
  "../aidream/apps/shared/chat/src/agents/identity/preferred-chat-model.ts",
  "../aidream/apps/shared/chat/src/canvas/workspace/ShellChatDock.tsx",
  "lib/entity-list/components/EntityListPage.tsx",
  "lib/list-scope/index.ts",
  "lib/reversible/announceReversible.tsx",
  "lib/sandbox/sandbox-defaults.ts",
]);

describe("the knob address", () => {
  it("is the pair the resolver sends, whichever form a caller passes", () => {
    expect(knobAddress({ feature: "connectors", key: "prompt.resurface_days" })).toEqual({
      feature: "connectors",
      key: "prompt.resurface_days",
    });
    // The dotted convenience form: last dot, and nothing else.
    expect(knobAddress("media.listening.voice")).toEqual({
      feature: "media.listening",
      key: "voice",
    });
  });

  it("refuses a string that carries no feature segment", () => {
    expect(() => knobAddress("resurface_days")).toThrow(/feature/i);
  });
});

describe("the census of client knob reads", () => {
  const { pairs, files } = declaredPairs();
  const sites = readSites();

  it("read the seeds and the call sites it claims to", () => {
    expect(files).toBeGreaterThan(50);
    expect(pairs.size).toBeGreaterThan(400);
    expect(sites.length).toBeGreaterThan(10);
  });

  it("addresses a declared row at every resolvable call site", () => {
    const misses = sites
      .filter((site) => !pairs.has(`${site.feature} ${site.key}`))
      .map(
        (site) =>
          `${site.file}:${site.line} ${site.fn} resolves to ` +
          `feature='${site.feature}', key='${site.key}' — no seed declares that pair. ` +
          "Pass the register's own { feature, key } pair.",
      );
    expect(misses).toEqual([]);
  });

  it("fails by name on a planted read whose row does not exist (the guard can go red)", () => {
    const planted = scan([
      {
        abs: "x",
        rel: "matrx-frontend/features/zz/planted.tsx",
        text: 'const v = useSessionKnob({ feature: "zz.planted_feature", key: "no_such_row" });',
      },
    ]).sites.filter((site) => !pairs.has(`${site.feature} ${site.key}`));
    expect(planted.map((site) => `${site.feature}/${site.key}`)).toEqual([
      "zz.planted_feature/no_such_row",
    ]);
  });

  it("does not mistake a function definition for a read", () => {
    const { sites: found, dynamic: unresolved } = scan([
      {
        abs: "x",
        rel: "matrx-frontend/features/zz/Defines.ts",
        text: "export function useSessionKnob(_fullKey: KnobRef): unknown { return undefined; }",
      },
    ]);
    expect(found).toEqual([]);
    expect(unresolved).toEqual([]);
  });

  it("run-wait: every output kind a run can wait on addresses a seeded row", () => {
    // The computed address above is only excused because this proves it: a
    // new kind added to RUN_OUTPUT_KINDS without its `<kind>_seconds` seed
    // (migrations/agents_run_wait_knobs.sql) fails here by name.
    const unseeded = RUN_OUTPUT_KINDS.map((kind) => runWaitKnobKey(kind)).filter(
      (key) => !pairs.has(`${RUN_WAIT_KNOB_FEATURE} ${key}`),
    );
    expect(unseeded).toEqual([]);
  });

  it("remote images: every authorship's autoload knob addresses a seeded row", () => {
    // The computed `autoload_${authorship}` read is only excused because this
    // proves it: a new authorship without its seed
    // (migrations/rich_content_remote_image_knobs.sql) fails here by name.
    const unseeded = (Object.keys(REMOTE_IMAGE_DEFAULTS) as string[])
      .map((authorship) => `autoload_${authorship}`)
      .filter((key) => !pairs.has(`${REMOTE_IMAGE_KNOB_FEATURE} ${key}`));
    expect(unseeded).toEqual([]);
  });

  it("names every read whose address is assembled at run time", () => {
    // The knob-ref family this module exposes. The other readers (knobInt(feature, key) …) are graded
    // by the attestation ceiling (scripts/config-attestation/unresolved-ceiling.json), not here.
    const REF_FAMILY = /^(useEffectiveKnob|ensureEffectiveKnob|peekEffectiveKnob|useSessionKnob|getSessionKnob|resolveSessionKnob)\b/;
    const computed = [
      ...new Set(
        scanWhole()
          .dynamic.filter((d) => REF_FAMILY.test(d.fn))
          .map((d) => d.file),
      ),
    ];
    const unexplained = computed.filter(
      (file) => !COMPUTED_REFS[file] && !COUNTED_BY_THE_ATTESTATION_CEILING.has(file),
    );
    expect(unexplained).toEqual([]);
  });

  it("says out loud when the aidream seeds could not be read", () => {
    if (!existsSync(join(AIDREAM, "db", "migrations"))) {
      console.warn(
        `UNMEASURED: ${AIDREAM}/db/migrations was not found, so only this repo's` +
          " knob seeds were censused. Set AIDREAM_DIR to the sibling checkout.",
      );
    }
    expect(true).toBe(true);
  });
});
