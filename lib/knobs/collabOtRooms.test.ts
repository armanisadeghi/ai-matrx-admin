import { readCollabOtRooms, type OtRoomsReaders } from "./collabOtRooms";

jest.mock("@/lib/knobs/featureKnobs", () => ({ knobString: jest.fn() }));
jest.mock("@/lib/scoped-config/sessionKnob", () => ({ resolveSessionKnob: jest.fn() }));

/** A register: absent keys raise exactly like an unseeded row. */
function readers(register: Record<string, string>, effective: Record<string, string> = {}): OtRoomsReaders {
  const miss = (k: string) => new Error(`no knob is registered for ${k}`);
  return {
    platform: async (r) => {
      const k = `${r.feature}.${r.key}`;
      if (!(k in register)) throw miss(k);
      return register[k];
    },
    effective: async (r) => {
      const k = `${r.feature}.${r.key}`;
      if (!(k in register)) throw miss(k);
      return effective[k] ?? register[k];
    },
  };
}

describe("collab.ot_rooms split per product", () => {
  it("Docs reads its own knob, Sheets reads its own", async () => {
    const r = readers({ "collab.ot_rooms": "off", "collab.ot_rooms_docs": "all", "collab.ot_rooms_sheets": "off" });
    expect(await readCollabOtRooms("docs", r)).toBe("all");
    expect(await readCollabOtRooms("sheets", r)).toBe("off");
  });
  it("falls back to collab.ot_rooms when the product's own row is missing", async () => {
    const r = readers({ "collab.ot_rooms": "new" });
    expect(await readCollabOtRooms("docs", r)).toBe("new");
    expect(await readCollabOtRooms("sheets", r)).toBe("new");
    const half = readers({ "collab.ot_rooms": "all", "collab.ot_rooms_sheets": "off" });
    expect(await readCollabOtRooms("docs", half)).toBe("all");
    expect(await readCollabOtRooms("sheets", half)).toBe("off");
  });
  it("an organization or person override of the product's own rung wins", async () => {
    const r = readers({ "collab.ot_rooms": "off", "collab.ot_rooms_docs": "all" }, { "collab.ot_rooms_docs": "off" });
    expect(await readCollabOtRooms("docs", r)).toBe("off");
  });
  it("uses the platform value when the ladder has no answer, and off when nothing is readable", async () => {
    const r: OtRoomsReaders = {
      effective: async () => undefined,
      platform: async (ref) => (ref.key === "ot_rooms_docs" ? "all" : (() => { throw new Error("x"); })()),
    };
    expect(await readCollabOtRooms("docs", r)).toBe("all");
    expect(await readCollabOtRooms("sheets", r)).toBe("off");
  });
});
