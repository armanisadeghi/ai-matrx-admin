"use client";

import SocialCardWindow from "@/features/window-panels/windows/seo/SocialCardWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        const data = overlayData as
          Record<string, unknown> | null | undefined;
        const str = (key: string): string | undefined =>
          typeof data?.[key] === "string" ? (data[key] as string) : undefined;
        return (
          <SocialCardWindow
            isOpen
            onClose={() =>
              close()
            }
            initialUrl={str("url")}
            initialTitle={str("title")}
            initialDescription={str("description")}
            initialImage={str("image")}
            initialSiteName={str("siteName")}
            initialOgType={str("ogType")}
            initialCardType={str("cardType")}
          />
        );
}
