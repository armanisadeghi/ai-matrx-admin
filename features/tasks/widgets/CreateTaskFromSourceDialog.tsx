"use client";

/**
 * PendingSourceBridge — mounted once in Providers.
 *
 * Watches `tasksUi.pendingSource`. Whenever a widget stages a source for a
 * new task, this component opens the (non-blocking, draggable) Task Quick
 * Create window via `openOverlay` and immediately clears the staged source
 * so the overlay owns the state from here on.
 *
 * Named for back-compat with the former `CreateTaskFromSourceDialog` import
 * — the export preserves the old name.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  clearPendingSource,
  selectPendingSource,
} from "@/features/tasks/redux/taskUiSlice";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

export default function CreateTaskFromSourceDialog() {
  const dispatch = useAppDispatch();
  const source = useAppSelector(selectPendingSource);
  const seenSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!source) {
      seenSignatureRef.current = null;
      return;
    }

    const signature = `${source.entity_type ?? ""}:${source.entity_id ?? ""}:${
      source.label ?? ""
    }:${source.prePopulate?.title ?? ""}`;
    if (signature === seenSignatureRef.current) return;
    seenSignatureRef.current = signature;

    dispatch(
      openOverlay({
        overlayId: "taskQuickCreateWindow",
        data: {
          source:
            source.entity_type && source.entity_id
              ? {
                  entity_type: source.entity_type,
                  entity_id: source.entity_id,
                  label: source.label,
                  metadata: source.metadata,
                }
              : undefined,
          prePopulate: source.prePopulate,
        },
      }),
    );
    dispatch(clearPendingSource());
  }, [source, dispatch]);

  return null;
}
