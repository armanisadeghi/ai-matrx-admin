"use client";

/**
 * CreateBrandWindow — the draggable WindowPanel around the canonical `BrandCreatePanel`, the same body
 * the /marketing/brands/new page renders. "Open full page" moves the person to that page. Open it
 * through `useOpenCreateBrandWindow()` (features/overlays/definitions/createBrandWindow.overlay).
 */

import { useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { WindowPanel } from "@ai-matrx/summon/window";
import { Button } from "@ai-matrx/design-system/controls";
import { BrandCreatePanel } from "@/features/marketing/components/brands/BrandCreatePanel";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import type { MarketingBrand } from "@/features/marketing/types";
import { emitCreateBrandEvent } from "./callbacks";

const OVERLAY_ID = "createBrandWindow";

export interface CreateBrandWindowProps {
  onClose: () => void;
  instanceId: string;
  callbackGroupId?: string | null;
}

export default function CreateBrandWindow({ onClose, instanceId, callbackGroupId }: CreateBrandWindowProps) {
  const router = useRouter();
  const pathname = usePathname();
  const openedAt = useRef(pathname);
  // A Smart Add door (or any navigation) leaves the page this window was opened on: the window goes with it.
  useEffect(() => {
    if (pathname !== openedAt.current) onClose();
  }, [pathname, onClose]);
  const lastBrandRef = useRef<MarketingBrand | null>(null);
  const groupRef = useRef(callbackGroupId);
  useEffect(() => {
    groupRef.current = callbackGroupId;
  }, [callbackGroupId]);

  // One window-close event, on unmount, for every close path (X, Esc, programmatic, success).
  useEffect(() => {
    return () => {
      emitCreateBrandEvent(groupRef.current, {
        type: "window-close",
        windowInstanceId: instanceId,
        lastBrand: lastBrandRef.current,
      });
    };
  }, [instanceId]);

  return (
    <WindowPanel
      title="Add brand"
      id={`create-brand-window-${instanceId}`}
      overlayId={OVERLAY_ID}
      minWidth={560}
      minHeight={520}
      width={720}
      height="86dvh"
      position="center"
      onClose={onClose}
      actionsRight={
        <Button
          variant="quiet"
          icon={<ExternalLink />}
          onClick={() => {
            router.push(marketingRoutes.brandsNew());
            onClose();
          }}
        >
          Open full page
        </Button>
      }
      bodyClassName="flex-1 min-h-0 overflow-hidden p-3"
    >
      <BrandCreatePanel
        onCreated={(brand) => {
          lastBrandRef.current = brand;
          emitCreateBrandEvent(callbackGroupId, { type: "created", windowInstanceId: instanceId, brand });
        }}
        onClose={onClose}
      />
    </WindowPanel>
  );
}
