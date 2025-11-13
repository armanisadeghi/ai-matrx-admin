import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Edit Recipe route
export const metadata = createRouteMetadata("/ai/recipes", {
  title: "Edit Recipe",
  description: "Edit AI recipe template",
});

export default function EditRecipeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

