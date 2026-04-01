/**
 * Instance Resource Selectors
 *
 * Stable empty constants are hoisted at module level so selectors always return
 * the same reference when the instance has no resources — preventing spurious
 * re-renders from inline `?? []` or new `Object.values()` arrays every call.
 *
 * Derived array selectors are memoized with createSelector so they only
 * rebuild when the underlying resource map actually changes.
 */

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { ManagedResource } from "@/features/agents/types";

const EMPTY_RESOURCES: ManagedResource[] = [];
const EMPTY_PAYLOADS: Array<Record<string, unknown>> = [];

/**
 * All resources for an instance, sorted by sortOrder.
 */
export const selectInstanceResources = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceResources.byInstanceId[instanceId],
    (resources) => {
      if (!resources) return EMPTY_RESOURCES;
      const arr = Object.values(resources).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      return arr.length === 0 ? EMPTY_RESOURCES : arr;
    },
  );

/**
 * A single resource by ID.
 */
export const selectResource =
  (instanceId: string, resourceId: string) =>
  (state: RootState): ManagedResource | undefined =>
    state.instanceResources.byInstanceId[instanceId]?.[resourceId];

/**
 * Resources that are ready for the API call.
 */
export const selectReadyResources = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceResources.byInstanceId[instanceId],
    (resources) => {
      if (!resources) return EMPTY_RESOURCES;
      const arr = Object.values(resources)
        .filter((r) => r.status === "ready")
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return arr.length === 0 ? EMPTY_RESOURCES : arr;
    },
  );

/**
 * Resources that are still resolving (pending or in-progress).
 */
export const selectPendingResources = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceResources.byInstanceId[instanceId],
    (resources) => {
      if (!resources) return EMPTY_RESOURCES;
      const arr = Object.values(resources).filter(
        (r) => r.status === "pending" || r.status === "resolving",
      );
      return arr.length === 0 ? EMPTY_RESOURCES : arr;
    },
  );

/**
 * Whether all resources are resolved (ready or error — nothing pending).
 */
export const selectAllResourcesResolved =
  (instanceId: string) =>
  (state: RootState): boolean => {
    const resources = state.instanceResources.byInstanceId[instanceId];
    if (!resources) return true;
    return Object.values(resources).every(
      (r) => r.status === "ready" || r.status === "error",
    );
  };

/**
 * Build the ContentBlock[] array for the API payload.
 * Uses finalPayload if set, otherwise constructs from source/options.
 */
export const selectResourcePayloads = (instanceId: string) =>
  createSelector(
    (state: RootState) => state.instanceResources.byInstanceId[instanceId],
    (resources) => {
      if (!resources) return EMPTY_PAYLOADS;

      const arr = Object.values(resources)
        .filter((r) => r.status === "ready")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => {
          if (r.finalPayload) return r.finalPayload;

          const payload: Record<string, unknown> = { type: r.blockType };
          const content = r.userEdited ? r.editedContent : r.source;

          if (r.options.keepFresh) payload.keep_fresh = true;
          if (r.options.editable) payload.editable = true;
          if (!r.options.convertToText) payload.convert_to_text = false;
          if (r.options.optionalContext) payload.optional_context = true;
          if (r.options.template) payload.template = r.options.template;

          switch (r.blockType) {
            case "text":
              payload.text = content;
              break;
            case "image":
            case "audio":
            case "video":
            case "document":
              if (typeof content === "string") {
                payload.url = content;
              } else {
                Object.assign(payload, content);
              }
              break;
            case "youtube_video":
              payload.url = content;
              break;
            case "input_webpage":
              payload.urls = Array.isArray(content) ? content : [content];
              break;
            case "input_notes":
              payload.note_ids = Array.isArray(content) ? content : [content];
              break;
            case "input_task":
              payload.task_ids = Array.isArray(content) ? content : [content];
              break;
            case "input_table":
              payload.bookmarks = content;
              break;
            case "input_list":
              payload.bookmarks = content;
              break;
            case "input_data":
              payload.refs = content;
              break;
          }

          return payload;
        });

      return arr.length === 0 ? EMPTY_PAYLOADS : arr;
    },
  );
