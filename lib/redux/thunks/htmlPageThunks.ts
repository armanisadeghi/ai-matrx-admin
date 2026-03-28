// lib/redux/thunks/htmlPageThunks.ts
//
// Async thunks for HTML page CRUD operations.
//
// Each write thunk coordinates two operations:
//   1. Write to the HTML Supabase project via /api/html-pages
//   2. Register / update the cx_artifact record via /api/artifacts (artifact thunks)
//
// This two-step pattern keeps the html_pages table as the content store
// while cx_artifact is the tracking layer.

import { createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState, AppDispatch } from "@/lib/redux/store";
import {
  upsertPage,
  removePage,
  setListStatus,
  setActivePageId,
  setPageOperationStatus,
  clearPageOperationStatus,
} from "@/lib/redux/slices/htmlPagesSlice";
import {
  registerArtifactThunk,
  updateArtifactThunk,
  updateArtifactStatusThunk,
  archiveArtifactThunk,
} from "@/lib/redux/thunks/artifactThunks";
import {
  selectOrganizationId,
  selectWorkspaceId,
  selectProjectId,
  selectTaskId,
} from "@/lib/redux/slices/appContextSlice";
import type { HtmlPageRecord } from "@/features/artifacts/types";

// ── API helper ────────────────────────────────────────────────────────────────

async function callHtmlPagesApi(
  action: string,
  params: Record<string, unknown>,
): Promise<{ data?: unknown; error?: string }> {
  const res = await fetch("/api/html-pages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Request failed");
    return { error: text };
  }
  return { data: await res.json() };
}

// ── Payload types ─────────────────────────────────────────────────────────────

export interface CreateHtmlPageThunkPayload {
  htmlContent: string;
  metaTitle: string;
  metaDescription?: string;
  metaFields?: {
    metaKeywords?: string;
    ogImage?: string;
    canonicalUrl?: string;
    isIndexable?: boolean;
  };
  // Source tracking
  sourceMessageId?: string;
  sourceConversationId?: string;
  // Artifact description
  description?: string;
}

export interface UpdateHtmlPageThunkPayload {
  pageId: string;
  artifactId?: string;
  htmlContent: string;
  metaTitle: string;
  metaDescription?: string;
  metaFields?: {
    metaKeywords?: string;
    ogImage?: string;
    canonicalUrl?: string;
    isIndexable?: boolean;
  };
}

export interface CreateHtmlPageResult {
  pageId: string;
  url: string;
  artifactId: string;
}

// ── createHtmlPageThunk ───────────────────────────────────────────────────────

/**
 * Create a new HTML page and register the corresponding cx_artifact.
 *
 * Steps:
 *   1. POST /api/html-pages { action: 'create', ...contentFields, contextMetadata }
 *   2. dispatch registerArtifactThunk with the result
 *   3. Store both in Redux
 *   4. dispatch setActivePageId so the editor bridge knows the new ID
 */
export const createHtmlPageThunk = createAsyncThunk<
  CreateHtmlPageResult,
  CreateHtmlPageThunkPayload,
  { state: RootState; dispatch: AppDispatch }
>("htmlPages/create", async (payload, { getState, dispatch }) => {
  const state = getState();
  const organizationId = selectOrganizationId(state);
  const workspaceId = selectWorkspaceId(state);
  const projectId = selectProjectId(state);
  const taskId = selectTaskId(state);

  const { data, error } = await callHtmlPagesApi("create", {
    htmlContent: payload.htmlContent,
    metaTitle: payload.metaTitle,
    metaDescription: payload.metaDescription ?? "",
    metaFields: payload.metaFields ?? {},
    // Context for html_pages.context_metadata column
    sourceMessageId: payload.sourceMessageId,
    sourceConversationId: payload.sourceConversationId,
    contextMetadata: {
      organization_id: organizationId,
      workspace_id: workspaceId,
      project_id: projectId,
      task_id: taskId,
    },
  });

  if (error || !data) {
    throw new Error(error ?? "Failed to create HTML page");
  }

  const apiResult = data as {
    success: boolean;
    pageId: string;
    url: string;
    metaTitle: string;
    metaDescription: string;
    isIndexable: boolean;
    createdAt: string;
  };

  // Register in the artifact system
  let artifactId = "";
  if (payload.sourceMessageId && payload.sourceConversationId) {
    try {
      const artifact = await dispatch(
        registerArtifactThunk({
          messageId: payload.sourceMessageId,
          conversationId: payload.sourceConversationId,
          artifactType: "html_page",
          title: payload.metaTitle,
          description: payload.description ?? payload.metaDescription,
          externalSystem: "html_pages",
          externalId: apiResult.pageId,
          externalUrl: apiResult.url,
          organizationId,
          workspaceId,
          projectId,
          taskId,
          metadata: {
            isIndexable: payload.metaFields?.isIndexable ?? false,
          },
        }),
      ).unwrap();
      artifactId = artifact.id;
    } catch (artifactErr) {
      // Artifact registration failure is non-fatal — page was created successfully
      console.error(
        "[htmlPageThunks] Failed to register artifact:",
        artifactErr,
      );
    }
  }

  // Store page in Redux
  const pageRecord: HtmlPageRecord = {
    id: apiResult.pageId,
    metaTitle: apiResult.metaTitle,
    metaDescription: apiResult.metaDescription,
    metaKeywords: payload.metaFields?.metaKeywords ?? null,
    ogImage: payload.metaFields?.ogImage ?? null,
    canonicalUrl: payload.metaFields?.canonicalUrl ?? null,
    isIndexable: apiResult.isIndexable,
    createdAt: apiResult.createdAt,
    url: apiResult.url,
    artifactId: artifactId || null,
    sourceMessageId: payload.sourceMessageId ?? null,
  };

  dispatch(upsertPage(pageRecord));
  dispatch(setActivePageId(apiResult.pageId));

  return { pageId: apiResult.pageId, url: apiResult.url, artifactId };
});

