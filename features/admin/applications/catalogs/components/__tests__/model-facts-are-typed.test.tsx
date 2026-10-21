/**
 * Redesigns never drop capabilities: a model fact keeps the typed control its kind's payload schema
 * (schemas.ts, the one type map) gave it — a number is a number input that saves a number, a yes/no
 * is a switch, a z.enum is a choice list, a list is JSON — and only an untyped fact is free text.
 * Real editor, real schemas; the save is captured.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { CuratedModel } from "@ai-matrx/agents/models";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

import { ModelListingEditor } from "../ModelListingEditor";

const model = (facts: Record<string, unknown>): CuratedModel => ({
  id: "m1",
  name: "zeta",
  common_name: "Zeta 8B",
  description: null,
  maker: null,
  capabilities: {},
  presentation: { display_order: 1, page: "text", shelf: "s", shelf_title: "S", summary: null },
  variants: [],
  offered: true,
  facts,
  updated_at: "2026-10-16T03:00:00+00:00",
});

function setInput(el: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

async function open(kind: string, facts: Record<string, unknown>, onSave = jest.fn(async () => {})) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<ModelListingEditor kind={kind} model={model(facts)} onClose={() => {}} onSave={onSave} />));
  return { root, onSave };
}

const q = (sel: string) => document.body.querySelector(sel) as HTMLElement | null;

describe("model facts keep their typed controls", () => {
  it("a number fact is a number input (schema min/max) and saves a number", async () => {
    const { root, onSave } = await open("llm_model", { text_rating: 4, tier: "Default", is_uncensored: false, hf_parts: ["a", "b"], mystery: "x" });
    const rating = q('input[aria-label="text_rating"]') as HTMLInputElement;
    expect(rating.type).toBe("number");
    expect(rating.min).toBe("0");
    expect(rating.max).toBe("5");
    expect(q('[role="switch"][aria-label="is_uncensored"]')).not.toBeNull();
    expect((q('textarea[aria-label="hf_parts"]') as HTMLTextAreaElement).value).toContain('"a"');
    expect((q('input[aria-label="mystery"]') as HTMLInputElement).type).toBe("text");
    await act(async () => setInput(rating, "5"));
    const save = Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === "Save")!;
    await act(async () => {
      save.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(onSave).toHaveBeenCalledWith({ expected_updated_at: "2026-10-16T03:00:00+00:00", facts: { text_rating: 5 } });
    await act(async () => root.unmount());
  });

  it("a z.enum fact is a choice list of the schema's options", async () => {
    const { root } = await open("ner_model", { tier: "base" });
    const tier = q('[data-fact-control="choice"]')!;
    expect(tier.querySelector('[aria-label="tier"]')).not.toBeNull();
    expect(tier.getAttribute("data-options")).toBe("edge,base,large,xxl");
    await act(async () => root.unmount());
  });
});
