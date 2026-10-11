"use client";

import { Suspense, use } from "react";
import { PromptBlockEditor } from "@/features/prompt-blocks/components/PromptBlockEditor";

export default function PromptBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <PromptBlockEditor blockId={id} />
    </Suspense>
  );
}
