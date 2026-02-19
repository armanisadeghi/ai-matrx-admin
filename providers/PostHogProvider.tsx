"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Initialize PostHog once
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    // Capture pageviews manually for App Router compatibility
    capture_pageview: false,
    // Session recording — enable for 10% of sessions
    enable_recording_console_log: false,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: { password: true },
    },
    // Disable for local development
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
    },
  });
}

/**
 * Captures pageviews on route changes (required for Next.js App Router)
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!ph) return;
    let url = pathname;
    if (searchParams.toString()) {
      url += `?${searchParams.toString()}`;
    }
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}

/**
 * Identify a user in PostHog after login.
 * Call this from your auth state change handler.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.identify(userId, properties);
}

/**
 * Reset PostHog identity on logout.
 */
export function resetPostHog() {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.reset();
}
