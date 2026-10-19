/**
 * @jest-environment jsdom
 *
 * SUT: `video-clone-items.tsx` VideoCloneFace. Two clone tiles of different products must read differently at far zoom.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("@/features/marketing/social/components/video/VideoCloneNew", () => ({ CloneWorkspace: () => null }));
jest.mock("@/features/marketing/social/components/video/VideoProjectStudio", () => ({ VideoProjectStudio: () => null }));
jest.mock("@/features/marketing/data/service", () => ({ getBrand: jest.fn() }));
jest.mock("@/features/marketing/social/server", () => ({ ingestPost: jest.fn() }));
jest.mock("@/features/marketing/components/brands/BrandPicker", () => ({ BrandPicker: () => null }));

import { VideoCloneFace } from "../video-clone-items";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const face = (brief: object | null) => {
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => {
    root.render(
      <QueryClientProvider client={new QueryClient()}>
        <VideoCloneFace title="Video clone" source={{ kind: "entity", entity: "video-clone", id: null, meta: { url: "https://x.com/r/1", ...(brief ? { brief: JSON.stringify(brief) } : {}) } }} />
      </QueryClientProvider>,
    );
  });
  return { container, unmount: () => act(() => root.unmount()) };
};

describe("video clone far-zoom card", () => {
  it("names the product so two clone tiles differ", () => {
    const a = face({ productName: "Butterfly plate" });
    expect(a.container.textContent).toContain("Butterfly plate");
    a.unmount();
    const b = face({ productName: "Linen apron" });
    expect(b.container.textContent).toContain("Linen apron");
    expect(b.container.textContent).not.toContain("Butterfly plate");
  });
  it("falls back to the tile title without a product", () => {
    expect(face(null).container.textContent).toContain("Video clone");
  });
  it("text is sized relative to the tile, never fixed tiny pixels", () => {
    const { container } = face({ productName: "Plate" });
    for (const el of Array.from(container.querySelectorAll<HTMLElement>("span[style]"))) expect(el.style.fontSize).toMatch(/cqmin$/);
  });
});
