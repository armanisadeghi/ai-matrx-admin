// hooks.ts
'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { ActionMenuItem, DialogConfig, MenuItem } from './types';

export function useMenuSystem() {
    const router = useRouter();
    const [activeDialog, setActiveDialog] = useState<{
        config: DialogConfig;
        onResult?: (result: unknown) => void | Promise<void>;
    } | null>(null);

    const handleMenuItem = useCallback(async (item: MenuItem) => {
        if (!item.type || item.type === 'action') {
            await (item as ActionMenuItem).handler?.();
            return;
        }

        switch (item.type) {
            case 'link':
                // Next.js Link handles this
                break;
            case 'route':
                const url = item.params
                    ? `${item.path}?${new URLSearchParams(item.params)}`
                    : item.path;
                router.push(url);
                break;
            case 'dialog':
                setActiveDialog({
                    config: item.dialog,
                    onResult: item.onResult
                });
                break;
        }
    }, [router]);

    const handleDialogResult = useCallback(async (result: unknown) => {
        if (activeDialog?.onResult) {
            await activeDialog.onResult(result);
        }
        setActiveDialog(null);
    }, [activeDialog]);

    const closeDialog = useCallback(() => {
        setActiveDialog(null);
    }, []);

    return {
        activeDialog,
        handleMenuItem,
        handleDialogResult,
        closeDialog
    };
}
