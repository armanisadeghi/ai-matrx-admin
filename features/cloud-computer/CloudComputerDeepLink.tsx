"use client";

/**
 * The landing for a Cloud Computer notice (aidream `cloud_computer_files.HELD_DEEP_LINK`,
 * `/chat?cloudComputer=files`): opens the Computer tab, where the held Cloud folder
 * deletes are shown with their two choices, then strips the parameter so a refresh
 * never re-opens the tab under someone who closed it. Mounted globally
 * (`app/DeferredSingletonCore.tsx`), like `CloudBrowserHandoffDeepLink`.
 */

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { useOpenCloudComputerCanvas } from "./useOpenCloudComputerCanvas";

export const CLOUD_COMPUTER_DEEP_LINK_PARAM = "cloudComputer";

function CloudComputerDeepLinkInner(): null {
  const params = useSearchParams();
  const pathname = usePathname();
  const openComputer = useOpenCloudComputerCanvas();
  const handled = useRef(false);
  const target = params.get(CLOUD_COMPUTER_DEEP_LINK_PARAM);

  useEffect(() => {
    if (!target || handled.current) return;
    handled.current = true;
    openComputer();
    const next = new URLSearchParams(params.toString());
    next.delete(CLOUD_COMPUTER_DEEP_LINK_PARAM);
    const query = next.toString();
    replaceAddressWithoutNavigating(query ? `${pathname}?${query}` : pathname);
  }, [target, openComputer, params, pathname]);

  return null;
}

export function CloudComputerDeepLink() {
  return (
    <Suspense fallback={null}>
      <CloudComputerDeepLinkInner />
    </Suspense>
  );
}

export default CloudComputerDeepLink;
