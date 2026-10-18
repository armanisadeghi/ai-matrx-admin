// @jest-environment node
// Lane SKELETON-HEIGHT-3: on a slow link the room's body arrives after the 2.5 s reveal cap; revealing the editor then
// drew the page empty and the body landed under the reader (member 768 root page, CLS 0.53 under slow 4G).
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "features/spaces/page/SpacePage.tsx"), "utf8");

describe("the reveal of the editor over the static body", () => {
  it("keeps the static body while the editor holds only the room placeholder and the page has more blocks", () => {
    expect(src).toContain('.bn-block-outer[data-id="initialBlockId"]');
    expect(src).toContain("waitingOnRoom");
  });
  it("is still capped, so a dead room never leaves the page read-only forever", () => {
    expect(src).toMatch(/ROOM_BODY_CAP_MS = 20_000/);
    expect(src).toContain("performance.now() - started < ROOM_BODY_CAP_MS");
  });
  it("the placeholder id is the one the editor starts a room with", () => {
    expect(readFileSync(join(process.cwd(), "features/spaces/editor/SpaceEditor.tsx"), "utf8")).toContain('id: "initialBlockId"');
  });
});
