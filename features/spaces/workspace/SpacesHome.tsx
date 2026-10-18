"use client";

// features/spaces/workspace/SpacesHome.tsx — /spaces opens the last Space visited, else the first one;
// with no Spaces yet it offers a new page or the library's sample template (Projects & Tasks).

import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { FileText, LayoutTemplate, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { LAST_SPACE_KEY, useSpaces } from "../state/SpacesProvider";
import { LoadAccessState } from "./LoadAccessState";

export function SpacesHome() {
  const router = useRouter();
  const {
    ready,
    byId,
    childrenOf,
    loadError,
    access,
    retryLoad,
    createSpace,
    sample,
  } = useSpaces();
  const first = childrenOf(null)[0]?.id ?? null;
  // ONE hop, once. The tree changes while a template installs (every page it makes re-renders this), and
  // a hop on each change sent the person back to their last page after "Use template" had already opened
  // the new one (review 2026-10-17). Once anything has moved the address off /spaces, never hop again.
  const hopped = useRef(false);
  useEffect(() => {
    if (!ready || hopped.current) return;
    if (window.location.pathname !== "/spaces") {
      hopped.current = true;
      return;
    }
    let last: string | null = null;
    try {
      last = window.localStorage.getItem(LAST_SPACE_KEY);
    } catch {
      last = null;
    }
    const target = last && byId.has(last) ? last : first;
    // Keep the address's query (e.g. ?org=) so a link that names an organization still names it after the hop.
    if (!target) return;
    hopped.current = true;
    router.replace(`/spaces/${target}${window.location.search}`);
  }, [ready, first, byId, router]);
  if (!ready || first) return <div className="spaces-page" aria-busy="true" />;
  if (access || loadError)
    return <LoadAccessState access={access ?? "fault"} onRetry={retryLoad} />;
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon={<FileText />}
        title="No pages yet"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => void createSpace(null)}
            >
              New page
            </Button>
            <Button
              variant="outline"
              icon={<LayoutTemplate size={16} />}
              disabled={sample.adding}
              onClick={() => void sample.add()}
            >
              {sample.adding ? `Adding… ${sample.progress ?? ""}` : "Add a sample"}
            </Button>
          </div>
        }
      />
    </div>
  );
}