// ── updateHtmlPageThunk ───────────────────────────────────────────────────────

/**
 * Update an existing HTML page and sync the cx_artifact record.
 */
export const updateHtmlPageThunk = createAsyncThunk<
  { pageId: string; url: string },
  UpdateHtmlPageThunkPayload,
  { state: RootState; dispatch: AppDispatch }
>("htmlPages/update", async (payload, { getState, dispatch }) => {
  const tempId = payload.pageId;
  dispatch(setPageOperationStatus({ id: tempId, status: "loading" }));

  const { data, error } = await callHtmlPagesApi("update", {
    pageId: payload.pageId,
    htmlContent: payload.htmlContent,
    metaTitle: payload.metaTitle,
    metaDescription: payload.metaDescription ?? "",
    metaFields: payload.metaFields ?? {},
  });

  if (error || !data) {
    dispatch(setPageOperationStatus({ id: tempId, status: "failed" }));
    throw new Error(error ?? "Failed to update HTML page");
  }

  const apiResult = data as {
    success: boolean;
    pageId: string;
    url: string;
    metaTitle: string;
    metaDescription: string;
    isIndexable: boolean;
    updatedAt: string;
  };

  // Update page in Redux
  const existing = getState().htmlPages.pages[payload.pageId];
  dispatch(
    upsertPage({
      ...(existing ?? {}),
      id: apiResult.pageId,
      metaTitle: apiResult.metaTitle,
      metaDescription: apiResult.metaDescription,
      metaKeywords:
        payload.metaFields?.metaKeywords ?? existing?.metaKeywords ?? null,
      ogImage: payload.metaFields?.ogImage ?? existing?.ogImage ?? null,
      canonicalUrl:
        payload.metaFields?.canonicalUrl ?? existing?.canonicalUrl ?? null,
      isIndexable: apiResult.isIndexable,
      url: apiResult.url,
      artifactId: existing?.artifactId ?? null,
      sourceMessageId: existing?.sourceMessageId ?? null,
      createdAt: existing?.createdAt ?? apiResult.updatedAt,
    } as HtmlPageRecord),
  );

  // Update the artifact record if we have one
  if (payload.artifactId) {
    try {
      await dispatch(
        updateArtifactThunk({
          id: payload.artifactId,
          title: payload.metaTitle,
          description: payload.metaDescription,
          externalUrl: apiResult.url,
          status: "published",
        }),
      ).unwrap();
    } catch (artifactErr) {
      console.error("[htmlPageThunks] Failed to update artifact:", artifactErr);
    }
  }

  dispatch(setPageOperationStatus({ id: tempId, status: "succeeded" }));
  return { pageId: apiResult.pageId, url: apiResult.url };
});

// ── deleteHtmlPageThunk ───────────────────────────────────────────────────────

/**
 * Delete an HTML page and archive the corresponding artifact.
 */
export const deleteHtmlPageThunk = createAsyncThunk<
  void,
  { pageId: string; artifactId?: string },
  { state: RootState; dispatch: AppDispatch }
>("htmlPages/delete", async ({ pageId, artifactId }, { dispatch }) => {
  dispatch(setPageOperationStatus({ id: pageId, status: "loading" }));

  const { error } = await callHtmlPagesApi("delete", { pageId });

  if (error) {
    dispatch(setPageOperationStatus({ id: pageId, status: "failed" }));
    throw new Error(error);
  }

  dispatch(removePage(pageId));

  // Archive (soft-delete) the artifact
  if (artifactId) {
    try {
      await dispatch(archiveArtifactThunk(artifactId)).unwrap();
    } catch (artifactErr) {
      console.error(
        "[htmlPageThunks] Failed to archive artifact:",
        artifactErr,
      );
    }
  }
});

// ── fetchUserPagesThunk ───────────────────────────────────────────────────────

/**
 * Fetch all HTML pages for the current user.
 * Used by the CMS list view.
 */
export const fetchUserPagesThunk = createAsyncThunk<
  HtmlPageRecord[],
  void,
  { state: RootState; dispatch: AppDispatch }
>("htmlPages/fetchAll", async (_, { dispatch }) => {
  dispatch(setListStatus({ status: "loading" }));

  const { data, error } = await callHtmlPagesApi("list", {});

  if (error || !data) {
    dispatch(
      setListStatus({
        status: "failed",
        error: error ?? "Failed to load pages",
      }),
    );
    throw new Error(error ?? "Failed to load pages");
  }

  const pages = ((data as { pages: unknown[] }).pages ?? []).map(
    (p: unknown) => {
      const page = p as Record<string, unknown>;
      return {
        id: page.id as string,
        metaTitle: page.meta_title as string,
        metaDescription: (page.meta_description as string | null) ?? null,
        metaKeywords: (page.meta_keywords as string | null) ?? null,
        ogImage: (page.og_image as string | null) ?? null,
        canonicalUrl: (page.canonical_url as string | null) ?? null,
        isIndexable: (page.is_indexable as boolean) ?? false,
        createdAt: page.created_at as string,
        url: page.url as string,
        artifactId: (page.artifact_id as string | null) ?? null,
        sourceMessageId: (page.source_message_id as string | null) ?? null,
      } satisfies HtmlPageRecord;
    },
  );

  dispatch(setListStatus({ status: "succeeded" }));

  // Import setPages dynamically to avoid circular import risk
  const { setPages } = await import("@/lib/redux/slices/htmlPagesSlice");
  dispatch(setPages(pages));

  return pages;
});
