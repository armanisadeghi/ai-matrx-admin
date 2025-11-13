import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Card Demo route
export const metadata = createRouteMetadata("/ai/prompts/experimental/card-demo", {
  title: "Card Demo",
  description: "Demonstration of dynamic card components",
});

export default function CardDemoLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

