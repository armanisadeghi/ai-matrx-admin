import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Server-renderable back-chevron link. Mirrors TapTargetButton's structure
// (44pt outer touch target + 32px inner glass disc) so it sits visually
// alongside other tap targets in the header. Implemented as <Link> because
// TapTargetButton is button-only and can't be a routing link.
export function BackChevron({
  href,
  ariaLabel = "Back",
}: {
  href: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="flex h-11 w-11 items-center justify-center bg-transparent transition-transform active:scale-95 outline-none cursor-pointer"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full matrx-shell-glass transition-colors">
        <ChevronLeft className="h-4 w-4 text-foreground" strokeWidth={2} />
      </div>
    </Link>
  );
}
