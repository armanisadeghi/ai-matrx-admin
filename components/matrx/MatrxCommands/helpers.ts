'use client';

import { useToast } from "@/components/ui/matrx/use-toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";

/**
 * Imperative confirmation prompt used by the MatrxCommands system.
 * Backed by the global ConfirmDialogHost mounted in app/Providers.tsx,
 * app/EntityProviders.tsx, and app/(public)/PublicProviders.tsx — see
 * `components/dialogs/confirm/` for the full architecture.
 *
 * Resolves to `true` if the user confirms, `false` otherwise. Replaces
 * the previous `window.confirm` wrapper. Existing callers (ReduxCommand,
 * EntityCommand) continue to pass a plain string message; new callers
 * should prefer the richer `confirm({ title, description, variant, ... })`
 * API directly from `@/components/dialogs/confirm/ConfirmDialogHost`.
 */
const showConfirmDialog = (message: string): Promise<boolean> => {
    return confirm({
        title: message,
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
    });
};


const showErrorToast = (message: string) => {
    const {toast} = useToast();

    toast({
        title: "Error",
        description: message,
        action: null,
    });
};

export { showConfirmDialog, showErrorToast };
