import { landingOptions } from "../LayoutTab";

it("an organization's launchpad is tagged so it never reads as a twin of the member's copy", () => {
  const options = landingOptions([
    { key: "founder", title: "Founder", owner: "user:u1" },
    { key: "founder", title: "Founder", owner: "org" },
  ]);
  const founders = options.filter((o) => o.label === "Founder");
  expect(founders).toHaveLength(2);
  expect(new Set(founders.map((o) => o.value)).size).toBe(2);
  expect(founders.filter((o) => "description" in o && o.description === "Organization")).toHaveLength(1);
});
