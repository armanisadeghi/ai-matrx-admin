
"use client";

import { AppletLayoutOption } from "@/types/customAppTypes";

interface AppletUrlParams {
  slug: string;
  appletSlug: string;
  layoutType?: AppletLayoutOption;
  isPreview?: boolean;
  allowSubmit?: boolean;
}

/**
 * Generates a URL for an applet with the specified cryptic parameters
 */
export const getAppletUrl = ({
  slug,
  appletSlug,
  layoutType,
  isPreview = false,
  allowSubmit = true
}: AppletUrlParams): string => {
  const baseUrl = `/apps/custom/${slug}/${appletSlug}`;
  const params = new URLSearchParams();
  
  if (layoutType) {
    params.set("lt", layoutType);
  }
  
  if (isPreview) {
    params.set("xp", "1");
  }
  
  if (!allowSubmit) {
    params.set("zs", "0");
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Creates a URLSearchParams object with applet parameters
 */
export const createAppletSearchParams = ({
  layoutType,
  isPreview = false,
  allowSubmit = true
}: Omit<AppletUrlParams, "slug" | "appletSlug">): URLSearchParams => {
  const params = new URLSearchParams();
  
  if (layoutType) {
    params.set("lt", layoutType);
  }
  
  if (isPreview) {
    params.set("xp", "1");
  }
  
  if (!allowSubmit) {
    params.set("zs", "0");
  }
  
  return params;
}; 