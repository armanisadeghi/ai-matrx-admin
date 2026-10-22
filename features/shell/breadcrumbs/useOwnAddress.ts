"use client";

// features/shell/breadcrumbs/useOwnAddress.ts — the address of the level a header stands for.
//
// A page-top template (EntityModeHeader…) names ITS level: the entity it shows. Mounted in a page,
// that level is the current address. Mounted in a LAYOUT (Smart Add keeps its session in
// `marketing/brands/smart-add/layout.tsx` while /company, /validate/<id>… change under it), the
// current address is deeper, and the template's name is an ANCESTOR crumb that must link back to
// it — Arman, 2026-10-22, on /marketing/brands/smart-add/validate/<id>: "when I click on 'Smart Add
// brand' it's not taking me there. I don't want fake things!!". Next answers the segments below the
// layout a component renders in (`useSelectedLayoutSegments`); a page's component gets none.
import * as navigation from "next/navigation";
import { usePathname } from "next/navigation";

const noSegments = (): string[] | null => null;
// Chosen once at module scope (never a conditional hook call): a test double of next/navigation
// may not carry the hook, and then every header stands for the current address, as before.
const useSegmentsBelow: () => string[] | null =
  typeof (navigation as Partial<typeof navigation>).useSelectedLayoutSegments === "function"
    ? () => navigation.useSelectedLayoutSegments()
    : noSegments;

/** Address segments a layout's child renders below it (route groups, slots and the page key are not addresses). */
export function addressSegments(segments: readonly string[] | null): string[] {
  return (segments ?? [])
    .filter((s) => s && !s.startsWith("(") && !s.startsWith("@") && !s.startsWith("__PAGE__") && !s.startsWith("__DEFAULT__"))
    .flatMap((s) => s.split("/").filter(Boolean));
}

/** `pathname` with the segments below the template removed: the template's own address. */
export function ownAddressOf(pathname: string, below: readonly string[] | null): string {
  const segs = pathname.split(/[?#]/, 1)[0]!.split("/").filter(Boolean);
  const drop = addressSegments(below).length;
  if (drop === 0 || drop > segs.length) return `/${segs.join("/")}`;
  return `/${segs.slice(0, segs.length - drop).join("/")}`;
}

/** The address of the level the calling header stands for, and whether that is the page being shown. */
export function useOwnAddress(): { href: string; isCurrent: boolean; pathname: string } {
  const pathname = usePathname() ?? "/";
  const below = useSegmentsBelow();
  const href = ownAddressOf(pathname, below);
  const bare = `/${pathname.split(/[?#]/, 1)[0]!.split("/").filter(Boolean).join("/")}`;
  return { href, isCurrent: href === bare, pathname: bare };
}
