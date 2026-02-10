'use client';

import { PromptAppsGrid } from "@/features/prompt-apps/components/layouts/PromptAppsGrid";
import type { PromptApp } from "@/features/prompt-apps/types";

interface PromptAppsListClientProps {
  apps: PromptApp[];
}

export function PromptAppsListClient({ apps }: PromptAppsListClientProps) {
  return (
    <div className="h-page flex flex-col overflow-hidden bg-textured">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <PromptAppsGrid apps={apps} />
        </div>
      </div>
    </div>
  );
}
