import {
  applyImageViewerTransformAction,
  getImageViewerTransformStyle,
  initialImageViewerTransform,
} from "../windows/image/imageViewerTransforms";

describe("image viewer transforms", () => {
  it("rotates in 90 degree steps and wraps after a full turn", () => {
    const once = applyImageViewerTransformAction(
      initialImageViewerTransform,
      "rotateRight",
    );
    const fullTurn = ["rotateRight", "rotateRight", "rotateRight"].reduce(
      (state) => applyImageViewerTransformAction(state, "rotateRight"),
      once,
    );

    expect(once.rotation).toBe(90);
    expect(fullTurn.rotation).toBe(0);
  });

  it("toggles horizontal and vertical flips independently", () => {
    const horizontal = applyImageViewerTransformAction(
      initialImageViewerTransform,
      "flipHorizontal",
    );
    const both = applyImageViewerTransformAction(horizontal, "flipVertical");

    expect(horizontal).toEqual({
      rotation: 0,
      flipHorizontal: true,
      flipVertical: false,
    });
    expect(both).toEqual({
      rotation: 0,
      flipHorizontal: true,
      flipVertical: true,
    });
  });

  it("builds a stable CSS transform string with zoom, pan, rotation, and flips", () => {
    const transform = getImageViewerTransformStyle({
      zoom: 1.5,
      offset: { x: 30, y: -15 },
      transform: {
        rotation: 90,
        flipHorizontal: true,
        flipVertical: false,
      },
    });

    expect(transform).toBe(
      "translate(20px, -10px) rotate(90deg) scaleX(-1) scaleY(1) scale(1.5)",
    );
  });
});
