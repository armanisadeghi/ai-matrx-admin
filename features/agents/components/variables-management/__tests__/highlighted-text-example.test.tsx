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
