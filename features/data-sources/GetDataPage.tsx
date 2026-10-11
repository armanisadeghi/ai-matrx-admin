"use client";

// features/data-sources/GetDataPage.tsx — "Get data" as a page: the same panel a board tile shows
// (`board/data-fetch/GetDataBody`), opened from anywhere that offers it (a pasted address in chat).
// `?source=<key>&field=<name>&value=<text>` prefills the source and its first field; nothing is
// fetched until the person presses Fetch. When the table exists the page opens it.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { GetDataBody } from "@/features/board/data-fetch/GetDataBody";
import { getDataSource } from "@/features/board/data-fetch/tile-meta";
import type { NodeSource } from "@/features/board/board/document";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";

export function GetDataPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [source, setSource] = useState<NodeSource>(() => {
    const sourceKey = params.get("source") ?? undefined;
    const field = params.get("field") ?? "url";
    const value = params.get("value") ?? undefined;
    return getDataSource({ sourceKey, values: sourceKey && value ? { [field]: value } : undefined });
  });
  return (
    <>
      <RecordPageHeader backHref="/data" record={{ name: "Get data" }} />
      <div className="h-full pt-[var(--shell-header-h)]" data-get-data-page="">
        <GetDataBody
          tileId="get-data-page"
          source={source}
          onSource={(next) => {
            if (next.kind === "entity" && next.id) {
              router.replace(`/data/${next.id}`);
              return;
            }
            setSource(next);
          }}
        />
      </div>
    </>
  );
}
