// app/(legacy)/layout.tsx
//
// Top-level layout for the entity-bound route branch. Sibling of
// `app/(authenticated)/layout.tsx` (slim) — uses a different provider
// stack (`EntityProviders`) and its own preloaded `globalCache` so the
// entity store boots complete (no on-demand `/api/schema` fetch).
//
// Routes under this group resolve at URL prefix `/legacy/*` via the inner
// `legacy/` folder (the `(legacy)` parens are a route group and don't
// affect URLs).
//
// See `~/.claude/plans/the-entity-system-which-bubbly-wind.md`.

import { initializeSchemaSystem } from "@/utils/schema/schema-processing/processSchema";
import { EntityProviders } from "@/app/EntityProviders";
import {
  appSidebarLinks,
  adminSidebarLinks,
} from "@/constants/navigation-links";
import NavigationLoader from "@/components/loaders/NavigationLoader";
import ResponsiveLayout from "@/components/layout/new-layout/ResponsiveLayout";
import { loadAuthedLayoutData } from "@/lib/auth/authedLayoutData";
import type { EntityReduxState } from "@/types/reduxTypes";

// Module-scope preload: `initializeSchemaSystem` reads the 108k-line
// `initialSchemas` files and builds a UnifiedSchemaCache. Cached internally
// after first call. The slim path NEVER imports this module — that's the
// whole point of the (legacy) split.
const globalCache = initializeSchemaSystem(["legacy-layout"]);

export default async function LegacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData, isAdmin, isMobile } = await loadAuthedLayoutData();

  const layoutProps = {
    primaryLinks: appSidebarLinks,
    secondaryLinks: isAdmin ? adminSidebarLinks : [],
    initialOpen: !isMobile ? false : false,
    uniqueId: "matrix-layout-container",
    isAdmin,
    serverIsMobile: isMobile,
  };

  const initialReduxState: EntityReduxState = {
    user: userData,
    testRoutes: [],
    globalCache,
    // Pre-mark the entity system as initialized so `EntitySystemProvider`
    // (inside `EntityPack`) skips its lazy `/api/schema` fetch + replaceReducer
    // path. The store already has the schema and the entity slices wired in
    // via `createEntityRootReducer`.
    entitySystem: {
      initialized: true,
      loading: false,
      error: null,
    },
  };

  return (
    <EntityProviders initialReduxState={initialReduxState}>
      <ResponsiveLayout {...layoutProps}>
        <NavigationLoader />
        {children}
      </ResponsiveLayout>
    </EntityProviders>
  );
}
