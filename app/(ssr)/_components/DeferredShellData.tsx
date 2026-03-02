import { createClient } from "@/utils/supabase/server"; // cache()-wrapped — same instance as parent layout
import { getSSRShellData } from "@/utils/supabase/ssrShellData";
import { mapUserData } from "@/utils/userDataMapper";
import { createServerTimer } from "@/utils/performance/serverTiming";
import type { User } from "@supabase/supabase-js";
import type { LiteInitialReduxState } from "@/types/reduxTypes";
import ShellDataHydrator from "./ShellDataHydrator";

interface DeferredShellDataProps {
    userId: string;
    user: User;
}

/**
 * Async server component that fetches shell data (RPC) and streams the result.
 * Wrapped in <Suspense> by the layout — the shell chrome renders immediately
 * while this component resolves in parallel.
 */
export default async function DeferredShellData({ userId, user }: DeferredShellDataProps) {
    const timer = createServerTimer();

    let initialState: LiteInitialReduxState | undefined;
    let isAdmin = false;

    try {
        const supabase = await createClient();
        const shellData = await timer.measure('rpc:shell_data', () => getSSRShellData(supabase, userId), 'get_ssr_shell_data RPC');
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
    } catch {
        // Non-critical — store starts empty, page still works
    }

    timer.done('Deferred Shell Data');

    return <ShellDataHydrator initialState={initialState} isAdmin={isAdmin} />;
}
