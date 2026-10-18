"use client";

// features/mandates/fix-with-ai/FixWithAiButton.tsx
//
// The "Fix with AI" control on the mismatch notices. It opens FixWithAiWindow (a WindowPanel)
// behind a dynamic() boundary so the window stays out of the notices' chunk.

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import type { FixWithAiTarget } from "./FixWithAiWindow";

const FixWithAiWindow = dynamic(() => import("./FixWithAiWindow"), { ssr: false });

export function FixWithAiButton({
  target,
  onUseOwn,
  icon,
  variant = "quiet",
}: {
  target: FixWithAiTarget;
  onUseOwn?: () => void;
  icon?: ReactNode;
  variant?: "quiet" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon={icon} variant={variant} onClick={() => setOpen(true)} data-testid="fix-with-ai-button">
        Fix with AI
      </Button>
      {open ? <FixWithAiWindow target={target} onClose={() => setOpen(false)} onUseOwn={onUseOwn} /> : null}
    </>
  );
}
