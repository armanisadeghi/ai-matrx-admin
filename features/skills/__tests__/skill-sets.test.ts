import {
  isSkillSet,
  resolveSetMembers,
  setMemberIds,
  withSetMembers,
} from "../skill-sets";
import type { SkillRow } from "../types";

const row = (id: string, label: string): SkillRow =>
  ({ id, label, skillType: "reference", config: {} }) as unknown as SkillRow;

describe("skill sets — the one client reader/writer of config.set_members", () => {
  it("reads members in order, de-duplicated, ignoring junk", () => {
    expect(setMemberIds({ set_members: ["a", "b", "a", 3, "", null, "c"] })).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(setMemberIds({ set_members: "a" })).toEqual([]);
    expect(setMemberIds(null)).toEqual([]);
  });

  it("writes members without dropping other config keys", () => {
    const next = withSetMembers({ ingested_from: "doc_manifest", set_members: ["x"] }, [
      "b",
      "a",
      "b",
    ]);
    expect(next).toEqual({ ingested_from: "doc_manifest", set_members: ["b", "a"] });
  });

  it("recognises a set by its skill type only", () => {
    expect(isSkillSet({ skillType: "set" })).toBe(true);
    expect(isSkillSet({ skillType: "reference" })).toBe(false);
    expect(isSkillSet(null)).toBe(false);
  });

  it("resolves members against the catalogue, keeping unknown ids visible", () => {
    const byId = new Map([["a", row("a", "Doc A")]]);
    const members = resolveSetMembers({ config: { set_members: ["a", "gone"] } }, byId);
    expect(members.map((m) => [m.id, m.skill?.label ?? null])).toEqual([
      ["a", "Doc A"],
      ["gone", null],
    ]);
  });
});
