"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { mintInstanceId } from "@ai-matrx/summon/open";
import {
  createDirectiveReferencePickerCallbackGroup,
  type DirectiveReferencePickerHandlers,
  type DirectiveReferencePickerWindowData,
} from "@/features/window-panels/windows/admin/directive-reference-picker/callbacks";
import type { EntityTypeToken } from "@ai-matrx/associations";
import type { UntypedOverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";
import { hookController } from "./app-opener";

const OVERLAY_ID = "directiveReferencePickerWindow";
const opener = createOpener<object>(OVERLAY_ID);

export interface OpenDirectiveReferencePickerOptions extends DirectiveReferencePickerHandlers {
  entityToken: EntityTypeToken;
  fieldKey: string;
  title: string;
  instanceId?: string;
}

export interface DirectiveReferencePickerHandle {
  close: () => void;
  dispose: () => void;
}

export function useOpenDirectiveReferencePickerWindow() {
  const dispatch = useAppDispatch();

  // The opened window owns its callback group (it releases it on close / its own window-close
  // event); this hook never drops it on unmount — a menu or sheet that opened the window unmounts
  // first (an-opened-window-owns-its-callback-group.test.ts).

  return useCallback(
    (
      options: OpenDirectiveReferencePickerOptions,
    ): DirectiveReferencePickerHandle => {
      const instanceId =
        options.instanceId ??
        mintInstanceId(OVERLAY_ID);
      const { callbackGroupId, dispose } =
        createDirectiveReferencePickerCallbackGroup({
          onPicked: options.onPicked,
          // The window closing itself releases its group (the window owns it).
          onWindowClose: (...args: Parameters<NonNullable<DirectiveReferencePickerHandlers["onWindowClose"]>>) => {
            options.onWindowClose?.(...args);
            dispose();
          },
        });
      const data: DirectiveReferencePickerWindowData = {
        callbackGroupId,
        entityToken: options.entityToken,
        fieldKey: options.fieldKey,
        title: options.title,
      };
      opener.open(dispatch, { instanceId, data });

      const detach = () => {
        dispose();
      };
      const close = () => {
        dispatch(opener.close(instanceId));
        detach();
      };
      return { close, dispose: detach };
    },
    [dispatch],
  );
}

export const DirectiveReferencePickerWindowController = hookController<OpenDirectiveReferencePickerOptions>(useOpenDirectiveReferencePickerWindow);

export type DirectiveReferencePickerWindowDefinitionData = OpenDirectiveReferencePickerOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    directiveReferencePickerWindow: UntypedOverlayWire;
  }
}
