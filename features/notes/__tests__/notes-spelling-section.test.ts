// The Suggestions section of the notes right-click menu (2026-10-15): it leads the menu, always
// carries "Add to dictionary" and "Ignore", and a fix first commits the typing before it
// (beforeReplace) so that, in Plain, the fix is its own undo step.
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => null }));
jest.mock("@/lib/redux/selectors/userSelectors", () => ({ selectUserId: () => null }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/features/notes/utils/noteLiveContent", () => ({ noteWorkingCopy: { flush: jest.fn() } }));
jest.mock("../spelling/speller", () => ({
  addPersonalWord: jest.fn(),
  ignoreWord: jest.fn(),
  isMisspelled: () => true,
  isSpellerLoaded: () => true,
  loadSpeller: () => Promise.resolve(),
  suggestionsFor: () => ["brown", "brow"],
}));

import { buildSpellingSection } from "../spelling/useNotesSpelling";

test("the section leads, offers the fixes, Add to dictionary and Ignore; a fix commits the typing first", () => {
  const ta = document.createElement("textarea");
  ta.value = "Teh quick brwon fox";
  document.body.appendChild(ta);
  const order: string[] = [];
  ta.addEventListener("input", () => order.push("replaced"));
  const pw = { kind: "textarea" as const, textarea: ta, span: { start: 10, end: 15, word: "brwon" } };
  const section = buildSpellingSection(pw, {
    onAdd: () => {},
    onIgnore: () => {},
    beforeReplace: () => order.push(`committed:${ta.value}`),
  });
  expect(section.label).toBe("Suggestions");
  expect(section.lead).toBe(true);
  const labels = section.items.map((i) => ("label" in i ? i.label : "—"));
  expect(labels).toEqual(["brown", "brow", "—", "Add to dictionary", "Ignore"]);
  const fix = section.items[0] as { onSelect: () => void };
  fix.onSelect();
  expect(ta.value).toBe("Teh quick brown fox");
  expect(order[0]).toBe("committed:Teh quick brwon fox");
  ta.remove();
});
