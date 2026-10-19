import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { PublicHeaderMobileNav } from "./PublicHeaderMobileNav";
// Feedback, theme, canvas and account: light for a signed-out visitor, the Redux islands once the
// full tree is in (features/public-shell/publicTier.ts). Never import those islands here directly.
import { PublicHeaderIslands } from "@/features/public-shell/PublicHeaderIslands";
import {
  PUBLIC_HEADER_ICON_BUTTON,
  PUBLIC_HEADER_ROW,
} from "./publicHeaderChrome";
import { MATRX_LOCAL_DOWNLOAD_PATH } from "@/features/matrx-local-download/release";

export function PublicHeader() {
  return (
    <header
      data-public-header
      className="sticky top-0 z-50 w-full matrx-glass-thin-border"
    >
      <div
        className={cn(
          PUBLIC_HEADER_ROW,
          "flex w-full items-center justify-between px-4",
        )}
      >
        <Link
          href="/"
          aria-label="AI Matrx home"
          className={cn(
            PUBLIC_HEADER_ICON_BUTTON,
            "group -ml-3 flex items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <Image
            src="/matrx/matrx-icon.svg"
            width={20}
            height={20}
            alt="AI Matrx Logo"
            className="flex-shrink-0"
            priority
          />
        </Link>

        <div className="flex items-center">
          <div
            id="public-header-actions"
            className="flex min-w-0 items-center"
          />

          {/* A link is a link: Button renders AS the anchor (asChild) — never
              an <a> wrapping a <button>. On touch it is a 44px icon square
              (PUBLIC_HEADER_ICON_BUTTON); from sm up it grows to show text. */}
          <Button
            asChild
            variant="quiet"
            className={cn(PUBLIC_HEADER_ICON_BUTTON, "hidden sm:inline-flex sm:w-auto")}
          >
            <Link href={MATRX_LOCAL_DOWNLOAD_PATH} aria-label="Download">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Download</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="quiet"
            className="hidden md:inline-flex"
          >
            <Link href="/canvas/discover">Discover</Link>
          </Button>

          <Button asChild variant="quiet" className="hidden md:inline-flex">
            <Link href="/templates">Templates</Link>
          </Button>

          <PublicHeaderMobileNav />

          <PublicHeaderIslands />
        </div>
      </div>
    </header>
  );
}
