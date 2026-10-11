// The client's conflict decision. Each case names a wrong outcome a person would see.
import { conflictCopy, decideUpdate } from "../sync-decision";

test("Google unchanged: nothing is applied, even if the local side changed", () => {
  expect(decideUpdate(false, false)).toBe("up_to_date");
  expect(decideUpdate(false, true)).toBe("up_to_date");
});

test("only Google changed: Update applies it without asking", () => {
  expect(decideUpdate(true, false)).toBe("apply");
});

test("both changed: Update asks, it never overwrites quietly", () => {
  expect(decideUpdate(true, true)).toBe("conflict");
});

test("the dialog says 'both' only when both changed", () => {
  const both = conflictCopy("workbook", "Google Sheets", true);
  expect(both.title).toBe("Changed in both places");
  const googleOnly = conflictCopy("workbook", "Google Sheets", false);
  expect(googleOnly.title).not.toMatch(/both/i);
  expect(googleOnly.description).not.toMatch(/both/i);
  expect(googleOnly.description).toMatch(/has not/);
});
