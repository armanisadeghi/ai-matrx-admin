'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import {
    selectServerOverride,
    setServerOverride,
    ServerEnvironment,
} from '@/lib/redux/slices/adminPreferencesSlice';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const COOKIE_NAME = 'admin_server_override';
const LOCALHOST_URL = process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || 'http://localhost:8000';
const HEALTH_CHECK_TIMEOUT_MS = 2000;

async function checkLocalhostHealth(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
        await fetch(`${LOCALHOST_URL}/api/health`, {
            method: 'GET',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return true;
    } catch {
        return false;
    }
}

/**
 * AdminMenu - Dropdown for admin-only preferences
 * 
 * Only rendered when user is admin (lazy loaded).
 * Manages:
 * - Server environment override (localhost vs production)
 * - Future: Other admin-specific toggles
 * 
 * Validates localhost health before allowing the switch.
 * If cookie says localhost but the server is unreachable, auto-falls back to production.
 * Persists preferences to cookies for cross-session persistence.
 */
export function AdminMenu() {
    const dispatch = useDispatch();
    const serverOverride = useSelector(selectServerOverride);
    const [isChecking, setIsChecking] = useState(false);
    const hasValidatedRef = useRef(false);

    // Load from cookie on mount — validate localhost health before applying
    useEffect(() => {
        if (hasValidatedRef.current) return;
        hasValidatedRef.current = true;

        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${COOKIE_NAME}=`))
            ?.split('=')[1] as ServerEnvironment | undefined;

        if (!cookieValue || cookieValue === 'production') {
            if (cookieValue === 'production') {
                dispatch(setServerOverride('production'));
            }
            return;
        }

        if (cookieValue === 'localhost') {
            (async () => {
                const healthy = await checkLocalhostHealth();
                if (healthy) {
                    dispatch(setServerOverride('localhost'));
                } else {
                    dispatch(setServerOverride(null));
                    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
                    toast.info('Localhost unavailable', {
                        description: 'Could not reach the local server. Using production instead.',
                    });
                }
            })();
        }
    }, [dispatch]);

    const handleServerChange = async (value: string) => {
        const serverValue = value as ServerEnvironment | 'default';

        if (serverValue === 'default') {
            dispatch(setServerOverride(null));
            document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
            return;
        }

        if (serverValue === 'localhost') {
            setIsChecking(true);
            const healthy = await checkLocalhostHealth();
            setIsChecking(false);

            if (!healthy) {
                toast.error('Localhost unavailable', {
                    description: 'Cannot connect to the local server. Please start it and try again.',
                });
                return;
            }
        }

        dispatch(setServerOverride(serverValue));
        document.cookie = `${COOKIE_NAME}=${serverValue}; path=/; max-age=${30 * 24 * 60 * 60}`;

        if (serverValue === 'localhost') {
            toast.success('Switched to localhost', {
                description: `Connected to ${LOCALHOST_URL}`,
            });
        }
    };

    const currentValue = serverOverride || 'default';
    const isLocalhost = serverOverride === 'localhost';

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

                {/* Add more admin options here in the future */}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default AdminMenu;
