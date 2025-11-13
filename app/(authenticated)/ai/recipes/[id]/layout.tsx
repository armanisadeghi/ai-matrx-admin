import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Recipe Detail route
export const metadata = createRouteMetadata("/ai/recipes", {
  title: "Recipe Details",
  description: "View recipe details",
});

export default function RecipeDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

