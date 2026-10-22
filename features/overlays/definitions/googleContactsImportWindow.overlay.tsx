"use client";

/**
 * Openers for the two Google import windows (Google-native PLAN §4.5, §4.7).
 *
 * `useOpenGoogleContactsImport()` / `useOpenGoogleTasksImport()` — imperative
 * hooks; each returns a handle with `close()`. Singletons: opening again
 * retargets the one window instead of stacking a second copy.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import type { OverlayWire } from "./overlay-types";
import { createOpener } from "@ai-matrx/summon/opener";

const CONTACTS_OVERLAY_ID = "googleContactsImportWindow" as const;
const opener = createOpener<object>(CONTACTS_OVERLAY_ID);
const TASKS_OVERLAY_ID = "googleTasksImportWindow" as const;
const tasksOpener = createOpener<object>(TASKS_OVERLAY_ID);

export interface GoogleImportWindowHandle {
  close: () => void;
}

export type GoogleContactsImportInitialView = "contacts" | "directory";

export interface GoogleContactsImportWindowLaunchData {
  /** The organization the imported People are written into. Required by the
   *  server: nothing chooses one for the caller. */
  organizationId: string | null;
  /** Opens with one contact preselected — the "Update from Google" door. */
  initialExternalId?: string | null;
  /** The existing reviewer tab to reveal first. */
  initialView?: GoogleContactsImportInitialView;
}

export type OpenGoogleContactsImportOptions = GoogleContactsImportWindowLaunchData;

export function readGoogleContactsImportLaunchData(
  value: unknown,
): GoogleContactsImportWindowLaunchData {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    organizationId:
      typeof data.organizationId === "string" ? data.organizationId : null,
    initialExternalId:
      typeof data.initialExternalId === "string" ? data.initialExternalId : null,
    initialView: data.initialView === "directory" ? "directory" : "contacts",
  };
}

export function useOpenGoogleContactsImport() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenGoogleContactsImportOptions): GoogleImportWindowHandle => {
      opener.open(dispatch, { data: {
            organizationId: opts.organizationId ?? null,
            initialExternalId: opts.initialExternalId ?? null,
            initialView: opts.initialView ?? "contacts",
          } });
      return {
        close: () => dispatch(opener.close()),
      };
    },
    [dispatch],
  );
}

export interface OpenGoogleTasksImportOptions {
  organizationId: string | null;
  /** The AI Matrx project imported tasks belong to, when the caller has one. */
  projectId?: string | null;
}

export function useOpenGoogleTasksImport() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenGoogleTasksImportOptions): GoogleImportWindowHandle => {
      tasksOpener.open(dispatch, {
        data: {
          organizationId: opts.organizationId ?? null,
          projectId: opts.projectId ?? null,
        },
      });
      return {
        close: () => dispatch(tasksOpener.close()),
      };
    },
    [dispatch],
  );
}

export type GoogleContactsImportWindowDefinitionData = OpenGoogleContactsImportOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    googleContactsImportWindow: OverlayWire<GoogleContactsImportWindowDefinitionData>;
  }
}
