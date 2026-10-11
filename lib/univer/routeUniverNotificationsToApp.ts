"use client";

/**
 * Univer's notifications go through the APP's toast path — one toaster per page.
 *
 * Univer's own `DesktopNotificationService` mounts a second sonner `<Toaster>`
 * into its workbench the moment it is created. sonner's toast store is global,
 * so with the app's Toaster also mounted every toast (ours and Univer's) showed
 * twice on a workbook or document page. Replacing the service before anything
 * resolves it means Univer never mounts that Toaster, and what Univer has to
 * say (clipboard permission, paste limits) reaches the person through
 * `@/lib/toast` like every other message (tracked, Error Inspector, Alchemy).
 *
 * Call right after `createUniver`, before the first unit is created.
 */

import { toDisposable, type IDisposable } from "@univerjs/core";
import { INotificationService } from "@univerjs/ui";

import { toast } from "@/lib/toast";

type UniverNotification = {
  title: unknown;
  content?: string;
  type?: "success" | "info" | "warning" | "error" | "message" | "loading";
  duration?: number;
};

export interface NotificationReplaceableInjector {
  replace?: (dependency: [unknown, unknown]) => void;
}

/** Show one Univer notification as an app toast; dismissing the disposable removes it. */
export function showUniverNotification(params: UniverNotification): IDisposable {
  const title = typeof params.title === "string" ? params.title : String(params.title ?? "");
  const options = {
    ...(params.content ? { description: params.content } : {}),
    ...(params.duration !== undefined ? { duration: params.duration } : {}),
  };
  const kind = params.type ?? "message";
  const show = kind === "loading" ? toast.message : toast[kind];
  const id = show(title, options) as string | number;
  return toDisposable(() => toast.dismiss(id));
}

export function routeUniverNotificationsToApp(
  injector: NotificationReplaceableInjector | null | undefined,
): { applied: boolean; reason?: string } {
  if (!injector || typeof injector.replace !== "function") {
    return { applied: false, reason: "injector has no replace()" };
  }
  try {
    injector.replace([INotificationService, { useValue: { show: showUniverNotification } }]);
    return { applied: true };
  } catch (err) {
    return { applied: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
