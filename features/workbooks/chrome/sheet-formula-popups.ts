/**
 * Tools → Suggestion controls. Univer draws the function-name list and the argument hint straight from
 * the formula editor's input (they never pass through a command, so a command can't cancel them). Both
 * read from two engine services, and those are what is switched here, on the instances of this one
 * workbook, put back when the editor goes away:
 *
 *   - Function suggestions: `IDescriptionService.getSearchListByNameFirstLetter` (the list under the cell
 *     as you type `=SU`) answers with nothing while the setting is off.
 *   - Argument hints: `LexerTreeBuilder.getFunctionAndParameter` (which function and argument the cursor
 *     is in; the hint card is drawn from it) answers with nothing while the setting is off.
 */

import { IDescriptionService, LexerTreeBuilder } from "@univerjs/engine-formula";

import type { SheetPrefs } from "./sheet-row-extras";

interface InjectorLike {
  get<T>(token: unknown): T;
}

export function installFormulaPopupControls(injector: InjectorLike, getPrefs: () => SheetPrefs): () => void {
  const description = injector.get<{ getSearchListByNameFirstLetter: (...a: unknown[]) => unknown[] }>(IDescriptionService);
  const lexer = injector.get<{ getFunctionAndParameter: (...a: unknown[]) => unknown }>(LexerTreeBuilder);
  const search = description.getSearchListByNameFirstLetter;
  const hint = lexer.getFunctionAndParameter;
  description.getSearchListByNameFirstLetter = function (this: unknown, ...args: unknown[]) {
    return getPrefs().functionSuggestions ? search.apply(this, args) : [];
  };
  lexer.getFunctionAndParameter = function (this: unknown, ...args: unknown[]) {
    return getPrefs().formulaHints ? hint.apply(this, args) : null;
  };
  return () => {
    description.getSearchListByNameFirstLetter = search;
    lexer.getFunctionAndParameter = hint;
  };
}
