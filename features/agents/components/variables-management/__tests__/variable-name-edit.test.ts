import {
  keyFollowsLabel,
  renameVariableInMessages,
  renameVariableInText,
  resolveVariableNameEdit,
} from "../variable-name-edit";

// The live case: agent 0237fc41… carries key `vocabulary` labelled "Store vocabulary".
const diverged = { key: "vocabulary", label: "Store vocabulary", existingNames: ["vocabulary"] };

describe("variable name edits", () => {
  it("a key not derived from its label does not follow it", () => {
    expect(keyFollowsLabel("vocabulary", "Store vocabulary")).toBe(false);
    expect(keyFollowsLabel("normal_text", "Normal Text")).toBe(true);
    expect(keyFollowsLabel("city", undefined)).toBe(true);
  });

  it("an untouched blur never renames a diverged key", () => {
    expect(resolveVariableNameEdit({ ...diverged, typed: "Store vocabulary" })).toEqual({ kind: "none" });
  });

  it("editing a diverged label changes the label only", () => {
    expect(resolveVariableNameEdit({ ...diverged, typed: "Store word lists" })).toEqual({
      kind: "label",
      label: "Store word lists",
    });
  });

  it("typing the key's own name re-links label and key", () => {
    expect(resolveVariableNameEdit({ ...diverged, typed: "Vocabulary" })).toEqual({
      kind: "label",
      label: undefined,
    });
  });

  it("a linked key still follows the label", () => {
    expect(
      resolveVariableNameEdit({ key: "city", label: undefined, existingNames: ["city"], typed: "Home City" }),
    ).toEqual({ kind: "rename", name: "home_city", label: undefined });
  });

  it("a linked rename onto a taken key keeps the draft", () => {
    expect(
      resolveVariableNameEdit({ key: "city", label: undefined, existingNames: ["city", "today"], typed: "Today" }),
    ).toEqual({ kind: "duplicate" });
  });

  it("an empty field resets", () => {
    expect(resolveVariableNameEdit({ ...diverged, typed: "  " })).toEqual({ kind: "reset" });
  });
});

describe("renaming a key everywhere", () => {
  const messages = [
    {
      role: "system",
      content: [
        { type: "text", text: "Lists: {{vocabulary}}. {{#vocabulary}}Use them.{{/vocabulary}}{{^vocabulary}}None.{{/vocabulary}}" },
        { type: "text", text: "Example syntax: {{!vocabulary}}. Not this: {{vocabulary_size}}." },
      ],
    },
    { role: "user", content: [{ type: "text", text: "Store words: {{ vocabulary }}" }] },
    { role: "assistant", content: [{ type: "text", text: "No variables here." }] },
  ];

  it("rewrites the system prompt and every other message", () => {
    const { messages: next, count } = renameVariableInMessages(messages, "vocabulary", "store_vocabulary");
    expect(count).toBe(6);
    expect(next[0].content[0].text).toBe(
      "Lists: {{store_vocabulary}}. {{#store_vocabulary}}Use them.{{/store_vocabulary}}{{^store_vocabulary}}None.{{/store_vocabulary}}",
    );
    expect(next[0].content[1].text).toBe("Example syntax: {{!vocabulary}}. Not this: {{vocabulary_size}}.");
    expect(next[1].content[0].text).toBe("Store words: {{ store_vocabulary }}");
    expect(next[2]).toBe(messages[2]); // untouched messages keep their identity
    expect(next[0].role).toBe("system");
  });

  it("changes nothing when the key is unused", () => {
    const r = renameVariableInMessages(messages, "today", "date");
    expect(r.count).toBe(0);
    expect(r.messages).toBe(messages);
  });

  it("text helper leaves non-matching tokens", () => {
    expect(renameVariableInText("{{a}} {{ab}} {{a}}", "a", "b")).toEqual({ text: "{{b}} {{ab}} {{b}}", count: 2 });
  });
});
