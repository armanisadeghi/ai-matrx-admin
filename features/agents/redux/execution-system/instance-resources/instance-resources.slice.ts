/**
 * Instance Resources Slice
 *
 * Manages the content blocks being assembled for an instance's user_input.
 * Resources are things the user attaches: files, images, URLs, notes, tables, etc.
 *
 * Each resource has a lifecycle:
 *   pending → resolving → ready (or error)
 *
 * Some resources need client-side processing (e.g., scraping a URL and letting
 * the user preview/edit the result). The status field tracks this.
 *
 * Resources go into the `user_input` ContentBlock[] — the model sees them
 * immediately. This is distinct from instanceContext (deferred, model requests
 * via ctx_get).
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ManagedResource,
  ResourceBlockType,
  ResourceOptions,
  ResourceStatus,
} from "@/features/agents/types";
import { generateResourceId } from "../utils";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// State
// =============================================================================

export interface InstanceResourcesState {
  byInstanceId: Record<string, Record<string, ManagedResource>>;
}

const initialState: InstanceResourcesState = {
  byInstanceId: {},
};

// =============================================================================
// Default options
// =============================================================================

const defaultOptions: ResourceOptions = {
  keepFresh: false,
  editable: false,
  convertToText: true,
  optionalContext: false,
};

// =============================================================================
// Slice
// =============================================================================

const instanceResourcesSlice = createSlice({
  name: "instanceResources",
  initialState,
  reducers: {
    /**
     * Initialize resources for a new instance.
     */
    initInstanceResources(
      state,
      action: PayloadAction<{ instanceId: string }>,
    ) {
      state.byInstanceId[action.payload.instanceId] = {};
    },

    /**
     * Add a new resource to an instance.
     */
    addResource(
      state,
      action: PayloadAction<{
        instanceId: string;
        blockType: ResourceBlockType;
        source: unknown;
        options?: Partial<ResourceOptions>;
        resourceId?: string;
      }>,
    ) {
      const {
        instanceId,
        blockType,
        source,
        options = {},
        resourceId = generateResourceId(),
      } = action.payload;

      const resources = state.byInstanceId[instanceId];
      if (resources) {
        const existingCount = Object.keys(resources).length;
        resources[resourceId] = {
          resourceId,
          blockType,
          source,
          preview: null,
          status: "pending",
          errorMessage: null,
          userEdited: false,
          editedContent: null,
          options: { ...defaultOptions, ...options },
          finalPayload: null,
          sortOrder: existingCount,
        };
      }
    },

    /**
     * Update resource status (lifecycle transition).
     */
    setResourceStatus(
      state,
      action: PayloadAction<{
        instanceId: string;
        resourceId: string;
        status: ResourceStatus;
        errorMessage?: string;
      }>,
    ) {
      const { instanceId, resourceId, status, errorMessage } = action.payload;
      const resource = state.byInstanceId[instanceId]?.[resourceId];
      if (resource) {
        resource.status = status;
        resource.errorMessage = errorMessage ?? null;
      }
    },

    /**
     * Set the client-resolved preview for a resource.
     */
    setResourcePreview(
      state,
      action: PayloadAction<{
        instanceId: string;
        resourceId: string;
        preview: unknown;
      }>,
    ) {
      const { instanceId, resourceId, preview } = action.payload;
      const resource = state.byInstanceId[instanceId]?.[resourceId];
      if (resource) {
        resource.preview = preview;
        resource.status = "ready";
      }
    },

    /**
     * Mark a resource as user-edited and store the edited content.
     */
    setResourceEditedContent(
      state,
      action: PayloadAction<{
        instanceId: string;
        resourceId: string;
        content: unknown;
      }>,
    ) {
      const { instanceId, resourceId, content } = action.payload;
      const resource = state.byInstanceId[instanceId]?.[resourceId];
      if (resource) {
        resource.userEdited = true;
        resource.editedContent = content;
      }
    },

    /**
     * Set the final API payload for a resource.
     * This is the ContentBlock that goes into user_input.
     */
    setResourcePayload(
      state,
      action: PayloadAction<{
        instanceId: string;
        resourceId: string;
        payload: Record<string, unknown>;
      }>,
    ) {
      const { instanceId, resourceId, payload } = action.payload;
      const resource = state.byInstanceId[instanceId]?.[resourceId];
      if (resource) {
        resource.finalPayload = payload;
      }
    },

    /**
     * Update resource options (keepFresh, editable, etc.).
     */
    updateResourceOptions(
      state,
      action: PayloadAction<{
        instanceId: string;
        resourceId: string;
        options: Partial<ResourceOptions>;
      }>,
    ) {
      const { instanceId, resourceId, options } = action.payload;
      const resource = state.byInstanceId[instanceId]?.[resourceId];
      if (resource) {
        Object.assign(resource.options, options);
      }
    },

    /**
     * Remove a resource from an instance.
     */
    removeResource(
      state,
      action: PayloadAction<{
        instanceId: string;
        resourceId: string;
      }>,
    ) {
      const { instanceId, resourceId } = action.payload;
      const resources = state.byInstanceId[instanceId];
      if (resources) {
        delete resources[resourceId];
      }
    },

    /**
     * Reorder resources.
     */
    reorderResources(
      state,
      action: PayloadAction<{
        instanceId: string;
        orderedIds: string[];
      }>,
    ) {
      const { instanceId, orderedIds } = action.payload;
      const resources = state.byInstanceId[instanceId];
      if (resources) {
        orderedIds.forEach((id, index) => {
          if (resources[id]) {
            resources[id].sortOrder = index;
          }
        });
      }
    },

    /** Remove all resources from an instance (keep the registry entry). Used after send. */
    clearAllResources(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        state.byInstanceId[action.payload] = {};
      }
    },

    removeInstanceResources(state, action: PayloadAction<string>) {
      delete state.byInstanceId[action.payload];
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      delete state.byInstanceId[action.payload];
    });
  },
});

export const {
  initInstanceResources,
  addResource,
  setResourceStatus,
  setResourcePreview,
  setResourceEditedContent,
  setResourcePayload,
  updateResourceOptions,
  removeResource,
  reorderResources,
  clearAllResources,
  removeInstanceResources,
} = instanceResourcesSlice.actions;

export default instanceResourcesSlice.reducer;
