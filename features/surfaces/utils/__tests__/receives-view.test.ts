/** "What the agent receives" response mapping (surface declarations W5-C). */
import type { SurfaceReceives } from "@/features/admin/surface-evidence/types";
import { isRouteNotDeployed, mapReceives } from "../receives-view";

const SITUATION =
  "<situation>\nAI Matrx › Human Resources, doing HR work for Harbor Staffing Co.\n\nEmployer page paragraph.\n</situation>";

function composed(over: Partial<SurfaceReceives> = {}): SurfaceReceives {
  return {
    mode: "composed",
    surface: "matrx-user/hr-employer",
    values_source: "last_check",
    last_check_at: "2026-10-22T16:16:05.220Z",
    values: { employer_name: "Harbor Staffing Co" },
    conversation_id: null,
    message_id: null,
    blocks: [
      { id: "situation", label: "Situation", chars: SITUATION.length, sha256: "aa", text: SITUATION, retained: true, source: "preview", note: null },
      { id: "page_values", label: "Page values", chars: 12, sha256: "bb", text: "8 fields", retained: true, source: "preview", note: null },
    ],
    situation: SITUATION,
    checks: {
      paragraphs: [
        { surface: "matrx-user/hr", level: "ancestor", text: "AI Matrx › Human Resources, doing HR work for Harbor Staffing Co.", at: 12 },
        { surface: "matrx-user/hr-employer", level: "page", text: "Employer page paragraph.", at: 80 },
      ],
      chain_order_ok: true,
      raw_blanks: [],
      not_known: [],
    },
    says: "Rendered now.",
    ...over,
  };
}

describe("mapReceives", () => {
  it("keeps delivery order, labels and exact text", () => {
    const v = mapReceives(composed());
    expect(v.blocks.map((b) => [b.position, b.id, b.label])).toEqual([
      [1, "situation", "Situation"],
      [2, "page_values", "Page values"],
    ]);
    expect(v.blocks[0].text).toBe(SITUATION);
    expect(v.blocks[0].retained).toBe(true);
    expect(v.noValues).toBe(false);
    expect(v.lastCheckAt).toBe("2026-10-22T16:16:05.220Z");
  });

  it("passes all three checks on a clean module-then-page situation", () => {
    const v = mapReceives(composed());
    expect(v.checks.map((c) => [c.key, c.state, c.detail])).toEqual([
      ["chain_order", "pass", null],
      ["raw_blanks", "pass", null],
      ["not_known", "pass", null],
    ]);
  });

  it("notes a page-only situation as a pass", () => {
    const v = mapReceives(
      composed({
        checks: {
          paragraphs: [{ surface: "matrx-user/notes", level: "page", text: "Notes.", at: 12 }],
          chain_order_ok: true,
          raw_blanks: [],
          not_known: [],
        },
      }),
    );
    expect(v.checks[0]).toMatchObject({ state: "pass", detail: "Page paragraph only" });
  });

  it("fails order, raw blanks and not-known fills with what was found", () => {
    const v = mapReceives(
      composed({
        checks: {
          paragraphs: [
            { surface: "matrx-user/hr", level: "ancestor", text: "Module.", at: 90 },
            { surface: "matrx-user/hr-employer", level: "page", text: "Page.", at: 12 },
          ],
          chain_order_ok: false,
          raw_blanks: ["employer_name", "role"],
          not_known: ["(not known: employer)"],
        },
      }),
    );
    expect(v.checks[0]).toMatchObject({ key: "chain_order", state: "fail", detail: "Page paragraph comes first" });
    expect(v.checks[1]).toMatchObject({ key: "raw_blanks", state: "fail", detail: "{employer_name}, {role}" });
    expect(v.checks[2]).toMatchObject({ key: "not_known", state: "fail", detail: "(not known: employer)" });
  });

  it("names a paragraph missing from the situation", () => {
    const v = mapReceives(
      composed({
        checks: {
          paragraphs: [
            { surface: "matrx-user/hr", level: "ancestor", text: "Module.", at: null },
            { surface: "matrx-user/hr-employer", level: "page", text: "Page.", at: 12 },
          ],
          chain_order_ok: false,
          raw_blanks: [],
          not_known: [],
        },
      }),
      (name) => (name === "matrx-user/hr" ? "Human Resources" : name),
    );
    expect(v.checks[0]).toMatchObject({ state: "fail", detail: "Missing: Human Resources" });
  });

  it("fails order when the agent got no situation at all", () => {
    const v = mapReceives(composed({ situation: null, checks: { paragraphs: [], chain_order_ok: false, raw_blanks: [], not_known: [] } }));
    expect(v.checks[0]).toMatchObject({ state: "fail", detail: "No situation block" });
  });

  it("flags a composed answer with no probe values", () => {
    const v = mapReceives(composed({ values_source: "none", last_check_at: null, values: {} }));
    expect(v.noValues).toBe(true);
  });

  it("maps a stored turn: ids, hash-only blocks, order not checked", () => {
    const v = mapReceives({
      mode: "stored",
      surface: "matrx-user/notes",
      values_source: "turn",
      last_check_at: null,
      values: {},
      conversation_id: "c1",
      message_id: "m1",
      blocks: [
        { id: "situation", label: "Situation", chars: 40, sha256: "aa", text: "<situation>x</situation>", retained: true, source: "request_snapshot", note: null },
        { id: "note_body", label: "Note body", chars: 9000, sha256: "ff00", text: null, retained: false, source: null, note: "Only the length and hash were kept: gone" },
      ],
      situation: "<situation>x</situation>",
      checks: { paragraphs: [], chain_order_ok: null, raw_blanks: [], not_known: [] },
      says: "Each block re-found by hash.",
    });
    expect(v.mode).toBe("stored");
    expect(v.conversationId).toBe("c1");
    expect(v.messageId).toBe("m1");
    expect(v.noValues).toBe(false);
    expect(v.blocks[1]).toMatchObject({ retained: false, text: null, sha256: "ff00", lostNote: "Only the length and hash were kept: gone" });
    expect(v.checks[0]).toMatchObject({ state: "unchecked", detail: "A sent turn keeps no values to check against" });
  });

  it("treats a block without text as hash-only even if retained is missing", () => {
    const data = composed();
    const block = { ...data.blocks[0], text: null };
    delete (block as Partial<typeof block>).retained;
    const v = mapReceives({ ...data, blocks: [block] });
    expect(v.blocks[0]).toMatchObject({ retained: false, lostNote: "Only the length and hash were kept." });
  });
});

describe("isRouteNotDeployed", () => {
  it("is an unknown-route 404 only", () => {
    expect(isRouteNotDeployed(404, "Not Found")).toBe(true);
    expect(isRouteNotDeployed(404, "HTTP 404")).toBe(true);
    expect(isRouteNotDeployed(404, "")).toBe(true);
    expect(isRouteNotDeployed(404, "conversation 'x' not found")).toBe(false);
    expect(isRouteNotDeployed(422, "Not Found")).toBe(false);
    expect(isRouteNotDeployed(null, "Not Found")).toBe(false);
  });
});
