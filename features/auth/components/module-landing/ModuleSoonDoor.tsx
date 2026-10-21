"use client";

// A door to something not built yet. Clicking it announces the registered promise
// (lib/coming-soon/registry.ts), then opens `href`, the closest page that works today.

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { announceComingSoon } from "@ai-matrx/kit/coming-soon";

export function ModuleSoonDoor({
  comingSoonId,
  href,
  className,
  children,
}: {
  comingSoonId: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`w-full text-left ${className ?? ""}`}
      data-coming-soon={comingSoonId}
      onClick={async () => {
        await announceComingSoon(comingSoonId);
        router.push(href);
      }}
    >
      {children}
    </button>
  );
}
