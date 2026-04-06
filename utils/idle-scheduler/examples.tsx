// @ts-nocheck

/**
 * ============================================================================
 * USAGE EXAMPLES — IdleScheduler in a Next.js App Router application
 * ============================================================================
 *
 * These are real-world patterns showing how different parts of your app
 * can register deferred work without impacting render performance.
 */

// ============================================================================
// EXAMPLE 1: Analytics initialization (fire-and-forget)
// ============================================================================
// Priority 3 — not urgent, but should happen before truly background stuff

"use client";

import {
  useIdleTask,
  useIdleReady,
  useIdleGate,
  useIdleRegister,
} from "@/lib/idle-scheduler";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useIdleTask("analytics-init", 3, () => {
    // This runs AFTER the page is fully rendered and idle.
    // Zero impact on FCP, LCP, INP, or hydration.
    window.gtag?.("config", "GA_TRACKING_ID");
    console.log("[Analytics] Initialized after idle");
  });

  // Component renders immediately — no waiting, no loading state
  return <>{children}</>;
}

// ============================================================================
// EXAMPLE 2: Heavy widget that stays dormant until idle
// ============================================================================
// Uses useIdleReady() — the component literally renders nothing until
// the entire page is settled.

export function ChatWidget() {
  const ready = useIdleReady();

  // Renders null during the critical rendering path.
  // Zero DOM nodes, zero layout cost, zero paint cost.
  if (!ready) return null;

  // Only mounts AFTER idle — all the heavy initialization
  // happens outside the critical path.
  return <HeavyChatWidgetImpl />;
}

function HeavyChatWidgetImpl() {
  // This component can do whatever it wants — it's already past idle.
  return <div>Chat loaded!</div>;
}

// ============================================================================
// EXAMPLE 3: Prefetching with completion signal
// ============================================================================
// Uses useIdleGate() — registers async work AND gets notified when done.

export function RecommendationsSection() {
  const { ready } = useIdleGate(
    "prefetch-recommendations",
    2, // Priority 2: should run before analytics but after critical measurements
    async () => {
      // Prefetch recommendation data in the background
      const res = await fetch("/api/recommendations");
      await res.json();
      // Data is now in the HTTP cache for when the component renders
    },
  );

  if (!ready) {
    return <div className="h-48 animate-pulse bg-gray-100 rounded-lg" />;
  }

  return <RecommendationsList />;
}

function RecommendationsList() {
  return <div>Recommendations loaded!</div>;
}

// ============================================================================
// EXAMPLE 4: Layout-level measurements (highest priority of deferred work)
// ============================================================================
// Priority 1 — first thing to run after idle, because other deferred
// work might depend on these measurements.

export function LayoutMeasurer() {
  useIdleTask("layout-measurements", 1, () => {
    // Measure the finalized layout
    const main = document.querySelector("main");
    if (main) {
      const rect = main.getBoundingClientRect();
      // Store measurements for other components
      window.__layoutMeasurements = {
        mainWidth: rect.width,
        mainHeight: rect.height,
        scrollHeight: document.documentElement.scrollHeight,
      };
    }
  });

  return null; // Pure side-effect component
}

// ============================================================================
// EXAMPLE 5: Service worker registration (low priority)
// ============================================================================

export function ServiceWorkerRegistrar() {
  useIdleTask("sw-register", 4, async () => {
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js");
        console.log("[SW] Registered after idle");
      } catch (err) {
        console.warn("[SW] Registration failed:", err);
      }
    }
  });

  return null;
}

// ============================================================================
// EXAMPLE 6: Speculative prefetch (lowest priority — absolute last)
// ============================================================================

export function SpeculativePrefetcher({ hrefs }: { hrefs: string[] }) {
  useIdleTask("speculative-prefetch", 5, () => {
    // Only runs when literally everything else is done
    hrefs.forEach((href) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = href;
      document.head.appendChild(link);
    });
  });

  return null;
}

// ============================================================================
// EXAMPLE 7: Dynamic/conditional registration
// ============================================================================
// Uses useIdleRegister() for imperative control

export function SearchResults({ query }: { query: string }) {
  const scheduleIdle = useIdleRegister();

  // Dynamically register prefetch work based on search results
  // This re-registers whenever the query changes
  React.useEffect(() => {
    if (query.length > 2) {
      scheduleIdle(`prefetch-search-${query}`, 4, () => {
        // Prefetch related searches
        fetch(`/api/related?q=${encodeURIComponent(query)}`);
      });
    }
  }, [query, scheduleIdle]);

  return <div>Results for: {query}</div>;
}

import React from "react";

// ============================================================================
// EXAMPLE 8: Combining in a layout (the typical setup)
// ============================================================================
// In your root layout or a page layout, compose these together.
// Each component is paper-thin until idle fires.

// app/layout.tsx or app/(main)/layout.tsx

// import { AnalyticsProvider } from '@/components/analytics-provider';
// import { LayoutMeasurer } from '@/components/layout-measurer';
// import { ServiceWorkerRegistrar } from '@/components/sw-registrar';
// import { SpeculativePrefetcher } from '@/components/speculative-prefetcher';

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//     return (
//         <html lang="en">
//             <body>
//                 <AnalyticsProvider>
//                     {children}
//                 </AnalyticsProvider>

//                 {/* These render nothing — they just register callbacks */
//                 <LayoutMeasurer />
//                 <ServiceWorkerRegistrar />
//                 <SpeculativePrefetcher hrefs={['/about', '/pricing', '/docs']} />
//             </body>
//         </html>
//     );
// }

// Execution order after idle:
// 1. LayoutMeasurer (priority 1 — measurements first)
// 2. RecommendationsSection prefetch (priority 2 — if on a page that uses it)
// 3. AnalyticsProvider (priority 3 — tracking init)
// 4. ServiceWorkerRegistrar (priority 4 — background infra)
// 5. SpeculativePrefetcher (priority 5 — truly last)
