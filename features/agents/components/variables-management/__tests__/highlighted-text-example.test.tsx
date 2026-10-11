/**
 * @jest-environment jsdom
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HighlightedText } from "../HighlightedText";

describe("HighlightedText: {{!name}} is an example, not a variable", () => {
  const html = renderToStaticMarkup(
    <HighlightedText text="This is {{my}} little {{fake}} prompt and {{!my}} example" validVariables={["fake"]} />,
  );

  it("colours only the real variables", () => {
    expect(html).toContain('title="Variable: fake"');
    expect(html).toContain('title="Undefined variable: my"');
    expect((html.match(/<span[^>]*title=/g) ?? []).length).toBe(2);
  });

  it("leaves the example as plain text", () => {
    expect(html).toContain("prompt and {{!my}} example");
    expect(html).not.toContain("Undefined variable: !my");
  });
});

describe("HighlightedText: {{#name}}…{{/name}} sections", () => {
  const text = "Intro\n{{#extra}}\n## More\n{{extra}}\n{{/extra}}\nEnd";

  it("shades a matched section of a declared variable and styles both markers", () => {
    const html = renderToStaticMarkup(<HighlightedText text={text} validVariables={["extra"]} />);
    expect(html).toContain('data-section="extra"');
    expect(html).toContain('title="Kept only when extra is filled"');
    expect(html).toContain('title="End of the section for extra"');
    expect(html).toContain('title="Variable: extra"');
    expect(html).not.toContain("Undefined variable");
  });

  it("an inverse section says so", () => {
    const html = renderToStaticMarkup(<HighlightedText text="{{^extra}}none{{/extra}}" validVariables={["extra"]} />);
    expect(html).toContain('title="Kept only when extra is empty"');
  });

  it("an undeclared name is not a section: no shading, never an undefined-variable error", () => {
    const html = renderToStaticMarkup(<HighlightedText text="{{#ghost}}x{{/ghost}}" validVariables={["extra"]} />);
    expect(html).not.toContain("data-section");
    expect(html).not.toContain("Undefined variable");
    expect(html).toContain("is not declared, so this is sent to the model as written");
  });

  it("an unclosed marker stays neutral", () => {
    const html = renderToStaticMarkup(<HighlightedText text="a {{#extra}} b" validVariables={["extra"]} />);
    expect(html).not.toContain("data-section");
    expect(html).toContain("No matching end");
  });
});
