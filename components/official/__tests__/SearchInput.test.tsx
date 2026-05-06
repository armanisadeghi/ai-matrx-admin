import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchInput } from "@/components/official/SearchInput";

describe("SearchInput", () => {
  it("renders a labeled search field with clear and submit affordances", () => {
    const html = renderToStaticMarkup(
      <SearchInput
        value="ai"
        onValueChange={() => undefined}
        onSearch={() => undefined}
        placeholder="Search Unsplash..."
        showSubmitButton
      />,
    );

    expect(html).toContain('type="search"');
    expect(html).toContain('value="ai"');
    expect(html).toContain('placeholder="Search Unsplash..."');
    expect(html).toContain('aria-label="Clear search"');
    expect(html).toContain('aria-label="Submit search"');
  });
});
