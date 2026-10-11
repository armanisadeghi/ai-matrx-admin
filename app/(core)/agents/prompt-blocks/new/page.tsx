"use client";

import { Suspense } from "react";
import { PromptBlockEditor } from "@/features/prompt-blocks/components/PromptBlockEditor";

export default function NewPromptBlockPage() {
  return (
    <Suspense>
      <PromptBlockEditor blockId="new" />
    </Suspense>
  );
}
