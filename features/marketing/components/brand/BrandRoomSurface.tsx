"use client";

/**
 * Shared live half of the profile-editing Identity rooms (Messaging, Claims):
 * mounts the room's surface over the brand scope it inherits and registers the
 * room's draft write handlers. `getOwn` is read at trigger time, so the scope
 * is always the page as it is on screen (unsaved edits included).
 */

import type { ReactNode } from "react";
import {
  SurfaceRuntimeProvider,
  useSurfaceWriteHandlers,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { useBrandIdentityBaseScope } from "@/features/marketing/components/brand/BrandIdentitySurface";

type Handlers = Record<string, (value: unknown) => Promise<void>>;

function RoomWriteTargets({
  surfaceName,
  handlers,
}: {
  surfaceName: string;
  handlers: Handlers;
}) {
  useSurfaceWriteHandlers(surfaceName, handlers);
  return null;
}

export function BrandRoomSurface({
  surfaceName,
  buildScope,
  handlers,
  children,
}: {
  surfaceName: string;
  buildScope: (values: Record<string, unknown>) => SurfaceScopePayload;
  handlers: Handlers;
  children: ReactNode;
}) {
  const getBase = useBrandIdentityBaseScope();
  const getScope = (): SurfaceScopePayload =>
    buildScope(getBase() as Record<string, unknown>);
  return (
    <SurfaceRuntimeProvider surfaceName={surfaceName} getScope={getScope}>
      <RoomWriteTargets surfaceName={surfaceName} handlers={handlers} />
      {children}
    </SurfaceRuntimeProvider>
  );
}
