"use client";

/**
 * The frame of the Studio's bring-over pages (`/agents/new/studio/from-claude`, `/with-claude-code`):
 * the shell's one-row record header (back, Agents › Agent Studio, the page's name) and a scrolling
 * body that clears it. The page's name lives in the header, never as a title in the body.
 */

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";

export function BringOverFrame({
  title,
  testId,
  maxWidth = "max-w-2xl",
  children,
}: {
  title: string;
  testId: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <RecordPageHeader
        backHref="/agents/new/studio"
        parents={[
          { label: "Agents", href: "/agents" },
          { label: "Agent Studio", href: "/agents/new/studio" },
        ]}
        record={{ name: title }}
      />
      <div className="h-full overflow-y-auto bg-textured pt-[var(--shell-header-h)]" data-matrx-page-scroll>
        <div className={`mx-auto w-full ${maxWidth} space-y-5 p-4`} data-testid={testId}>
          <h1 className="sr-only">{title}</h1>
          {children}
        </div>
      </div>
    </>
  );
}
