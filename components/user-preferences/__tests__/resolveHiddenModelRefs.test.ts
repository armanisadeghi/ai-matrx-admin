import { closestModels, resolveHiddenModelRefs } from "../resolveHiddenModelRefs";

// Shaped like ai.model_public rows: uuid id, provider name, display name.
const models = [
  { id: "8c3c4436-d3b1-489d-b802-29456fb7f659", name: "allam-2-7b", common_name: "ALLaM 2 7B" },
  { id: "id-gpt4o", name: "gpt-4o", common_name: "GPT-4o" },
  { id: "id-gpt4o-mini", name: "gpt-4o-mini", common_name: "GPT-4o mini" },
  { id: "id-llama-a", name: "llama-3.1-8b-instant", common_name: "Llama 3.1 8B" },
  { id: "id-llama-b", name: "meta-llama/llama-3.1-8b", common_name: "Llama 3.1 8B" },
];

describe("resolveHiddenModelRefs", () => {
  it("keeps exact ids", () => {
    expect(resolveHiddenModelRefs(["id-gpt4o"], models)).toEqual(["id-gpt4o"]);
  });

  it("resolves an exact display name, case-insensitively, to its id", () => {
    expect(resolveHiddenModelRefs(["allam 2 7b"], models)).toEqual(["8c3c4436-d3b1-489d-b802-29456fb7f659"]);
    expect(resolveHiddenModelRefs(["ALLaM 2 7B"], models)).toEqual(["8c3c4436-d3b1-489d-b802-29456fb7f659"]);
  });

  it("resolves the provider model name too", () => {
    expect(resolveHiddenModelRefs(["allam-2-7b"], models)).toEqual(["8c3c4436-d3b1-489d-b802-29456fb7f659"]);
  });

  it("accepts [] (show every model)", () => {
    expect(resolveHiddenModelRefs([], models)).toEqual([]);
  });

  it("refuses a non-array or non-string entries", () => {
    expect(() => resolveHiddenModelRefs("gpt-4o", models)).toThrow(/full list/);
    expect(() => resolveHiddenModelRefs([1], models)).toThrow(/full list/);
  });

  it("refuses an ambiguous name and lists every candidate with its id", () => {
    expect(() => resolveHiddenModelRefs(["llama 3.1 8b"], models)).toThrow(
      /"llama 3\.1 8b" matches 2 models: Llama 3\.1 8B \(id-llama-a\), Llama 3\.1 8B \(id-llama-b\)\. Send the id\./,
    );
  });

  it("refuses an unknown id and names the closest catalog models (name + id)", () => {
    // The guess from the feedback report: a provider-prefixed id.
    expect(() => resolveHiddenModelRefs(["groq/allam-2-7b"], models)).toThrow(
      /"groq\/allam-2-7b" is not a current catalog model\. Closest: ALLaM 2 7B \(8c3c4436-d3b1-489d-b802-29456fb7f659\)/,
    );
  });

  it("reports every problem at once, not just the first", () => {
    let message = "";
    try {
      resolveHiddenModelRefs(["groq/allam-2-7b", "id-gpt4o", "zzzz"], models);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/groq\/allam-2-7b/);
    expect(message).toMatch(/"zzzz" is not a current catalog model .*no current model has a similar name/);
  });
});

describe("closestModels", () => {
  it("ranks a contained name above a token overlap and caps at five", () => {
    const near = closestModels("gpt-4o-2024", models);
    expect(near[0].id).toBe("id-gpt4o");
    expect(near.length).toBeLessThanOrEqual(5);
  });

  it("returns nothing for an empty ref", () => {
    expect(closestModels("  ", models)).toEqual([]);
  });
});
