import type { ReactNode } from "react";

/**
 * /education/flashcards/** — the Education layout's header draws the derived trail for every page
 * here (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
 */
export default function FlashcardsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
