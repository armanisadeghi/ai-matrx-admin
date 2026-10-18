import type { ComponentType } from "react";

let capturedLoader: (() => Promise<unknown>) | undefined;

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<unknown>) => {
    capturedLoader = loader;
    return () => null;
  },
}));

describe("ResourcePeekRoot", () => {
  it("loads the peek stack as a renderable component through its one lazy edge", async () => {
    await import("./ResourcePeekRoot");

    expect(capturedLoader).toBeDefined();
    const loaded = await capturedLoader!();

    // next/dynamic receives the component itself. A module-shaped value is
    // silently discarded by the production lazy boundary, leaving every
    // EntityRef Quick look control visibly clickable but inert.
    expect(typeof (loaded as ComponentType)).toBe("function");
  });

  it("the declarative ResourcePeekHost has no lazy edge of its own", async () => {
    capturedLoader = undefined;
    jest.isolateModules(() => {
      require("./ResourcePeekHost");
    });
    expect(capturedLoader).toBeUndefined();
  });
});
