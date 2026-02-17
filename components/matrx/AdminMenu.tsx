'use client';

import React from 'react';
import { Shield, Server, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAdminOverride } from '@/hooks/useAdminOverride';
import { BACKEND_URLS } from '@/lib/api/endpoints';

/**
 * AdminMenu - Dropdown for admin-only preferences
 *
 * Only rendered when user is admin (lazy loaded).
 * Uses the shared useAdminOverride hook for server detection/switching.
 * Both this and ApiTestConfigPanel read/write the same Redux state.
 */
export function AdminMenu() {
    const {
        isLocalhost,
        isChecking,
        serverOverride,
        setServer,
    } = useAdminOverride();

    const handleServerChange = async (value: string) => {
        if (value === 'default') {
            await setServer(null);
            return;
        }

        if (value === 'localhost') {
            const success = await setServer('localhost');
            if (!success) {
                toast.error('Localhost unavailable', {
                    description: 'Cannot connect to the local server. Please start it and try again.',
                });
                return;
            }
            toast.success('Switched to localhost', {
                description: `Connected to ${BACKEND_URLS.localhost}`,
            });
        } else {
            await setServer(value === 'production' ? 'production' : null);
        }
    };

    const currentValue = serverOverride || 'default';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-7 gap-1 px-2 text-xs",
                        isLocalhost
                            ? "text-orange-600 dark:text-orange-400 bg-orange-500/10 hover:bg-orange-500/20"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                >
                    <Shield className="h-3 w-3" />
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Admin Settings
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                    <Server className="h-3 w-3" />
                    Server Environment
                </DropdownMenuLabel>

                {isChecking ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking localhost...
                    </div>
                ) : (
                    <DropdownMenuRadioGroup value={currentValue} onValueChange={handleServerChange}>
                        <DropdownMenuRadioItem value="default" className="text-xs">
                            <span className="flex items-center gap-2">
                                Production (default)
                            </span>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="localhost" className="text-xs">
                            <span className="flex items-center gap-2">
                                localhost:8000
                            </span>
                        </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default AdminMenu;
