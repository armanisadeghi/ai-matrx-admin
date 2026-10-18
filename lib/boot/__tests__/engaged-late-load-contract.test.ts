/**
 * THE ENGAGED-LATE LOAD CONTRACT (owner rule 2026-10-17; adversarial review 2026-10-18): a page
 * nobody touched opens no realtime socket and makes no informational read. Every always-mounted
 * realtime opener and informational reader below waits for `lib/boot/engagedLate` (settled AND
 * engaged), never the settle-only `lib/boot/lateIdle`.
 *
 * Fail-before: on the parent sources each file gated on `useLateIdleReady` (settle only), /notes
 * verified claims through the raw `getClaimsUser` (a JWKS fetch at first paint), its assist strip
 * read and emitted at first paint, and its sidebar asked `my_organizations_by_ids` on every load.
 * `LOAD_CONTRACT_ROOT=<dir>` points the scan at another tree (the red proof).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.env.LOAD_CONTRACT_ROOT ?? resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

const ENGAGED_LATE_HOOK = [
  "lib/redux/preferences/PreferencesLiveSync.tsx",
  "components/client-directives/PlatformDirectiveSubscriber.tsx",
  "lib/extension-bridge/ExtensionBridgeSubscriber.tsx",
  "features/notifications/useInbox.ts",
  "features/organizations/limits/useOrganizationCap.ts",
  "features/notes/components/NotesAssistStrip.tsx",
];

describe("engaged-late load contract", () => {
  it.each(ENGAGED_LATE_HOOK)("%s waits for settle AND engagement", (file) => {
    const src = read(file);
    expect(src).toContain("useEngagedLateReady");
    expect(src).not.toMatch(/useLateIdleReady\(/);
  });

  it("the notes realtime channel joins on the engaged-late tier", () => {
    const src = read("features/notes/redux/realtimeMiddleware.ts");
    expect(src).toContain("whenEngagedLate()");
  });

  it("the preferences channel re-reads once when it first connects (the join gap)", () => {
    const src = read("lib/redux/preferences/PreferencesLiveSync.tsx");
    expect(src).toMatch(/onStatusChange:[\s\S]{0,200}"connected"[\s\S]{0,200}reread\(\)/);
  });

  it("a preferences save notes its version before the request (echo can beat the response)", () => {
    const src = read("lib/redux/preferences/userPreferencesSlice.ts");
    expect(src).toMatch(/notePendingPreferencesWrite\(nextVersion\)[\s\S]{0,120}\.update\(/);
  });

  it("/notes verifies the session through the cached claims read, never a JWKS fetch", () => {
    for (const file of [
      "features/notes/redux/thunks.ts",
      "features/notes/redux/noteRecordWrite.ts",
      "features/notes/service/notesService.ts",
    ]) {
      expect(read(file)).not.toMatch(/getClaimsUser\(/);
    }
  });

  it("the /notes sidebar reads organization names only for the organization grouping", () => {
    const src = read("features/notes/components/NoteSidebar.tsx");
    expect(src).toMatch(/useOrganizationsWith\(\s*groupBy === "organization"/);
    expect(src).toContain('kind: "shared-loading"');
  });
});
