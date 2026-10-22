/**
 * Scope and flashcard deck in a Board tile show only what a tile needs: the host (tile) already
 * names the record and offers Open, so the scope drops its h1 hero + "Open full page" and the deck
 * folds mastery / power-ups / lineage behind ONE More. The full pages never fold. Source contract.
 */
import { readFileSync } from "fs";
import { join } from "path";

const read = (rel: string) => readFileSync(join(__dirname, "..", "..", rel), "utf8");

describe("scope tile density", () => {
  const editor = read("scopes/components/pages/ScopeDetailEditor.tsx");
  it("the tile density comes from the host chrome (the tile names the scope), never a prop", () => {
    expect(editor).toMatch(/const inTile = useHostNamesRecord\(\{ token: "scope", id: scopeParam \}\)/);
    expect(read("board/items/scope-items.tsx")).toMatch(/entityComments\("scope"\)/);
    expect(read("board/items/scope-items.tsx")).not.toMatch(/density=/);
    expect(read("../app/(core)/organizations/[orgId]/scopes/[typeId]/[scopeId]/page.tsx")).not.toMatch(/density=/);
  });
  it("the editor drops the h1 and Open full page only in the tile density", () => {
    expect(editor).toMatch(/inTile \? \(\s*countLine\([^)]*\)\s*\) : \(\s*<h1/);
    expect(editor).toMatch(/\{inTile \? null : \(\s*<Button\s+asChild[\s\S]*?Open full page/);
  });
});

describe("flashcard deck tile density", () => {
  const view = read("flashcards/components/set-detail/SetDetailView.tsx");
  it("an embedded deck folds the secondary sections behind one More toggle", () => {
    expect(view).toMatch(/data-deck-more-toggle/);
    expect(view).toMatch(/embedded && !moreOpen \? null : \(/);
  });
  it("the folded region holds mastery, power-ups and lineage", () => {
    const at = view.indexOf("embedded && !moreOpen ? null");
    const end = view.indexOf("{/* Cards */}", at);
    const region = view.slice(at, end);
    for (const needle of ["DeckMasteryBar", "PowerUpTile", "MadeFromSource", "GeneratedFromChips"]) {
      expect(region).toContain(needle);
    }
  });
});
