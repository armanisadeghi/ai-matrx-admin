// DeferredShellData — Async server component, always inside <Suspense>.
// Does its own auth via cached getUser() — does NOT block the layout render.
// The shell chrome paints immediately; this streams in once the RPC resolves.

import { createClient, getUser } from "@/utils/supabase/server";
import { getSSRShellData } from "@/utils/supabase/ssrShellData";
import { mapUserData } from "@/utils/userDataMapper";
import { createServerTimer } from "@/utils/performance/serverTiming";
import type { LiteInitialReduxState } from "@/types/reduxTypes";
import ShellDataHydrator from "./ShellDataHydrator";

export default async function DeferredShellData() {
    const timer = createServerTimer();

    let initialState: LiteInitialReduxState | undefined;
    let isAdmin = false;

    try {
        // Both are request-cached — no extra network calls
        const [user, supabase] = await Promise.all([getUser(), createClient()]);

        if (user) {
            const shellData = await timer.measure('rpc:shell_data', () => getSSRShellData(supabase, user.id), 'get_ssr_shell_data RPC');
            isAdmin = shellData.is_admin;

            const userData = mapUserData(user, undefined, isAdmin);
            initialState = {
                user: userData,
                userPreferences: shellData.preferences_exists && shellData.preferences
                    ? shellData.preferences as Record<string, unknown>
                    : undefined,
                modelRegistry: shellData.ai_models.length > 0
                    ? { availableModels: shellData.ai_models, lastFetched: Date.now() }
                    : undefined,
                contextMenuCache: shellData.context_menu.length > 0
                    ? { rows: shellData.context_menu, hydrated: true }
                    : undefined,
                sms: shellData.sms_unread_total > 0
                    ? { unreadTotal: shellData.sms_unread_total }
                    : undefined,
            };
        }
    } catch {
        // Non-critical — store starts empty, page still works
    }

    timer.done('Deferred Shell Data');

    return <ShellDataHydrator initialState={initialState} isAdmin={isAdmin} />;
}
