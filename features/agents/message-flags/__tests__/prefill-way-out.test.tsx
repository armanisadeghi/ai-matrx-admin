/**
 * Real use: "Support reply drafter" (claude-haiku-5-5) was authored with a prefill
 * "Dear " and every run failed. The builder must show the author the problem
 * where they work (not a hover tooltip) and offer the way out.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { movePrefillIntoInstructions, prefillWarning } from "../prefillWayOut";
import { PrefillCompatNote } from "../PrefillCompatNote";

const messages = [
  { role: "system", content: [{ type: "text", text: "You draft support replies." }] },
  { role: "user", content: [{ type: "text", text: "{{customer_message}}" }] },
  { role: "assistant", content: [{ type: "text", text: "Dear " }], flags: { prefill: true } },
];

describe("moving a prefill into the instructions", () => {
  it("removes the prefill turn and says its text in the system message", () => {
    const out = movePrefillIntoInstructions(messages);
    expect(out).toHaveLength(2);
    expect(out.some((m) => m.flags?.prefill)).toBe(false);
    const system = JSON.stringify(out[0].content);
    expect(system).toContain("You draft support replies.");
    expect(system).toContain("Begin your reply with exactly");
    expect(system).toContain("Dear");
  });

  it("creates a system message when the agent has none", () => {
    const out = movePrefillIntoInstructions(messages.slice(1));
    expect(out[0].role).toBe("system");
    expect(out).toHaveLength(2);
  });

  it("leaves a list with no prefill alone", () => {
    expect(movePrefillIntoInstructions(messages.slice(0, 2))).toEqual(messages.slice(0, 2));
  });
});

describe("the warning is visible when the model cannot take the prefill", () => {
  const noop = () => {};
  const converted = { verdict: "converted" as const, reason: "Claude Haiku 5.5 cannot take a prefill, so it is asked to begin." };
  it("renders with the Fix menu for a converted or refused verdict", () => {
    const html = renderToStaticMarkup(
      <PrefillCompatNote prefillOn verdict={converted} onPickModel={noop} onMoveIntoInstructions={noop} onRemovePrefill={noop} />,
    );
    expect(html).toContain('data-testid="prefill-compat-note"');
    expect(html).toContain("cannot take a prefill");
    expect(html).toContain("prefill-compat-fix");
  });
  it("renders nothing for a native model or when the flag is off", () => {
    const native = { verdict: "native" as const, reason: "ok" };
    expect(prefillWarning(native)).toBeNull();
    expect(
      renderToStaticMarkup(
        <PrefillCompatNote prefillOn verdict={native} onPickModel={noop} onMoveIntoInstructions={noop} onRemovePrefill={noop} />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <PrefillCompatNote prefillOn={false} verdict={converted} onPickModel={noop} onMoveIntoInstructions={noop} onRemovePrefill={noop} />,
      ),
    ).toBe("");
  });
});
