import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

// Generate metadata for the Edit Prompt route
export const metadata = createRouteMetadata("/ai/prompts/edit", {
  title: "Edit Prompt",
  description: "Edit an existing AI prompt",
});

export default function EditPromptLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

