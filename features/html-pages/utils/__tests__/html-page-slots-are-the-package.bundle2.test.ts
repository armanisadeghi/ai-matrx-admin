/**
 * The web's Publish / Share-as-webpage slots ARE the chat package's (one home, the same functions
 * Matrx 2 registers): chatUiRegistration registers `createHtmlPage` / `convertMarkdownToHtml` by
 * lazy-importing `@ai-matrx/chat/window-panels/windows/html-pages/html-page-service`, so the markdown
 * pipeline (unified/remark/rehype/KaTeX) loads on the first share, not in the shell. This drives that
 * exact on-demand import with the real print package and asserts the HTML a published page carries.
 *
 * Red before: the web registered its own HTMLPageService and features/html-pages/utils/html-markdown.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("the web's HTML-page slots are the chat package's", () => {
  it("chatUiRegistration registers the package's slots (no web copy of the service)", () => {
    const src = readFileSync(join(process.cwd(), "providers/chatUiRegistration.ts"), "utf8");
    expect(src).toContain('import("@ai-matrx/chat/window-panels/windows/html-pages/html-page-service")');
    expect(src).toMatch(/createHtmlPage: async[^\n]*loadHtmlPageSlots\(\)\)\.createHtmlPage/);
    expect(src).toMatch(/convertMarkdownToHtml: async[^\n]*loadHtmlPageSlots\(\)\)\.convertMarkdownToHtml/);
    expect(src).not.toContain("features/html-pages/services/htmlPageService");
    expect(src).not.toContain("features/html-pages/utils/html-markdown");
  });

  it("converts markdown, math and drops thinking content through the lazy import", async () => {
    const convert = async (markdown: string) =>
      (await import("@ai-matrx/chat/window-panels/windows/html-pages/html-page-service")).htmlPageSlots.convertMarkdownToHtml(markdown);

    const html = await convert("# Cell biology\n\nThe **mitochondria** makes ATP: $E=mc^2$.\n\n- one\n- two\n");
    expect(html).toContain("<h1");
    expect(html).toContain("Cell biology");
    expect(html).toMatch(/<strong[^>]*>mitochondria<\/strong>/);
    expect(html).toMatch(/<li[^>]*>one<\/li>/);
    expect(html).toContain('class="katex"');

    const stripped = await convert("<thinking>private chain</thinking>\n\nVisible answer");
    expect(stripped).toContain("Visible answer");
    expect(stripped).not.toContain("private chain");
  });
});
