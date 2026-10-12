/**
 * @jest-environment jsdom
 */
import fs from "fs";
import path from "path";

/**
 * The document editor hides Univer's footer zoom slider with a CSS rule. The rule once matched every
 * <section> that CONTAINS the slider — including the page-area section that holds the footer — and
 * the whole document page rendered blank. It may match only the innermost section.
 */
function ruleSelector(): string {
  const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
  const m = /(\[data-document-editor\] section[^{]*aria-label="Zoom"\][^{]*)\{\s*display:\s*none/.exec(css);
  if (!m) throw new Error("footer zoom rule not found in app/globals.css");
  return m[1]!.trim();
}

function univerLikeDom(): { page: Element; footer: Element } {
  document.body.innerHTML = `
    <div data-document-editor>
      <section id="page"><div id="canvas"></div>
        <section id="footerRow"><div><div role="slider" aria-label="Zoom"></div></div></section>
      </section>
    </div>`;
  return { page: document.getElementById("page")!, footer: document.getElementById("footerRow")! };
}

it("hides only the footer zoom section, never the page area that contains it", () => {
  const { page, footer } = univerLikeDom();
  const hit = [...document.querySelectorAll(ruleSelector())];
  expect(hit).toContain(footer);
  expect(hit).not.toContain(page);
});

it("the guard can fail: the old broad selector matches the page area", () => {
  const { page } = univerLikeDom();
  const old = [...document.querySelectorAll('[data-document-editor] section:has([role="slider"][aria-label="Zoom"])')];
  expect(old).toContain(page);
});
