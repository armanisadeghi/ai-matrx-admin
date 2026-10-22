// features/hr/shared/HrFrameMenu.tsx
//
// THE ONE HR MENU IN THE NEW APP FRAME'S SIDEBAR (owner, 2026-10-22: one sidebar column, the
// product's own navigation). The /hr layout mounts <HrFrameSidebar> once, so EVERY HR page — the
// ones in HrShell and the record pages that are not (My info, Tasks, Performance) — hands the frame
// the same menu through <FrameSidebarContent>. Drawn ONLY in the frame: classic renders nothing
// here and keeps HrShell's header module switcher, unchanged.
//
// Its rows are `useHrNav`'s items, exactly — the same persona- and capability-resolved list the
// classic header switcher shows, in the same order (HR's nav is one flat list, no groups). Never a
// second list. The current module is selected; the current section's route tabs (HrSubShell
// publishes its visibility-filtered tabs here in the frame) sit indented under it.
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Tile } from "@ai-matrx/design-system/controls";

import {
  FrameSidebarContent,
  useFrameSidebarSlot,
} from "@/features/shell/frame-host/frameSidebarSlot";

import { resolveActiveHrKey, type HrNavItem } from "./hr-nav";
import { useHrNav } from "./useHrNav";

export type HrSectionTab = { key: string; label: string; href: string; icon?: LucideIcon };

type Publish = (tabs: readonly HrSectionTab[] | null) => void;

const HrSectionTabsContext = createContext<Publish | null>(null);

function sameTabs(a: readonly HrSectionTab[] | null, b: readonly HrSectionTab[] | null): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((t, i) => t.key === b[i].key && t.href === b[i].href && t.label === b[i].label);
}

/**
 * HrSubShell's half: in the frame, publish the section's tabs to the HR menu (they render under the
 * current module there, not as a strip in the body). A no-op outside the /hr layout's sidebar.
 */
export function usePublishHrSectionTabs(tabs: readonly HrSectionTab[] | null): void {
  const publish = useContext(HrSectionTabsContext);
  useEffect(() => {
    publish?.(tabs);
  });
  useEffect(() => () => publish?.(null), [publish]);
}

/** The /hr layout's half: the frame sidebar's HR menu, and the channel HrSubShell publishes to. */
export function HrFrameSidebar({ children }: { children: ReactNode }) {
  const inFrame = useFrameSidebarSlot();
  const [tabs, setTabs] = useState<readonly HrSectionTab[] | null>(null);
  const [publish] = useState<Publish>(
    () => (next: readonly HrSectionTab[] | null) =>
      setTabs((prev) => (sameTabs(prev, next) ? prev : next)),
  );
  return (
    <HrSectionTabsContext value={publish}>
      {inFrame ? <HrFrameSidebarMenu sectionTabs={tabs} /> : null}
      {children}
    </HrSectionTabsContext>
  );
}

function HrFrameSidebarMenu({ sectionTabs }: { sectionTabs: readonly HrSectionTab[] | null }) {
  const pathname = usePathname() ?? "";
  const { nav, showNav } = useHrNav();
  // No employer open: nothing to navigate within — the frame's own HR rows stay (no claim).
  if (!showNav) return null;
  return (
    <FrameSidebarContent>
      <HrFrameMenu
        items={nav.items}
        activeKey={resolveActiveHrKey(nav.items, pathname)}
        sectionTabs={sectionTabs ?? undefined}
        activeTabKey={sectionTabs ? resolveActiveHrKey(sectionTabs, pathname) : null}
      />
    </FrameSidebarContent>
  );
}

export function HrFrameMenu({
  items,
  activeKey,
  sectionTabs,
  activeTabKey,
}: {
  items: readonly HrNavItem[];
  activeKey: string | null;
  sectionTabs?: readonly HrSectionTab[];
  activeTabKey?: string | null;
}) {
  return (
    <ul data-hr-frame-menu="" className="flex flex-col gap-px px-2 pb-4">
      {items.map((item) => {
        const current = item.key === activeKey;
        const tabs = current && sectionTabs && sectionTabs.length > 0 ? sectionTabs : null;
        return (
          <li key={item.key}>
            <MenuLink
              href={item.href}
              label={item.label}
              icon={item.icon}
              hint={item.description}
              selected={current && !(tabs && activeTabKey)}
              current={current && !(tabs && activeTabKey)}
            />
            {tabs ? (
              <ul data-hr-frame-subpages="" className="flex flex-col gap-px pl-5">
                {tabs.map((tab) => (
                  <li key={tab.key}>
                    <MenuLink
                      href={tab.href}
                      label={tab.label}
                      icon={tab.icon}
                      selected={tab.key === activeTabKey}
                      current={tab.key === activeTabKey}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function MenuLink({
  href,
  label,
  icon: Icon,
  hint,
  selected,
  current,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  hint?: string;
  selected: boolean;
  current: boolean;
}) {
  return (
    <Tile
      asChild
      dense
      variant="quiet"
      className="w-full"
      icon={Icon ? <Icon aria-hidden /> : undefined}
      title={label}
      selected={selected || undefined}
      selectedStyle="fill"
      aria-current={current ? "page" : undefined}
    >
      <Link data-tap-target="" href={href} title={hint} />
    </Tile>
  );
}
