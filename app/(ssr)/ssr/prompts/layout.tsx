import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/ai/prompts", {
  titlePrefix: "SSR",
  title: "Prompts",
  description: "SSR prompt builder shell — create and manage AI prompts",
  letter: "Ps",
});

export default function PromptsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
