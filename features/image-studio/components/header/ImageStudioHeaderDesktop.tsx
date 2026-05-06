"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeftTapButton } from "@/components/icons/tap-buttons";
import {
  IMAGE_STUDIO_ROUTES,
  IMAGE_STUDIO_ROOT_PATH,
  findImageStudioRoute,
} from "./imageStudioRoutes";

/**
 * Desktop layout for the Image Studio header.
 *
 * Renders into the global shell-header center slot via the parent
 * `<PageHeader>`. Shows:
 *   - Back chevron → returns to `/image-studio` landing
 *   - Active-route title (icon + label)
 *   - Nav with every *other* route (the active route is implicit since
 *     the user is already on it)
 */
export function ImageStudioHeaderDesktop() {
  const pathname = usePathname();
  const current = findImageStudioRoute(pathname);
  const TitleIcon = current?.Icon;
  const titleLabel = current?.titleLabel ?? current?.label ?? "Image Studio";

  return (
    <div className="flex items-center justify-between w-full gap-0 px-0">
      <div className="flex items-center gap-3 min-w-0">
        <Link href={IMAGE_STUDIO_ROOT_PATH} aria-label="Back to Image Studio">
          <ChevronLeftTapButton />
        </Link>

        <div className="min-w-0">
          <h1 className="text-sm font-semibold flex items-center gap-1.5 truncate">
            {TitleIcon ? (
              <TitleIcon className="h-3.5 w-3.5 text-primary" />
            ) : null}
            <span className="truncate">Image Studio — {titleLabel}</span>
          </h1>
        </div>
      </div>

      <nav className="flex items-center gap-1 text-xs">
        {IMAGE_STUDIO_ROUTES.filter((r) => r.path !== pathname).map(
          ({ path, label, Icon }) => (
            <Link
              key={path}
              href={path}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}
