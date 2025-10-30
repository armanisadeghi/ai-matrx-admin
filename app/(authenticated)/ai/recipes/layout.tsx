import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata with automatic favicon for the AI Recipes route
export const metadata = createRouteMetadata("/ai/recipes", {
  title: "AI Recipes",
  description: "Browse and manage AI recipe templates",
});

export default function RecipesLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
