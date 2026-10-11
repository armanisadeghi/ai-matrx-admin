/**
 * Definition said "2 code call sites recorded" while Health said "No code
 * declaration was found". One definition now: called-but-undeclared is its own
 * answer. Held-by wording: a rung label is never the agent's type.
 */
import {
  codeDeclarationSentence,
  codeDeclarationState,
} from "@/features/mandates/admin/mandate-health";
import {
  agentKindChip,
  heldByParts,
  type MandateHolderRow,
} from "@/features/mandates/provenance";

describe("codeDeclarationState", () => {
  it("call sites without a declaration is called_not_declared, never no-code", () => {
    const state = codeDeclarationState({ declarationFound: false, codeReferenceCount: 2 });
    expect(state).toBe("called_not_declared");
    expect(codeDeclarationSentence(state, 2)).toContain("Called from code");
    expect(codeDeclarationSentence(state, 2)).not.toContain("No code declaration");
  });
  it("no declaration and no call sites is no_code", () => {
    expect(codeDeclarationState({ declarationFound: false, codeReferenceCount: 0 })).toBe("no_code");
  });
  it("an unreadable count is unknown, not zero", () => {
    expect(codeDeclarationState({ declarationFound: false, codeReferenceCount: null })).toBe("unknown");
  });
  it("a declaration wins and prints nothing", () => {
    const state = codeDeclarationState({ declarationFound: true, codeReferenceCount: 0 });
    expect(state).toBe("declared");
    expect(codeDeclarationSentence(state, 0)).toBeNull();
  });
});

describe("held by wording", () => {
  const holder = (patch: Partial<MandateHolderRow>): MandateHolderRow => ({
    rung: "system",
    holder_type: "agent",
    holder_name: "Get Gemini Image",
    owner_name: null,
    is_enabled: true,
    runnable: true,
    detail: "",
    ...patch,
  });
  it("never words the system rung as 'System'", () => {
    const [part] = heldByParts([holder({})], { "Get Gemini Image": "user" });
    expect(part.rung).toBe("Platform default");
    expect(part.rung).not.toMatch(/^System/);
    expect(part.chip).toBe("User agent");
  });
  it("chips a builtin agent as System agent, and unknown types as nothing", () => {
    expect(agentKindChip("agent", "builtin")).toBe("System agent");
    expect(agentKindChip("agent", undefined)).toBeNull();
    expect(agentKindChip("workflow", "user")).toBeNull();
  });
});
