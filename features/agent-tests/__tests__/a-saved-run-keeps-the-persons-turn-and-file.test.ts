/**
 * "Save as test case" on a two-turn run (live 2026-10-21, case dc6fdb16 from conversation e99f13c8):
 * the case stored the FIRST request beside the LAST answer, and the file attached on the last turn
 * (`overdue-note.txt`) was dropped — `input_content: []`. An attachment is not in the stored message;
 * the turn's request records it as a context object. The case now stores the person's turn the answer
 * replies to, with the file as a durable reference (file_id, no URL). Recorded live shapes below.
 */
const inserted: unknown[] = [];
const TABLES: Record<string, unknown[]> = {
  message: [
    { position: 2, content: [{ type: "text", text: "Now write the SMS for the customer in the attached note." }], user_content: null },
    { position: 0, content: [{ type: "text", text: "Hi, could you write me a short, friendly text…" }], user_content: null },
  ],
  user_request: [
    {
      created_at: "2026-10-22T03:27:35Z",
      metadata: {
        context_objects: [
          { key: "client", type: "json", group: "person_and_organization", source: { kind: "scope" } },
          {
            key: "resource_file_2f070109-9488-47f6-b96b-d6afff2d805e",
            type: "json",
            group: "attached",
            label: "overdue-note.txt",
            source: { id: "2f070109-9488-47f6-b96b-d6afff2d805e", kind: "file" },
          },
        ],
      },
    },
  ],
};
const ANSWERS = [{ content: [{ type: "text", text: "ERROR: missing sender" }] }];

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => {
    const builder = (table: string) => {
      const b: Record<string, unknown> = {};
      let role: string | null = null;
      for (const k of ["schema", "select", "is", "order", "limit", "in"]) b[k] = () => b;
      b.eq = (col: string, v: string) => {
        if (col === "role") role = v;
        return b;
      };
      b.insert = (row: unknown) => {
        inserted.push(row);
        return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
      };
      b.then = (resolve: (r: unknown) => unknown) =>
        resolve({ data: table === "message" && role === "assistant" ? ANSWERS : TABLES[table] ?? [], error: null });
      return b;
    };
    return { schema: () => ({ from: builder }) };
  },
}));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "org-1" }));

import { saveRunAsTestCase } from "../cases";

const RUN = {
  conversationId: "e99f13c8-ef32-4927-8298-bfc35c138e62",
  title: null,
  createdAt: "2026-10-22T03:25:56Z",
  sourceFeature: "manual",
  userInput: null,
  inputContent: [],
  variables: { customer_name: "Dana", amount: "$86" },
  agentVersionId: null,
};

describe("a run saved as a test case keeps the person's turn and its file", () => {
  it("stores the last turn's words and the file as a file_id reference, never a URL", async () => {
    inserted.length = 0;
    await saveRunAsTestCase({ agentId: "c6c4862b", run: RUN as never, head: null });
    const row = inserted[0] as { user_input: string | null; metadata: { input_content: Array<Record<string, unknown>> } };
    expect(row.user_input).toBe("Now write the SMS for the customer in the attached note.");
    const file = row.metadata.input_content.find((p) => p.type === "media");
    expect(file).toMatchObject({ type: "media", file_id: "2f070109-9488-47f6-b96b-d6afff2d805e" });
    expect(JSON.stringify(row.metadata.input_content)).not.toMatch(/https?:/);
  });
});
