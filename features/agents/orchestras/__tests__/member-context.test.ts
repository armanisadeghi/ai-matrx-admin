/**
 * A member's connection setting (context passthrough) — the builder reads it exactly as strictly
 * as the server does, writes only the mode's own list, and never drops a job link on save.
 */
import {
  DEFAULT_MEMBER_CONTEXT,
  memberContextToWire,
  parseMemberContext,
  withMode,
} from "../memberContext";

describe("parseMemberContext", () => {
  it("reads no payload as the default: handed over, person and organization on, version 0", () => {
    expect(parseMemberContext(null, null)).toEqual({ context: DEFAULT_MEMBER_CONTEXT, version: 0, error: null });
  });

  it("reads a stored setting and its version", () => {
    const parsed = parseMemberContext("orchestra_member", {
      __kind: "orchestra_member",
      context: { mode: "mirror", all_except: ["voice"], limits: { brand: 7 }, person_and_org: false },
      version: 3,
    });
    expect(parsed.error).toBeNull();
    expect(parsed.version).toBe(3);
    expect(parsed.context).toEqual({
      mode: "mirror",
      alwaysSend: [],
      allExcept: ["voice"],
      limits: { brand: 7 },
      personAndOrg: false,
    });
  });

  it.each([
    ["another kind", "room_view_policy", { __kind: "room_view_policy" }],
    ["unknown mode", "orchestra_member", { context: { mode: "open" }, version: 1 }],
    ["list in the wrong mode", "orchestra_member", { context: { mode: "closed", always_send: ["a"] }, version: 1 }],
    ["a name with a comma", "orchestra_member", { context: { always_send: ["a,b"] }, version: 1 }],
    ["no version", "orchestra_member", { context: {} }],
  ])("refuses %s — never shows a default as if it were saved", (_why, kind, payload) => {
    expect(parseMemberContext(kind, payload).error).not.toBeNull();
  });
});

describe("memberContextToWire / withMode", () => {
  it("writes only the list that belongs to the mode", () => {
    const mirror = withMode({ ...DEFAULT_MEMBER_CONTEXT, alwaysSend: ["angle"] }, "mirror");
    expect(mirror.alwaysSend).toEqual([]);
    expect(memberContextToWire({ ...mirror, allExcept: ["voice"] })).toEqual({
      mode: "mirror",
      all_except: ["voice"],
      person_and_org: true,
    });
    expect(memberContextToWire({ ...DEFAULT_MEMBER_CONTEXT, mode: "closed" })).toEqual({
      mode: "closed",
      person_and_org: true,
    });
  });
});

describe("a member save keeps every metadata key the builder does not edit", () => {
  it("carries a job link and dag wiring back on the upsert", async () => {
    jest.resetModules();
    const add = jest.fn(async () => ({ ok: true, data: { id: "e1" } }));
    jest.doMock("@/features/scopes/service/associationsService", () => ({
      associationsService: { add },
    }));
    jest.doMock("@/features/scopes/service/associationResult", () => ({ fromAssociations: (r: unknown) => r }));
    jest.doMock("@/utils/supabase/client", () => ({ supabase: {} }));
    const { orchestrasService } = await import("../service/orchestrasService");
    await orchestrasService.addMember("conductor", "member", {
      position: 2,
      meta: { roleTitle: "Headline writer", gap: "writes headlines", required: false },
      extraMeta: { mandate_key: "seo.press_headlines", depends_on: [1] },
    });
    const call = add.mock.calls[0] as unknown as [{ metadata: Record<string, unknown> }];
    expect(call[0].metadata).toMatchObject({ mandate_key: "seo.press_headlines", depends_on: [1], gap: "writes headlines" });
  });
});
