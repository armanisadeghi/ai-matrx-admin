/**
 * registry.test.ts — Window Panels registry integrity.
 *
 * These assertions run against the actual `ALL_WINDOW_REGISTRY_ENTRIES`
 * imported from the source. They catch drift before code review:
 *   - Required fields populated
 *   - slug + overlayId uniqueness
 *   - kind: "window" → mobilePresentation required
 *   - componentImport is a function
 *   - assertRegistryIntegrity() runs clean
 *
 * The runtime `UrlSync`-hydrator pairing check lives in initUrlHydration.ts
 * (dev-time console.error) and as a standalone CLI script
 * (`scripts/check-registry.ts`) — duplicating it in a jest test is optional.
 */
import {
  ALL_WINDOW_REGISTRY_ENTRIES,
  assertRegistryIntegrity,
  getRegistryEntryByOverlayId,
  getRegistryEntryBySlug,
  isPersistableWindow,
  type WindowRegistryEntry,
} from "../registry/windowRegistry";

describe("window-panels registry", () => {
  describe("integrity", () => {
    it("assertRegistryIntegrity() passes", () => {
      expect(() => assertRegistryIntegrity()).not.toThrow();
    });

    it("has at least 50 entries (sanity — we track 100+ today)", () => {
      expect(ALL_WINDOW_REGISTRY_ENTRIES.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe("required fields", () => {
    it("every entry has slug, overlayId, kind, label, componentImport, defaultData", () => {
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        expect(entry.slug).toBeTruthy();
        expect(entry.overlayId).toBeTruthy();
        expect(entry.kind).toBeTruthy();
        expect(entry.label).toBeTruthy();
        expect(typeof entry.componentImport).toBe("function");
        expect(entry.defaultData).toBeDefined();
      }
    });

    it("slug is kebab-case-ish", () => {
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        expect(entry.slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      }
    });

    it("overlayId is camelCase-ish (no dashes, no spaces)", () => {
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        expect(entry.overlayId).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/);
      }
    });
  });

  describe("uniqueness", () => {
    it("no duplicate slugs", () => {
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        if (seen.has(entry.slug)) dupes.push(entry.slug);
        seen.add(entry.slug);
      }
      expect(dupes).toEqual([]);
    });

    it("no duplicate overlayIds", () => {
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        if (seen.has(entry.overlayId)) dupes.push(entry.overlayId);
        seen.add(entry.overlayId);
      }
      expect(dupes).toEqual([]);
    });
  });

  describe("kind-specific invariants", () => {
    it('every kind: "window" has mobilePresentation', () => {
      const missing = ALL_WINDOW_REGISTRY_ENTRIES.filter(
        (e) => e.kind === "window" && !e.mobilePresentation,
      ).map((e) => e.overlayId);
      expect(missing).toEqual([]);
    });

    it('mobilePresentation is one of the allowed values', () => {
      const allowed = new Set(["fullscreen", "drawer", "card", "hidden"]);
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        if (entry.mobilePresentation) {
          expect(allowed.has(entry.mobilePresentation)).toBe(true);
        }
      }
    });

    it('kind is one of the allowed values', () => {
      const allowed = new Set(["window", "widget", "sheet", "modal"]);
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        expect(allowed.has(entry.kind)).toBe(true);
      }
    });

    it('instanceMode (if set) is one of "singleton" | "multi"', () => {
      const allowed = new Set(["singleton", "multi"]);
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        if (entry.instanceMode) {
          expect(allowed.has(entry.instanceMode)).toBe(true);
        }
      }
    });
  });

  describe("lookup helpers", () => {
    it("getRegistryEntryByOverlayId resolves every entry", () => {
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        expect(getRegistryEntryByOverlayId(entry.overlayId)).toBe(entry);
      }
    });

    it("getRegistryEntryBySlug resolves every entry", () => {
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        expect(getRegistryEntryBySlug(entry.slug)).toBe(entry);
      }
    });

    it("returns undefined for unknown ids", () => {
      expect(getRegistryEntryByOverlayId("definitelyNotARealOverlay")).toBeUndefined();
      expect(getRegistryEntryBySlug("not-a-real-slug")).toBeUndefined();
    });
  });

  describe("isPersistableWindow", () => {
    it("returns true for a known non-ephemeral entry", () => {
      // Pick any known persistent window
      const entry = ALL_WINDOW_REGISTRY_ENTRIES.find(
        (e: WindowRegistryEntry) => !e.ephemeral && e.kind === "window",
      );
      expect(entry).toBeDefined();
      expect(isPersistableWindow(entry!.overlayId)).toBe(true);
    });

    it("returns false for an ephemeral entry", () => {
      const entry = ALL_WINDOW_REGISTRY_ENTRIES.find(
        (e: WindowRegistryEntry) => e.ephemeral === true,
      );
      expect(entry).toBeDefined();
      expect(isPersistableWindow(entry!.overlayId)).toBe(false);
    });

    it("returns false for an unregistered overlayId", () => {
      expect(isPersistableWindow("definitelyNotARealOverlay")).toBe(false);
    });
  });

  describe("urlSync coverage", () => {
    it("every urlSync.key is a non-empty string", () => {
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        if (entry.urlSync) {
          expect(entry.urlSync.key).toBeTruthy();
          expect(typeof entry.urlSync.key).toBe("string");
        }
      }
    });

    it("urlSync keys are unique", () => {
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        if (!entry.urlSync) continue;
        if (seen.has(entry.urlSync.key)) dupes.push(entry.urlSync.key);
        seen.add(entry.urlSync.key);
      }
      // Note: one exception is `"agent"` — shared between agentRunWindow
      // (window) and the agent execution display-mode hydrator. If a dupe
      // appears intentionally, move it to an allowlist here.
      expect(dupes).toEqual([]);
    });
  });
});
