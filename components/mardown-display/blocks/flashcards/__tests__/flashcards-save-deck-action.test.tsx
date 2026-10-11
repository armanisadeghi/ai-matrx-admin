/**
 * "Things in our system are real and don't die in the AI response."
 *
 * A flashcard set in an answer must offer a one-click "Save deck" (a real flashcard deck, the
 * same one the canvas makes) in BOTH control layouts — the header icons and the footer bar —
 * until the set is linked; once it is linked the button gives way to "Open in Flashcards".
 */
import { renderToStaticMarkup } from "react-dom/server";

jest.mock("../FlashcardItem", () => ({ __esModule: true, default: () => null }));

// eslint-disable-next-line import/first -- after the leaf mock above
import { FlashcardsSetControls } from "../flashcards-set-parts";

const base = {
  layoutMode: "grid" as const,
  onLayoutChange: () => {},
  onMobileView: () => {},
  onPrint: () => {},
  onOpenCanvas: () => {},
};

describe("flashcard set controls", () => {
  for (const variant of ["icons", "bar"] as const) {
    it(`${variant}: offers Save deck until the set is a saved deck`, () => {
      const html = renderToStaticMarkup(
        <FlashcardsSetControls {...base} variant={variant} deckHref={null} onSaveDeck={() => {}} />,
      );
      expect(html).toContain('aria-label="Save deck"');
      expect(html).not.toContain("Open in Flashcards");
    });

    it(`${variant}: swaps to Open in Flashcards once saved`, () => {
      const html = renderToStaticMarkup(
        <FlashcardsSetControls {...base} variant={variant} deckHref="/flashcards/abc" onSaveDeck={() => {}} />,
      );
      expect(html).not.toContain('aria-label="Save deck"');
      expect(html).toContain("Open in Flashcards");
    });
  }

  it("draws no Save deck where the host gives no way to save", () => {
    const html = renderToStaticMarkup(<FlashcardsSetControls {...base} deckHref={null} />);
    expect(html).not.toContain("Save deck");
  });
});
