/**
 * CreateBrandWindow callbacks — the window talks back to the page that opened it through the global
 * `callbackManager` (the same contract as CreateProjectWindow): a `created` event with the new brand,
 * a `window-close` event when it closes. No brand state is stored in Redux.
 */

import { newHandleId, registerHandleEntry, removeHandleGroup } from "@ai-matrx/summon/open";
import type { MarketingBrand } from "@/features/marketing/types";

type Handles = typeof import("@ai-matrx/summon/handles");
let handles: Handles | null = null;
const loadHandles = (): Promise<Handles> => import("@ai-matrx/summon/handles").then((m) => (handles = m));

export type CreateBrandWindowEvent =
  | { type: "created"; windowInstanceId: string; brand: MarketingBrand }
  | { type: "window-close"; windowInstanceId: string; lastBrand: MarketingBrand | null };

export interface CreateBrandWindowHandlers {
  onCreated?: (e: Extract<CreateBrandWindowEvent, { type: "created" }>) => void;
  onWindowClose?: (e: Extract<CreateBrandWindowEvent, { type: "window-close" }>) => void;
}

export interface CreateBrandWindowData {
  callbackGroupId?: string | null;
}

export function createCreateBrandCallbackGroup(handlers: CreateBrandWindowHandlers): {
  callbackGroupId: string;
  dispose: () => void;
} {
  const callbackGroupId = newHandleId();
  void loadHandles();
  registerHandleEntry(
    (event: CreateBrandWindowEvent) => {
      if (event.type === "created") handlers.onCreated?.(event);
      else handlers.onWindowClose?.(event);
    },
    { groupId: callbackGroupId },
  );
  return { callbackGroupId, dispose: () => removeHandleGroup(callbackGroupId) };
}

export function emitCreateBrandEvent(callbackGroupId: string | undefined | null, event: CreateBrandWindowEvent): void {
  if (!callbackGroupId) return;
  const trigger = (m: Handles) =>
    m.callbackManager.triggerGroup<CreateBrandWindowEvent>(callbackGroupId, event, { removeAfterTrigger: false });
  if (handles) trigger(handles);
  else void loadHandles().then(trigger);
}
