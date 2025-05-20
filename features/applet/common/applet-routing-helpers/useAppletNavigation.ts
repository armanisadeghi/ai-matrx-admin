"use client";

import { useRouter } from "next/navigation";
import { AppletLayoutOption } from "@/types";
import { getAppletUrl, createAppletSearchParams } from "@/features/applet/common/applet-routing-helpers/applet-params";

interface AppletNavigationParams {
  slug: string;
  appletSlug: string;
  layoutType?: AppletLayoutOption;
  isPreview?: boolean;
  allowSubmit?: boolean;
}

export const useAppletNavigation = () => {
  const router = useRouter();
  
  /**
   * Navigate to an applet with the specified parameters
   */
  const navigateToApplet = (params: AppletNavigationParams) => {
    const url = getAppletUrl(params);
    router.push(url);
  };
  
  /**
   * Create a function that can be used as an onClick handler to navigate to an applet
   */
  const createAppletNavigationHandler = (params: AppletNavigationParams) => {
    return () => {
      navigateToApplet(params);
    };
  };

  return {
    navigateToApplet,
    createAppletNavigationHandler,
    getAppletUrl,
    createAppletSearchParams
  };
}; 