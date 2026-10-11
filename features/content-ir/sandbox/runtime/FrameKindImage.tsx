/**
 * Frame twin of `AppKindImage` (aliased in build-kind-sandbox.ts): no app
 * component can run in the sandbox frame, so a shape's image is the kit's own
 * frame-safe `DefaultKindImage` — the whole image, sized from its dimensions,
 * with Expand and Share relayed to the host's canonical windows via runAction.
 */
import { DefaultKindImage, type KindImageProps } from "@ai-matrx/content-ir-react/kind-kit";

export function AppKindImage(props: KindImageProps) {
  return <DefaultKindImage {...props} />;
}

export default AppKindImage;
