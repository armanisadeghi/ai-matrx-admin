/**
 * The link-in-bio host list has ONE source: web.domain_category. This guards the two copies that ship in code
 * (the frontend's packaged link_in_bio rules, and aidream's packaged snapshot) against drifting from the registry
 * export, and against aidream's reader table naming a service the registry does not know.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import fixture from "./snapshot.fixture.json";
import packaged from "../link-in-bio.packaged.json";

type Rule = { host: string; path_pattern: string; category: string; provenance: string; confidence: number };
const linkRules = (rows: Rule[]) =>
  rows.filter((r) => r.category === "link_in_bio").sort((a, b) => (a.host + a.path_pattern).localeCompare(b.host + b.path_pattern));

describe("link_in_bio registry copies", () => {
  it("the packaged frontend rules equal the registry export's link_in_bio rules", () => {
    expect(linkRules(packaged as Rule[])).toEqual(linkRules(fixture as Rule[]));
  });

  const aidreamDir = join(__dirname, "../../../../aidream/aidream");
  const aidreamSnapshot = join(aidreamDir, "services/web_domains/snapshot.json");
  (existsSync(aidreamSnapshot) ? it : it.skip)("aidream's packaged snapshot agrees with the frontend export (sibling checkout)", () => {
    const theirs = JSON.parse(readFileSync(aidreamSnapshot, "utf8")) as Rule[];
    expect(linkRules(theirs)).toEqual(linkRules(fixture as Rule[]));
  });

  const reader = join(aidreamDir, "graph_actions/link_in_bio.py");
  (existsSync(reader) ? it : it.skip)("every service aidream has a reader for is a link_in_bio host in the registry", () => {
    const src = readFileSync(reader, "utf8");
    const block = src.slice(src.indexOf("LINK_IN_BIO_REGISTRY"), src.indexOf("_SERVICE_PATHS"));
    const domains = [...block.matchAll(/LinkInBioHost\("[^"]+",\s*"[^"]+",\s*\(([^)]*)\)/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((d) => d[1]));
    expect(domains.length).toBeGreaterThanOrEqual(24);
    const registered = new Set(linkRules(fixture as Rule[]).map((r) => r.host));
    expect(domains.filter((d) => !registered.has(d))).toEqual([]);
  });
});
