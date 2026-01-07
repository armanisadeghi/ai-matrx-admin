'use client';

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Shield, Server, ChevronDown, Check } from 'lucide-react';
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

const COOKIE_NAME = 'admin_server_override';

/**
 * AdminMenu - Dropdown for admin-only preferences
 * 
 * Only rendered when user is admin (lazy loaded).
 * Manages:
 * - Server environment override (localhost vs production)
 * - Future: Other admin-specific toggles
 * 
 * Persists preferences to cookies for cross-session persistence.
 */
export function AdminMenu() {
    const dispatch = useDispatch();
    const serverOverride = useSelector(selectServerOverride);

    // Load from cookie on mount
    useEffect(() => {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${COOKIE_NAME}=`))
            ?.split('=')[1] as ServerEnvironment | undefined;
        
        if (cookieValue && (cookieValue === 'localhost' || cookieValue === 'production')) {
            dispatch(setServerOverride(cookieValue));
        }
    }, [dispatch]);

    // Save to cookie when changed
    const handleServerChange = (value: string) => {
        const serverValue = value as ServerEnvironment | 'default';
        
        if (serverValue === 'default') {
            // Clear override
            dispatch(setServerOverride(null));
            document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
        } else {
            dispatch(setServerOverride(serverValue));
            // Set cookie for 30 days
            document.cookie = `${COOKIE_NAME}=${serverValue}; path=/; max-age=${30 * 24 * 60 * 60}`;
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
                
                <DropdownMenuRadioGroup value={currentValue} onValueChange={handleServerChange}>
                    <DropdownMenuRadioItem value="default" className="text-xs">
                        <span className="flex items-center gap-2">
                            🌐 Production (default)
                        </span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="localhost" className="text-xs">
                        <span className="flex items-center gap-2">
                            🏠 localhost:8000
                        </span>
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                
                {/* Add more admin options here in the future */}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default AdminMenu;
