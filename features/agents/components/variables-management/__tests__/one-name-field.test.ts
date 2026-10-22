/**
 * A22: typing "Normal Text" in the agent builder shows "Normal Text" and stores
 * the key `normal_text`. One Name field primitive (`LabelKeyField`) serves every
 * label/key pair in the builder — the variable editor and the context-policy
 * editor — never a separate snake_case "key" box.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { typedNameDraft } from "../variable-name-edit";
import { formToContextPolicy, policyToForm } from "../../context-policies-management/policy-form";

const root = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("one Name field shows the label and stores the key", () => {
  it("a new name keeps what was typed and derives the key", () => {
    expect(typedNameDraft({ typed: "Normal Text", key: "", label: "" })).toEqual({ label: "Normal Text", key: "normal_text" });
    expect(typedNameDraft({ typed: "Normal Text", key: "normal_tex", label: "Normal Tex" })).toEqual({
      label: "Normal Text",
      key: "normal_text",
    });
  });

  it("a locked or diverged key never moves", () => {
    expect(typedNameDraft({ typed: "Plain words", key: "normal_text", label: "Normal Text", keyLocked: true })).toEqual({
      label: "Plain words",
      key: "normal_text",
    });
    expect(typedNameDraft({ typed: "Store words", key: "vocabulary", label: "Store vocabulary" }).key).toBe("vocabulary");
  });

  it("a context policy opens showing its name, and saves the key with the typed label", () => {
    const form = policyToForm({ key: "normal_text", type: "text" });
    expect(form.label).toBe("Normal Text");
    const typed = { ...form, ...typedNameDraft({ typed: "My Notes Text", key: "", label: "" }) };
    const { policy } = formToContextPolicy(typed);
    expect(policy?.key).toBe("my_notes_text");
    expect(policy?.label).toBeUndefined();
    const custom = formToContextPolicy({ ...form, label: "Normal text (raw)" });
    expect(custom.policy?.key).toBe("normal_text");
    expect(custom.policy?.label).toBe("Normal text (raw)");
  });

  it("both builder editors use the one LabelKeyField, and no separate key box remains", () => {
    const policies = read("context-policies-management/AgentContextPoliciesManager.tsx");
    const variables = read("variables-management/AgentVariableEditor.tsx");
    expect(policies).toContain("LabelKeyField");
    expect(variables).toContain("LabelKeyField");
    expect(policies).not.toContain('id="policy-key"');
  });
});
