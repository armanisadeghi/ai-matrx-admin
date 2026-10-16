// features/scopes/redux/thunks/awaitSavedTree.ts
//
// THE SAVED TREE IS READ BEFORE THE NETWORK IS ASKED. The tree is a warm-cache
// slice (`scopesTreePolicy`): on a warm reload the sync engine restores it and
// the loaders skip the ~1.2 s server read. But boot is deferred (window load +
// idle, `SyncBootstrap`), while the first read of `state.scopesTree` starts the
// load (`scopeTreeDemand`) — so the loaders used to fetch before the saved copy
// was read, paying the server read on every page and making the engine hold the
// tree's device write ("persist.held", 2026-10-16). Every loader awaits this
// first; a cold device waits only for boot's empty read, bounded by the engine's
// backstop.

import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { whenSyncHydrated } from "@/lib/sync/whenSyncHydrated";

export async function awaitSavedTree(): Promise<void> {
  const store = getStoreSingleton();
  if (store) await whenSyncHydrated(store);
}
