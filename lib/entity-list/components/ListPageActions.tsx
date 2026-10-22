"use client";

// A LIST PAGE'S ONE ACTION LIST (Arman, 2026-10-22, on /marketing/brands/all: "The ... menu doesn't
// have all of the page's core options, such as 'add brand'"). A list page's verbs (Add, Smart Add,
// Import…) are DATA, not loose buttons: `EntityListPage actions` draws each as a button on the list's
// header row AND declares every one to the frame's "…" — one list, so "…" can never miss a verb the
// page shows. Free-form `headerActions` stays for controls that are not verbs (a toggle, a filter).
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@ai-matrx/design-system/controls";
import Link from "@/components/navigation/AppLink";
import { useDeclareFrameActions } from "@/features/shell/frame-host/framePageHeader";
import type { FrameAction } from "@/features/shell/frame/types";

export interface ListPageAction {
  /** Stable id ("add", "smart-add") — "…" lists each id once. */
  id: string;
  label: string;
  icon: LucideIcon;
  /** Run in place (open a create window). */
  onPress?: () => void;
  /** Or go to a page. */
  href?: string;
  /** The ONE main verb of the list (solid); also the empty state's door unless `emptyAction` is given. */
  primary?: boolean;
  disabled?: boolean;
}

/** The actions as the frame's "…" items: a press runs `onPress`, else goes to `href`. */
export function frameActionsOf(actions: readonly ListPageAction[], go: (href: string) => void): FrameAction[] {
  return actions
    .filter((a) => a.onPress || a.href)
    .map((a) => ({
      id: `list-${a.id}`,
      label: a.label,
      icon: a.icon,
      disabled: a.disabled,
      onSelect: () => (a.onPress ? a.onPress() : go(a.href!)),
    }));
}

/** Declare the list page's actions to the frame's "…" for as long as the list is mounted. */
export function useDeclareListPageActions(actions: readonly ListPageAction[] | undefined): void {
  const router = useRouter();
  useDeclareFrameActions(actions && actions.length > 0 ? frameActionsOf(actions, (href) => router.push(href)) : null);
}

/** One action as the list header's 28px control. */
export function ListPageActionButton({ action }: { action: ListPageAction }) {
  const Icon = action.icon;
  const variant = action.primary ? "primary" : "outline";
  const icon = <Icon className="h-4 w-4" aria-hidden />;
  if (!action.onPress && action.href) {
    return (
      <Button asChild variant={variant} icon={icon} collapse="container" aria-label={action.label} disabled={action.disabled}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button variant={variant} icon={icon} collapse="container" onClick={action.onPress} aria-label={action.label} disabled={action.disabled}>
      {action.label}
    </Button>
  );
}
