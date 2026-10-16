jest.mock("@univerjs/engine-formula", () => ({ IDescriptionService: "IDescription", LexerTreeBuilder: "Lexer" }));

import { suggestCompletion } from "../chrome/sheet-autocomplete";
import { installFormulaPopupControls } from "../chrome/sheet-formula-popups";

describe("Tools > Autocomplete", () => {
  const column = ["Apple", "Apricot", "Apple", "banana", 5, null];
  it("offers the most common longer value that starts with what was typed", () => {
    expect(suggestCompletion("Ap", column)).toBe("Apple");
    expect(suggestCompletion("ban", column)).toBe("banana");
  });
  it("offers nothing when it cannot help", () => {
    expect(suggestCompletion("Apple", column)).toBeNull();
    expect(suggestCompletion("", column)).toBeNull();
    expect(suggestCompletion("=SU", ["=SUM(A1)"])).toBeNull();
    expect(suggestCompletion("zz", column)).toBeNull();
  });
});

describe("Tools > Suggestion controls change what the formula editor is told", () => {
  it("each switch empties its own popup and nothing else", () => {
    const description = { getSearchListByNameFirstLetter: () => ["SUM"] };
    const lexer = { getFunctionAndParameter: () => ({ functionName: "SUM", paramIndex: 0 }) };
    const injector = { get: (token: unknown) => (token === "IDescription" ? description : lexer) };
    const prefs = { functionSuggestions: true, formulaHints: true, columnAutocomplete: true };
    const off = installFormulaPopupControls(injector, () => prefs);
    expect(description.getSearchListByNameFirstLetter()).toEqual(["SUM"]);
    prefs.functionSuggestions = false;
    expect(description.getSearchListByNameFirstLetter()).toEqual([]);
    expect(lexer.getFunctionAndParameter()).toEqual({ functionName: "SUM", paramIndex: 0 });
    prefs.formulaHints = false;
    expect(lexer.getFunctionAndParameter()).toBeNull();
    off();
    expect(description.getSearchListByNameFirstLetter()).toEqual(["SUM"]);
  });
});
