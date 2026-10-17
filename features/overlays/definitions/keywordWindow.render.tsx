"use client";

import KeywordWindow from "@/features/window-panels/windows/seo/KeywordWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const isOpen = true;
        const data = overlayData as
          Record<string, unknown> | null | undefined;
        if (!isOpen) return null;
        const str = (key: string): string | undefined =>
          typeof data?.[key] === "string" && data[key]
            ? (data[key] as string)
            : undefined;
        return (
          <KeywordWindow
            isOpen
            onClose={() =>
              close()
            }
            initialPhrase={str("phrase")}
            initialTargetPhrase={str("targetPhrase")}
            initialHistory={
              Array.isArray(data?.history)
                ? data.history.filter(
                    (entry): entry is string => typeof entry === "string",
                  )
                : undefined
            }
            initialOrganizationId={str("organizationId")}
            initialSiteId={str("siteId")}
            initialPageId={str("pageId")}
            initialBrandId={str("brandId")}
            initialTab={str("activeTab")}
          />
        );
}
