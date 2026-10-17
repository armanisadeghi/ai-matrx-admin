/**
 * The viewer's organizations as this app holds them — the scope tree's `organizationIds` (the
 * person's OWN organizations, never the admin lane's) once it is ready — for the package's
 * kind-component layer overlay (`kindViewerOrganizations`, providers/richContentHost.ts). The store
 * singleton is a leaf module: no static edge into the Redux store graph.
 */
import type { RichContentViewerOrganizations } from "@ai-matrx/rich-content/host/types";
import { getStoreSingleton } from "@/lib/redux/store-singleton";

interface ScopeTreeShape {
  scopesTree?: { treeStatus?: string; organizationIds?: string[] };
}

export const webViewerOrganizations: RichContentViewerOrganizations = {
  known() {
    const tree = (getStoreSingleton()?.getState() as ScopeTreeShape | undefined)?.scopesTree;
    if (!tree || tree.treeStatus !== "ready" || !Array.isArray(tree.organizationIds)) return null;
    return [...tree.organizationIds].sort();
  },
  subscribe(onChange) {
    const store = getStoreSingleton();
    // No store yet: say so (null), so the package retries the watch on the next demand.
    if (!store) return null;
    return store.subscribe(onChange);
  },
};
