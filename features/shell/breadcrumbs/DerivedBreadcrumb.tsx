"use client";

// DerivedBreadcrumb — THE breadcrumb (feature-pages rule 7). No props are needed: it reads the address,
// the menu and the page's declared record and draws the trail with the Scopes/Admin look (each crumb
// a link, a chevron beside it opening its siblings). Use it inline in a module/list header; use
// `DerivedCrumbTrailHeader` when the page has nothing else in its header; `RecordPageHeader` derives
// its own parents from the same hook.
//
//   <PageHeader><DerivedBreadcrumb /></PageHeader>                      // a list page
//   <DerivedBreadcrumb records={{ [orgHref]: { label: org.name, options } }} />   // a layout that knows names

import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CrumbNode,
  CrumbTrailHeader,
} from "@/features/shell/components/header/templates/CrumbTrailHeader";
import { frameCrumbOf, useDeclareFrameCrumbs } from "@/features/shell/frame-host/framePageHeader";
import { useDerivedTrail, type UseDerivedTrailOptions } from "./useDerivedTrail";

export interface DerivedBreadcrumbProps extends UseDerivedTrailOptions {
  className?: string;
  /** Show only the last `max` levels on a narrow header (default: all). */
  max?: number;
  /**
   * A module header kept in a LAYOUT (Education's): its trail yields to any trail the page declares
   * (the frame picks the page's; the layout re-declares on every address change, after the page).
   */
  fallback?: boolean;
}

export function DerivedBreadcrumb({ className, max, fallback, ...options }: DerivedBreadcrumbProps) {
  const all = useDerivedTrail(options);
  // THE NEW APP FRAME draws the trail in its own crumb row: hand it over and draw nothing here.
  const inFrame = useDeclareFrameCrumbs(all.length > 0 ? all.map(frameCrumbOf) : null, { fallback });
  if (all.length === 0 || inFrame) return null;
  const trail = max && all.length > max ? all.slice(-max) : all;
  return (
    <nav
      aria-label="Breadcrumb"
      data-derived-breadcrumb
      className={cn("flex min-w-0 items-center gap-1", className)}
    >
      {trail.map((crumb, i) => (
        <Fragment key={`${crumb.label}-${i}`}>
          {i > 0 && (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <CrumbNode crumb={crumb} isLast={i === trail.length - 1} />
        </Fragment>
      ))}
    </nav>
  );
}

/**
 * A route whose whole header is the trail (plus optional right-slot actions). As a `fallback` (a module
 * layout's) it is the most generic header there is, so it yields to the page's header AND to any
 * fallback the page draws itself (the table page's, a route skeleton's): one fallback at a time.
 */
export function DerivedCrumbTrailHeader({
  right,
  fallback,
  ...options
}: UseDerivedTrailOptions & { right?: React.ReactNode; fallback?: boolean }) {
  const trail = useDerivedTrail(options);
  if (trail.length === 0) return null;
  return <CrumbTrailHeader trail={trail} right={right} fallback={fallback ? "derived" : false} />;
}
