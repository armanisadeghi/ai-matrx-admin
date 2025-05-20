"use client";

import React from "react";
import Link from "next/link";
import { AppletLayoutOption } from "@/types";
import { getAppletUrl } from "@/features/applet/common/applet-routing-helpers/applet-params";
import { useAppletNavigation } from "@/features/applet/common/applet-routing-helpers/useAppletNavigation";

interface AppletNavButtonProps {
  slug: string;
  appletSlug: string;
  layoutType?: AppletLayoutOption;
  isPreview?: boolean;
  allowSubmit?: boolean;
  className?: string;
  children: React.ReactNode;
  useLink?: boolean;
}

export const AppletNavButton = ({
  slug,
  appletSlug,
  layoutType,
  isPreview,
  allowSubmit,
  className = "",
  children,
  useLink = false
}: AppletNavButtonProps) => {
  const { createAppletNavigationHandler } = useAppletNavigation();
  
  const params = {
    slug,
    appletSlug,
    layoutType,
    isPreview,
    allowSubmit
  };
  
  // Use Link component for better performance when prefetching is desired
  if (useLink) {
    const href = getAppletUrl(params);
    return (
      <Link 
        href={href}
        className={`px-4 py-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 text-gray-800 dark:text-gray-300 rounded transition-colors ${className}`}
      >
        {children}
      </Link>
    );
  }
  
  // Use onClick handler for programmatic navigation
  return (
    <button
      onClick={createAppletNavigationHandler(params)}
      className={`px-4 py-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-zinc-400 dark:hover:bg-zinc-600 text-gray-800 dark:text-gray-300 rounded transition-colors ${className}`}
    >
      {children}
    </button>
  );
}; 