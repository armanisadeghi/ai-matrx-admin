/**
 * @jest-environment jsdom
 *
 * The kit copy never throws — it resolves `false`. When the browser refuses the clipboard the
 * resume link must be put in front of the person to copy by hand (AP-2 regression: the handling
 * sat in a `catch` that could never run, so a refused copy showed nothing at all).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const copyText = jest.fn<Promise<boolean>, [string]>();
jest.mock("@ai-matrx/kit/clipboard", () => ({
  useClipboard: () => ({ copyText }),
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@ai-matrx/kit/format", () => ({ formatRelativeTime: () => "just now" }));
jest.mock("@ai-matrx/rich-content/levels/RichContentStaticProse", () => ({
  RichContentStaticInline: () => null,
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/lib/url-state/addressWithoutNavigating", () => ({
  replaceAddressWithoutNavigating: jest.fn(),
}));
// The real exports (the page's mappers: hiddenFromLink, welcomeFromDocument …), only the runner doubled.
jest.mock("@ai-matrx/records-ui", () => ({
  ...jest.requireActual("@ai-matrx/records-ui"),
  RecordsUiProvider: ({ children }: { children: React.ReactNode }) => children,
  FormRunner: ({ onAnswersChange }: { onAnswersChange: (a: Record<string, unknown>) => void }) => (
    <button type="button" data-testid="answer" onClick={() => onAnswersChange({ name: "Dana" })}>
      answer
    </button>
  ),
}));

import { PublicFormRunner } from "../PublicFormRunner";

const SECRET = "abcdefghijklmnopqrstuvwx";
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  jest.useFakeTimers();
  copyText.mockReset();
  window.localStorage.clear();
  global.fetch = jest.fn(async () => ({
    json: async () => ({ ok: true, draft: SECRET, saved_at: null, expires_at: null }),
  })) as unknown as typeof fetch;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
});

async function saveThenCopy(words?: Record<string, string>, label = "Copy my link") {
  const form = { form_id: "f1", title: "Intake", table_id: "t", fields: [], honeypot_key: "hp", presentation: {} };
  await act(async () => {
    root.render(<PublicFormRunner form={form as never} {...(words ? { words } : {})} />);
  });
  await act(async () => {
    container.querySelector<HTMLButtonElement>("[data-testid=answer]")!.click();
  });
  await act(async () => {
    jest.advanceTimersByTime(1500);
  });
  const copy = [...container.querySelectorAll("button")].find((b) => b.textContent === label);
  expect(copy).toBeDefined();
  await act(async () => {
    copy!.click();
  });
}

it("shows the resume link to copy by hand when the clipboard refuses", async () => {
  copyText.mockResolvedValue(false);
  await saveThenCopy();
  expect(copyText).toHaveBeenCalledWith(expect.stringContaining(`#resume=${SECRET}`));
  expect(container.textContent).toContain("here is your link to copy by hand");
  expect(container.textContent).toContain(`#resume=${SECRET}`);
  expect(container.textContent).not.toContain("Link copied");
});

it("says the link is copied only when the copy landed", async () => {
  copyText.mockResolvedValue(true);
  await saveThenCopy();
  expect(container.textContent).toContain("Link copied");
  expect(container.textContent).not.toContain("copy by hand");
});

// CD-PAGE-08: a visitor who met the form in Spanish read "Gracias" over English "Copy my link" — every sentence
// this page says to her comes from the form's words.
const ES = {
  copyMyLink: "Copiar mi enlace",
  linkCopied: "Enlace copiado",
  copyByHand: "Este navegador no pudo copiarlo; aquí tienes tu enlace para copiarlo a mano:",
  saving: "Guardando tus respuestas…",
  savedFinishElsewhere: "Tus respuestas están guardadas. Para terminar en otro dispositivo, usa tu propio enlace.",
};

it("speaks the form's language on the finish-later link", async () => {
  copyText.mockResolvedValue(false);
  await saveThenCopy(ES, "Copiar mi enlace");
  expect(container.textContent).toContain(ES.savedFinishElsewhere);
  expect(container.textContent).toContain(ES.copyByHand);
  expect(container.textContent).not.toMatch(/Copy my link|copy by hand|Your answers are saved/);
});
