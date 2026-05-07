import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Download } from "lucide-react";
import { FloatingSelectionToolbar } from "@/components/shared/FloatingSelectionToolbar";

describe("FloatingSelectionToolbar", () => {
  it("renders selected count, actions, and cancel control", () => {
    const html = renderToStaticMarkup(
      <FloatingSelectionToolbar
        selectedCount={2}
        actions={[
          {
            id: "download",
            label: "Download",
            icon: <Download className="h-3.5 w-3.5" />,
            onClick: jest.fn(),
          },
        ]}
        onClear={jest.fn()}
      />,
    );

    expect(html).toContain('role="toolbar"');
    expect(html).toContain("2 selected");
    expect(html).toContain("Download");
    expect(html).toContain('aria-label="Clear selection"');
  });
});
