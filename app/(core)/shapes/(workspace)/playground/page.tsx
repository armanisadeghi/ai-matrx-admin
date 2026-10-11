// /shapes/playground — every capability a shape component has, as live demo
// shapes rendered through the stored-component path, each testing itself.

import { EntityModeHeader } from "@/features/shell/components/header/templates/EntityModeHeader";
import { SHAPES_ALL_HREF } from "@/features/content-ir/studio/constants";
import PlaygroundClient from "@/features/content-ir/studio/playground/PlaygroundClient";

export const metadata = { title: "Shape Playground" };

export default function ShapePlaygroundPage() {
  return (
    <>
      <EntityModeHeader backHref={SHAPES_ALL_HREF} entityLabel="Shape Playground" />
      <div className="px-4 pb-10 pt-[var(--shell-header-h)] sm:px-6">
        <div className="mx-auto mt-3 max-w-6xl">
          <PlaygroundClient />
        </div>
      </div>
    </>
  );
}
