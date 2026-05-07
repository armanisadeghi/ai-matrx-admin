export interface ImageViewerTransform {
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export type ImageViewerTransformAction =
  | "rotateLeft"
  | "rotateRight"
  | "flipHorizontal"
  | "flipVertical"
  | "reset";

export interface ImageViewerTransformStyleInput {
  zoom: number;
  offset: { x: number; y: number };
  transform: ImageViewerTransform;
}

export const initialImageViewerTransform: ImageViewerTransform = {
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

export function applyImageViewerTransformAction(
  transform: ImageViewerTransform,
  action: ImageViewerTransformAction,
): ImageViewerTransform {
  switch (action) {
    case "rotateLeft":
      return { ...transform, rotation: normalizeRotation(transform.rotation - 90) };
    case "rotateRight":
      return { ...transform, rotation: normalizeRotation(transform.rotation + 90) };
    case "flipHorizontal":
      return { ...transform, flipHorizontal: !transform.flipHorizontal };
    case "flipVertical":
      return { ...transform, flipVertical: !transform.flipVertical };
    case "reset":
      return initialImageViewerTransform;
  }
}

export function getImageViewerTransformStyle({
  zoom,
  offset,
  transform,
}: ImageViewerTransformStyleInput) {
  return [
    `translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
    `rotate(${transform.rotation}deg)`,
    `scaleX(${transform.flipHorizontal ? -1 : 1})`,
    `scaleY(${transform.flipVertical ? -1 : 1})`,
    `scale(${zoom})`,
  ].join(" ");
}

function normalizeRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}
