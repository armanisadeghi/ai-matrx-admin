import { autoWork, releaseChanged, customItem, mergeEvidence, type Decision, type EvidenceItem } from "../evidence";

// Live 2026-10-14 (admin@admin.com): reloading a ?run= address of a person session started a NEW identify round
// each time (runs 7a19a838, 67fc78b4, 0685b25c: "woken" name + city only, restored exclusions, ~$0.03 each) because the
// restored "yes" on the name woke the steps again. A reload or Back must start nothing.
describe("a reload with restored answers starts no paid work", () => {
  const name = customItem("name", "Ernest Vining");
  const city = customItem("address", "Rancho Santa Margarita");
  const site = customItem("website", "https://example.com");
  const items = mergeEvidence(new Map<string, EvidenceItem>(), [name, city, site]);
  const restored: Record<string, Decision> = { [name.key]: "preferred", [city.key]: "yes", [site.key]: "preferred" };

  it("asks for nothing while every answer is the restored one", () => {
    const w = autoWork(items, { ...restored }, restored, new Set(), new Set(), true);
    expect(w.woken).toEqual({});
    expect(w.seeds).toEqual({ website: "", socials: [] });
  });

  it("the same answers given now (no restore) DO ask for work, so the guard is real", () => {
    const w = autoWork(items, { ...restored }, {}, new Set(), new Set(), true);
    expect(w.woken.name).toBe("Ernest Vining");
    expect(w.seeds.website).not.toBe("");
  });

  it("a restored answer the person changes counts again", () => {
    const changed: Record<string, Decision> = { ...restored, [site.key]: "no" };
    const w = autoWork(items, changed, restored, new Set(), new Set(), true);
    expect(w.seeds.website).toBe("");
    const other = { ...restored };
    delete other[name.key];
    const w2 = autoWork(items, { ...other, [name.key]: "yes" }, other, new Set(), new Set(), true);
    expect(w2.woken.name).toBe("Ernest Vining");
  });

  // The race that shipped a paid reload (run ce6f6972): the restore runs, and in the same effect flush the release
  // check still sees the OLD (empty) answers. It must not release them.
  it("a stale first look at the answers does not release the restored ones", () => {
    const live: Record<string, Decision> = {};
    const restoredMap: Record<string, Decision> = { ...restored };
    const seen = new Set<string>();
    releaseChanged(restoredMap, seen, live); // same flush: decisions not updated yet
    expect(Object.keys(restoredMap)).toHaveLength(3);
    const arrived = { ...restored };
    releaseChanged(restoredMap, seen, arrived); // restored answers arrive
    const w = autoWork(items, arrived, restoredMap, new Set(), new Set(), false);
    expect(w.woken).toEqual({});
    expect(w.seeds).toEqual({ website: "", socials: [] });
    releaseChanged(restoredMap, seen, { ...arrived, [site.key]: "no" }); // the person changes one
    expect(restoredMap[site.key]).toBeUndefined();
    expect(restoredMap[name.key]).toBe("preferred");
  });
});
