import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchInput } from "@/components/official/SearchInput";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

describe("SearchInput", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    jest.useRealTimers();
  });

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

  it("does not restart the debounced search when only the handler identity changes", () => {
    const firstSearch = jest.fn();
    const secondSearch = jest.fn();

    act(() => {
      root.render(
        <SearchInput
          value="ai"
          onValueChange={() => undefined}
          onSearch={firstSearch}
          debounceTime={300}
        />,
      );
    });

    act(() => {
      root.render(
        <SearchInput
          value="ai generated"
          onValueChange={() => undefined}
          onSearch={firstSearch}
          debounceTime={300}
        />,
      );
    });

    act(() => {
      jest.advanceTimersByTime(150);
    });

    act(() => {
      root.render(
        <SearchInput
          value="ai generated"
          onValueChange={() => undefined}
          onSearch={secondSearch}
          debounceTime={300}
        />,
      );
    });

    act(() => {
      jest.advanceTimersByTime(149);
    });

    expect(firstSearch).not.toHaveBeenCalled();
    expect(secondSearch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(firstSearch).not.toHaveBeenCalled();
    expect(secondSearch).toHaveBeenCalledTimes(1);
    expect(secondSearch).toHaveBeenCalledWith("ai generated");
  });
});
