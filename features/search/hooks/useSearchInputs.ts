"use client";

/**
 * useSearchInputs — the box understands what it was given (universal search).
 *
 * Words go to the keyword form (`useScraperKeywordSearchForm`, the tabs).
 * Everything else has ONE obvious action, run here and shown in place of the
 * tab results:
 *
 *   @handle          → one-click platform chips ("Look up @nike on: …")
 *   profile link     → profile lookup     (POST /search-kinds/social, mode profile)
 *   post link        → the post's page read cleanly + "Open on <platform>"
 *   any other link   → the page read cleanly (the scraper's quick scrape)
 *   image (drop, paste, attach, or an image address)
 *                    → upload via the files handler → file_id
 *                    → search by image  (POST /search-kinds/image)
 *
 * Nothing here runs on a keystroke: every action is an explicit submit, a
 * chip press, or a dropped image.
 */

import { useRef, useState } from "react";
import { useBackendApi } from "@/hooks/useBackendApi";
import { useFileUpload } from "@/features/files/handler/hooks/useFileUpload";
import { useScraperApi } from "@/features/scraper/hooks/useScraperApi";
import type { UseScraperKeywordSearchFormReturn } from "@/features/scraper/hooks/useScraperKeywordSearchForm";
import type { SocialPlatform } from "@/features/marketing/social/types";
import {
  runSearchDoor,
  SEARCH_DOORS,
  socialDoorBody,
} from "@/features/search/service";
import type { SearchInputMode, SearchOutcome } from "@/features/search/types";
import { inputModeOf, understandInput } from "@/features/search/input-understanding";

/** Posts fetched with a profile — a cap, since each record costs points. */
export const PROFILE_POST_COUNT = 10;

export type DoorPhase = "working" | "done" | "error";

export type SearchSpecialView =
  | { type: "handle"; handle: string }
  | {
      type: "profile";
      platform: SocialPlatform;
      handle: string;
      url: string | null;
      phase: DoorPhase;
      outcome: SearchOutcome | null;
      error: string | null;
    }
  | { type: "read"; url: string; platform: SocialPlatform | null }
  | {
      type: "image";
      /** A local preview of what was searched (object URL or the image address). */
      previewUrl: string | null;
      name: string;
      phase: "uploading" | "working" | "done" | "error";
      outcome: SearchOutcome | null;
      error: string | null;
    };

export interface UseSearchInputsReturn {
  /** What the box holds right now, as understood (drives the quiet hint). */
  pendingMode: SearchInputMode;
  /** The action on screen instead of tab results, if any. */
  special: SearchSpecialView | null;
  /** The input mode of what is on screen (words when tab results show). */
  activeMode: SearchInputMode;
  /** Submit the box: words search the tab, anything else runs its action. */
  submit: () => void;
  lookUpProfile: (platform: SocialPlatform, handle: string, url?: string | null) => void;
  readPage: (url: string, platform?: SocialPlatform | null) => void;
  searchByImage: (file: File) => void;
  clearSpecial: () => void;
  scraper: ReturnType<typeof useScraperApi>;
}

export function useSearchInputs(
  form: UseScraperKeywordSearchFormReturn,
  hooks: { onSubmitted?: (query: string) => void } = {},
): UseSearchInputsReturn {
  const { post } = useBackendApi();
  const { upload } = useFileUpload();
  const scraper = useScraperApi();
  const [special, setSpecial] = useState<SearchSpecialView | null>(null);
  const controller = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);

  const fresh = () => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    return c;
  };

  const releasePreview = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  };

  const clearSpecial = () => {
    controller.current?.abort();
    releasePreview();
    setSpecial(null);
  };

  const lookUpProfile = (
    platform: SocialPlatform,
    handle: string,
    url: string | null = null,
  ) => {
    const c = fresh();
    form.reset();
    setSpecial({
      type: "profile",
      platform,
      handle,
      url,
      phase: "working",
      outcome: null,
      error: null,
    });
    void runSearchDoor({
      post,
      endpoint: SEARCH_DOORS.social.endpoint,
      expectKinds: SEARCH_DOORS.social.kinds,
      body: socialDoorBody({
        mode: "profile",
        platform,
        handle,
        url: url ?? undefined,
        count: PROFILE_POST_COUNT,
      }),
      signal: c.signal,
    }).then(
      (outcome) => {
        if (c.signal.aborted) return;
        setSpecial((prev) =>
          prev?.type === "profile" ? { ...prev, phase: "done", outcome } : prev,
        );
      },
      (err: unknown) => {
        if (c.signal.aborted) return;
        setSpecial((prev) =>
          prev?.type === "profile"
            ? { ...prev, phase: "error", error: messageOf(err) }
            : prev,
        );
      },
    );
  };

  const readPage = (url: string, platform: SocialPlatform | null = null) => {
    fresh();
    form.reset();
    scraper.reset();
    setSpecial({ type: "read", url, platform });
    void scraper.scrapeUrl(url);
  };

  const runImage = async (
    source: { kind: "file"; file: File } | { kind: "external_url"; url: string },
    previewUrl: string | null,
    name: string,
  ) => {
    const c = fresh();
    form.reset();
    setSpecial({
      type: "image",
      previewUrl,
      name,
      phase: "uploading",
      outcome: null,
      error: null,
    });
    const patch = (next: Partial<Extract<SearchSpecialView, { type: "image" }>>) =>
      setSpecial((prev) => (prev?.type === "image" ? { ...prev, ...next } : prev));
    try {
      const uploaded = await upload(source, { folderPath: "Search/Images" });
      if (c.signal.aborted) return;
      patch({ phase: "working" });
      const outcome = await runSearchDoor({
        post,
        endpoint: SEARCH_DOORS.image.endpoint,
        expectKinds: SEARCH_DOORS.image.kinds,
        body: { file_id: uploaded.fileId },
        signal: c.signal,
      });
      if (c.signal.aborted) return;
      patch({ phase: "done", outcome });
    } catch (err: unknown) {
      if (c.signal.aborted) return;
      patch({ phase: "error", error: messageOf(err) });
    }
  };

  const searchByImage = (file: File) => {
    releasePreview();
    objectUrl.current = URL.createObjectURL(file);
    void runImage({ kind: "file", file }, objectUrl.current, file.name || "Image");
  };

  const submit = () => {
    const text = form.keywords.trim();
    const understood = understandInput(text);
    if (understood.mode !== "words") hooks.onSubmitted?.(text);
    switch (understood.mode) {
      case "words":
        clearSpecial();
        void form.handleSearch();
        return;
      case "handle":
        fresh();
        form.reset();
        setSpecial({ type: "handle", handle: understood.handle });
        return;
      case "profile":
        lookUpProfile(understood.platform, understood.handle, understood.url);
        return;
      case "post":
        readPage(understood.url, understood.platform);
        return;
      case "link":
        readPage(understood.url);
        return;
      case "image":
        releasePreview();
        void runImage(
          { kind: "external_url", url: understood.url },
          understood.url,
          understood.url,
        );
        return;
    }
  };

  const activeMode: SearchInputMode = !special
    ? "words"
    : special.type === "read"
      ? special.platform
        ? "post"
        : "link"
      : special.type;

  return {
    pendingMode: inputModeOf(form.keywords),
    special,
    activeMode,
    submit,
    lookUpProfile,
    readPage,
    searchByImage,
    clearSpecial,
    scraper,
  };
}

function messageOf(err: unknown): string {
  return err instanceof Error && err.message
    ? err.message
    : "That didn't work. Try again in a moment.";
}
