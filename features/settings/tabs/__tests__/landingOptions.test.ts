import { landingOptions } from "../LayoutTab";

// The picker is a native select: only the label is visible, so the tag must live IN the label
// (a `description` only became a hover tooltip — live walk 2026-10-22).
it("an organization's launchpad is visibly tagged so it never reads as a twin of the member's copy", () => {
  const options = landingOptions([
    { key: "founder", title: "Founder", owner: "user:u1" },
    { key: "founder", title: "Founder", owner: "org" },
  ]);
  const labels = options.map((o) => o.label);
  expect(labels).toContain("Founder");
  expect(labels).toContain("Founder · Organization");
  expect(new Set(labels).size).toBe(labels.length);
  expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
});
