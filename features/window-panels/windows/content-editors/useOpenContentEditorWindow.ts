"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay, closeOverlay } from "@/lib/redux/slices/overlaySlice";
import {
  createContentEditorCallbackGroup,
  type ContentEditorWindowHandlers,
} from "./callbacks";

// ─── Shared document shape ───────────────────────────────────────────────────

export interface ContentEditorSeedDocument {
  id: string;
  title: string;
  value: string;
  description?: string;
}

// ─── Variant payloads ────────────────────────────────────────────────────────

interface OpenBaseOptions extends ContentEditorWindowHandlers {
  /**
   * Stable instance id. Omit to get a fresh, unique window every call
   * (recommended for "open editor for this row" style flows).
   */
  windowInstanceId?: string;
  title?: string;
}

export interface OpenContentEditorWindowOptions extends OpenBaseOptions {
  documentId: string;
  documentTitle?: string;
  initialValue?: string;
}

export interface OpenContentEditorListWindowOptions extends OpenBaseOptions {
  documents: ContentEditorSeedDocument[];
  activeDocumentId?: string;
  listTitle?: string;
}

export interface OpenContentEditorWorkspaceWindowOptions
  extends OpenBaseOptions {
  documents: ContentEditorSeedDocument[];
  openDocumentIds?: string[];
  activeDocumentId?: string;
  listTitle?: string;
}

export type AnyOpenContentEditorOptions =
  | ({ variant: "editor" } & OpenContentEditorWindowOptions)
  | ({ variant: "list" } & OpenContentEditorListWindowOptions)
  | ({ variant: "workspace" } & OpenContentEditorWorkspaceWindowOptions);

// ─── Overlay mapping ─────────────────────────────────────────────────────────

const OVERLAY_BY_VARIANT = {
  editor: "contentEditorWindow",
  list: "contentEditorListWindow",
  workspace: "contentEditorWorkspaceWindow",
} as const;

type HandleRef = {
  overlayId: (typeof OVERLAY_BY_VARIANT)[keyof typeof OVERLAY_BY_VARIANT];
  instanceId: string;
  callbackGroupId: string;
  dispose: () => void;
};

export interface ContentEditorWindowHandle {
  overlayId: string;
  instanceId: string;
  callbackGroupId: string;
  /** Close the window AND dispose the callback group. */
  close: () => void;
  /** Dispose the callback group only (leave the window open, events stop flowing). */
  dispose: () => void;
}

/**
 * Imperative helper: open a content editor window variant and register
 * handlers as a callback group. Returns a handle you can use to close the
 * window or just detach the listeners.
 *
 * Prefer this over using `openOverlay` directly — it keeps the callback
 * lifecycle in lockstep with the window lifecycle and plugs into the
 * callbackManager group system for free.
 */
export function useOpenContentEditorWindow() {
  const dispatch = useAppDispatch();
  const handlesRef = useRef<Set<HandleRef>>(new Set());

  // Clean up any still-open groups if the caller unmounts.
  useEffect(() => {
    const handles = handlesRef.current;
    return () => {
      for (const h of handles) h.dispose();
      handles.clear();
    };
  }, []);

  const open = useCallback(
    (options: AnyOpenContentEditorOptions): ContentEditorWindowHandle => {
      const overlayId = OVERLAY_BY_VARIANT[options.variant];
      const instanceId =
        options.windowInstanceId ?? `${overlayId}-${Date.now()}`;

      const { callbackGroupId, dispose } =
        createContentEditorCallbackGroup(options);

      const data: Record<string, unknown> = {
        callbackGroupId,
        title: options.title ?? null,
      };

      if (options.variant === "editor") {
        data.documentId = options.documentId;
        data.documentTitle = options.documentTitle ?? null;
        data.initialValue = options.initialValue ?? "";
      } else if (options.variant === "list") {
        data.documents = options.documents;
        data.activeDocumentId =
          options.activeDocumentId ?? options.documents[0]?.id ?? null;
        data.listTitle = options.listTitle ?? null;
      } else {
        data.documents = options.documents;
        data.openDocumentIds =
          options.openDocumentIds ?? options.documents.map((d) => d.id);
        data.activeDocumentId =
          options.activeDocumentId ??
          options.openDocumentIds?.[0] ??
          options.documents[0]?.id ??
          null;
        data.listTitle = options.listTitle ?? null;
      }

      dispatch(openOverlay({ overlayId, instanceId, data }));

      const handleRef: HandleRef = {
        overlayId,
        instanceId,
        callbackGroupId,
        dispose,
      };
      handlesRef.current.add(handleRef);

      const close = () => {
        dispatch(closeOverlay({ overlayId, instanceId }));
        dispose();
        handlesRef.current.delete(handleRef);
      };

      const detach = () => {
        dispose();
        handlesRef.current.delete(handleRef);
      };

      return {
        overlayId,
        instanceId,
        callbackGroupId,
        close,
        dispose: detach,
      };
    },
    [dispatch],
  );

  return open;
}
