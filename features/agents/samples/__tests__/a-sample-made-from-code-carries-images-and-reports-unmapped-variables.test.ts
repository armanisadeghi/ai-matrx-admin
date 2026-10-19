const insert = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    schema: () => ({
      from: () => ({
        insert: (row: unknown) => {
          insert(row);
          return {
            select: () => ({
              single: async () => ({ data: { id: "new", ...(row as object) }, error: null }),
            }),
          };
        },
      }),
    }),
  }),
}));
jest.mock("@/lib/organizations/ensureOrgId", () => ({
  ensureOrgId: async () => "org-1",
}));

import type { MessagePart } from "@ai-matrx/agents/generated/stream-events";
import { createAgentSampleDetailed } from "@/features/agents/samples/service";

const image = {
  type: "media",
  kind: "image",
  file_id: "c250608c-c13e-46df-8b07-a422d8113c2f",
  mime_type: "image/png",
} as MessagePart;

describe("a sample made from code", () => {
  beforeEach(() => insert.mockClear());

  it("saves the image part exactly as the builder's paste does, after the text", async () => {
    await createAgentSampleDetailed({
      agentId: "a1",
      label: "Broken layout",
      variables: { route: "/x", note: "tight" },
      userInput: "What is wrong here?",
      referenceOutput: "",
      head: null,
      attachments: [image],
      declaredVariableNames: ["route", "note"],
    });
    expect(insert.mock.calls[0][0].metadata.input_content).toEqual([
      { type: "text", text: "What is wrong here?" },
      image,
    ]);
  });

  it("returns undeclared variable names instead of dropping them", async () => {
    const { unmappedVariables, sample } = await createAgentSampleDetailed({
      agentId: "a1",
      label: "x",
      variables: { route: "/x", typo_name: "v" },
      userInput: "",
      referenceOutput: "",
      head: null,
      attachments: [image],
      declaredVariableNames: ["route"],
    });
    expect(unmappedVariables).toEqual(["typo_name"]);
    expect(sample.variables).toEqual({ route: "/x" });
    expect(insert.mock.calls[0][0].metadata.input_content).toEqual([image]);
  });
});
