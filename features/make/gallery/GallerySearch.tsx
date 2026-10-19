"use client";

// features/make/gallery/GallerySearch.tsx — the public gallery's search box (/templates?q=…; GALLERY-UX, ADVERSARIAL-2 #2).
//
// The results are SERVER-rendered from `?q=` (publicGallery.ts searchGallery: the one template search), so a
// search is a link and a crawler reads it. This island only moves the address: Enter submits the form (works
// without JavaScript), typing replaces `?q=` after a short pause so the results follow the words.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { SearchField } from "@ai-matrx/design-system/controls";

import { searchHref } from "./publicGallery";

/** How long typing pauses before the results follow (ms). */
const FOLLOW_MS = 300;

export function GallerySearch({ path, query, placeholder }: { path: string; query: string; placeholder: string }) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [pending, startTransition] = useTransition();
  const sent = useRef(query);
  useEffect(() => {
    if (value.trim() === sent.current.trim()) return;
    const timer = window.setTimeout(() => {
      sent.current = value;
      startTransition(() => router.replace(searchHref(path, value), { scroll: false }));
    }, FOLLOW_MS);
    return () => window.clearTimeout(timer);
  }, [value, path, router]);
  return (
    <form action={path} method="get" role="search" className="w-full sm:max-w-md" data-public-templates-search="" aria-busy={pending || undefined}>
      <SearchField
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label="Search templates"
        autoComplete="off"
        enterKeyHint="search"
        filled
        className="w-full"
      />
    </form>
  );
}
