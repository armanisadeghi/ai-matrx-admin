import { windowSurfaceName } from "../follow-route-surface";

describe('"This page" window follows the route', () => {
  it("shows the surface it was opened for while the route is unchanged (a window over the page included)", () => {
    expect(
      windowSurfaceName({
        openedSurface: "matrx-user/quick-note-save",
        openedPath: "/chat/abc",
        currentPath: "/chat/abc",
        activeSurface: "matrx-user/chat",
      }),
    ).toBe("matrx-user/quick-note-save");
  });

  it("after navigation shows the new page's surface, never the previous page's", () => {
    expect(
      windowSurfaceName({
        openedSurface: "matrx-user/hr-employer",
        openedPath: "/hr/settings/employer",
        currentPath: "/marketing/d940215a-be2f-4505-a21b-c6374e9e7009",
        activeSurface: "matrx-user/marketing-brand",
      }),
    ).toBe("matrx-user/marketing-brand");
  });

  it("keeps the opened surface when the new route has no surface at all", () => {
    expect(
      windowSurfaceName({
        openedSurface: "matrx-user/hr-employer",
        openedPath: "/hr/settings/employer",
        currentPath: "/somewhere-unmapped",
        activeSurface: null,
      }),
    ).toBe("matrx-user/hr-employer");
  });

  it("a window restored with no surface shows the page's", () => {
    expect(
      windowSurfaceName({ openedSurface: "", openedPath: "/notes/1", currentPath: "/notes/1", activeSurface: "matrx-user/notes" }),
    ).toBe("matrx-user/notes");
  });
});
