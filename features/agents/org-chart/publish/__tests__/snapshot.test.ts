import type { OrgChartTreeNode } from "@/components/official/org-chart/layout";

import type { AgentOrgNodeData } from "../../buildAgentOrgForest";
import {
  buildPublishSnapshot,
  countBoxes,
  parseSnapshot,
  publicAvatar,
  slugify,
  snapshotOutline,
  snapshotTree,
  withoutEmails,
  type BoxFace,
} from "../snapshot";

const USER_ID = "4cf62e4e-2679-484f-b652-034e697418df";
const AGENT_ID = "a156b9dc-8ed5-4617-b766-9b91b58ff184";

function node(
  boxType: AgentOrgNodeData["boxType"],
  entityId: string,
  children: OrgChartTreeNode<AgentOrgNodeData>[] = [],
  extra: Partial<AgentOrgNodeData> = {},
  edgeKind: AgentOrgNodeData["edgeKind"] = null,
): OrgChartTreeNode<AgentOrgNodeData> {
  const data: AgentOrgNodeData = {
    boxId: `${boxType}:${entityId}`,
    boxType,
    entityId,
    edgeKind,
    parentId: null,
    roleTitle: null,
    isConductor: false,
    pending: false,
    unavailable: false,
    otherPlacements: 0,
    loop: false,
    ...extra,
  };
  return { key: `k-${entityId}`, edgeKind, data, children };
}

const faces: Record<string, BoxFace> = {
  [USER_ID]: { name: "dana@clinic.example", detail: "Northwind Clinic", avatarUrl: "https://lh3.googleusercontent.com/a/dana.png" },
  [AGENT_ID]: { name: "Booking Assistant", detail: "Books visits; contact ops@clinic.example for help", avatarUrl: null },
  seat: { name: "Patient Intake", detail: null, avatarUrl: "https://example.com/x.png" },
};

const forest = [
  node("membership", USER_ID, [
    node("agent", AGENT_ID, [], { roleTitle: "Scheduler" }, "directs"),
    node("position", "seat", [node("agent", "inner")], { loop: true }, "reports_to"),
  ]),
];

const snap = buildPublishSnapshot(forest, (d) => faces[d.entityId] ?? { name: null, detail: null, avatarUrl: null });

describe("buildPublishSnapshot", () => {
  it("carries the registered kind marker", () => {
    expect(snap.__kind).toBe("org_chart_snapshot");
    expect(parseSnapshot(JSON.parse(JSON.stringify(snap)))).not.toBeNull();
  });

  it("never carries a database id or an email", () => {
    const text = JSON.stringify(snap);
    expect(text).not.toContain(USER_ID);
    expect(text).not.toContain(AGENT_ID);
    expect(text).not.toContain("seat");
    expect(text).not.toMatch(/@/);
    expect(text).not.toContain("boxId");
    expect(text).not.toContain("entityId");
  });

  it("replaces an email-only name with a plain label and keeps titles", () => {
    expect(snap.roots[0].label).toBe("Team member");
    expect(snap.roots[0].box_type).toBe("person");
    expect(snap.roots[0].avatar_url).toBe("https://lh3.googleusercontent.com/a/dana.png");
    const [agent, seat] = snap.roots[0].children;
    expect(agent.label).toBe("Booking Assistant");
    expect(agent.sublabel).toBe("Scheduler");
    expect(agent.link_kind).toBe("directs");
    expect(seat.link_kind).toBe("reports_to");
  });

  it("only persons carry avatars, and a loop stops the branch", () => {
    const seat = snap.roots[0].children[1];
    expect(seat.avatar_url).toBeUndefined();
    expect(seat.children).toEqual([]);
    expect(countBoxes(snap)).toBe(3);
  });

  it("gives opaque keys unique per appearance", () => {
    const keys = snapshotTree(snap).flatMap(function all(n): string[] {
      return [n.key, ...n.children.flatMap(all)];
    });
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((k) => /^b\d+$/.test(k))).toBe(true);
  });

  it("writes the outline the blurb job reads", () => {
    expect(snapshotOutline(snap)).toBe(
      ["Team member — person — Northwind Clinic", "  Booking Assistant — agent — Scheduler", "  Patient Intake — position"].join("\n"),
    );
  });
});

describe("helpers", () => {
  it("withoutEmails strips addresses", () => {
    expect(withoutEmails("Write to a@b.co today")).toBe("Write to today");
    expect(withoutEmails("a@b.co")).toBeNull();
  });
  it("publicAvatar refuses signed and non-https URLs", () => {
    expect(publicAvatar("http://x.com/a.png")).toBeNull();
    expect(publicAvatar("https://s3.amazonaws.com/a.png?X-Amz-Signature=1")).toBeNull();
    expect(publicAvatar("https://x.com/a.png?token=abc")).toBeNull();
    expect(publicAvatar("not a url")).toBeNull();
    expect(publicAvatar("https://x.com/a.png")).toBe("https://x.com/a.png");
  });
  it("slugify makes the table's shape", () => {
    expect(slugify("Northwind Clinic — Front Office!")).toBe("northwind-clinic-front-office");
    expect(slugify("Ö")).toBe("o-chart");
    expect(slugify("")).toBe("org-chart");
  });
});
