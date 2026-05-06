"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { ChevronLeftTapButton } from "@/components/icons/tap-buttons";
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetBody,
} from "@/components/official/bottom-sheet/BottomSheet";
import { cn } from "@/lib/utils";
import {
  IMAGE_STUDIO_ROUTES,
  IMAGE_STUDIO_ROOT_PATH,
  findImageStudioRoute,
} from "./imageStudioRoutes";

/**
 * Mobile layout for the Image Studio header.
 *
 * Layout: [back] [active route — tap to switch] [spacer]
 *
 * The 8-link desktop nav can't fit on mobile, so the active route title
 * doubles as a tap target that opens a bottom sheet listing every route.
 * Mirrors the AgentHeaderMobile "more" pattern — keeps the chrome to a
 * single 44pt row while keeping every route one tap away.
 */
export function ImageStudioHeaderMobile() {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  const current = findImageStudioRoute(pathname);
  const TitleIcon = current?.Icon;
  const titleLabel = current?.titleLabel ?? current?.label ?? "Image Studio";

  const navigateTo = (path: string) => {
    if (path === pathname) return;
    startTransition(() => router.push(path));
  };

  return (
    <>
      <div className="flex items-center w-full gap-2 px-0 min-w-0">
        <Link href={IMAGE_STUDIO_ROOT_PATH} aria-label="Back to Image Studio">
          <ChevronLeftTapButton />
        </Link>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Switch Image Studio tool"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 rounded-full px-3 shell-glass active:scale-[0.98] transition-transform"
        >
          {TitleIcon ? (
            <TitleIcon className="h-3.5 w-3.5 text-primary shrink-0" />
          ) : null}
          <span className="text-sm font-semibold truncate">{titleLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>

        {/* right-side spacer to keep the title pill visually balanced */}
        <span aria-hidden className="w-9 h-9 shrink-0" />
      </div>

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Image Studio tools"
      >
        <BottomSheetHeader
          title="Image Studio"
          trailing={
            <button
              onClick={() => setSheetOpen(false)}
              className="text-primary active:opacity-70 min-h-[44px] px-1 text-[15px]"
            >
              Done
            </button>
          }
        />
        <BottomSheetBody>
          {IMAGE_STUDIO_ROUTES.map((route, idx) => {
            const Icon = route.Icon;
            const isActive = route.path === pathname;
            const label = route.titleLabel ?? route.label;
            return (
              <button
                key={route.path}
                onClick={() => {
                  setSheetOpen(false);
                  navigateTo(route.path);
                }}
                className={cn(
                  "flex items-center w-full px-5 min-h-[52px] active:bg-white/5 transition-colors",
                  idx < IMAGE_STUDIO_ROUTES.length - 1 &&
                    "border-b border-white/[0.06]",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 mr-3 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-[15px] flex-1 text-left",
                    isActive && "font-medium",
                  )}
                >
                  {label}
                </span>
                {isActive && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </BottomSheetBody>
      </BottomSheet>
    </>
  );
}
