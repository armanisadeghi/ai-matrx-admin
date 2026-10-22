// THE SAVED DEBUG SWITCH IS IN THE FIRST PAINT (CLOSE-PERF, CD-PERF-01; "No shifts in the ui! ever!!").
// An admin whose debug switch is saved On used to start every page load with it Off: the "Watch AI" row
// appeared in the sidebar footer once the preferences loaded and moved the footer (163 → 191 px, CLS
// 0.0001 on /data/<table>). The store now starts from the boot seed's saved value, on the server and in
// the browser alike. RED before lib/redux/store.ts seededDebugMode: isDebugMode was false here.
import { resolveStoreBootstrapState } from "@/lib/redux/store";
import { mapUserData } from "@/utils/userDataMapper";
import type { CoreBootSeed } from "@/lib/boot/coreBootSeedShape";

const seedWith = (debugMode: unknown) =>
  ({
    userId: "87a6e699-3622-4869-8843-d0867456c0dd",
    preferencesRow: { preferences: { system: { debugMode } }, last_active_organization_id: null, startup_organization_id: null },
  }) as unknown as CoreBootSeed;

const admin = { ...mapUserData(null, undefined, true, "super_admin"), isAdmin: true };
const member = { ...mapUserData(null, undefined, false), isAdmin: false };

describe("the store's first state for the debug switch", () => {
  it("an admin whose switch is saved On starts On", () => {
    const state = resolveStoreBootstrapState({ user: admin, coreBootSeed: seedWith(true) });
    expect((state.adminDebug as { isDebugMode: boolean } | undefined)?.isDebugMode).toBe(true);
  });
  it("saved Off, or no seed, starts with the slice's own initial state", () => {
    expect(resolveStoreBootstrapState({ user: admin, coreBootSeed: seedWith(false) }).adminDebug).toBeUndefined();
    expect(resolveStoreBootstrapState({ user: admin, coreBootSeed: null }).adminDebug).toBeUndefined();
  });
  it("a person who is not an admin never starts with it On, whatever the row says", () => {
    expect(resolveStoreBootstrapState({ user: member, coreBootSeed: seedWith(true) }).adminDebug).toBeUndefined();
  });
});
