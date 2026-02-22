'use client';

import React, { useState } from 'react';
import { Shield, Server, ChevronDown, Loader2, CheckCircle2, XCircle } from 'lucide-react';
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

type HealthStatus = 'idle' | 'checking' | 'healthy' | 'unhealthy';

export function AdminMenu() {
    const {
        isLocalhost,
        isChecking,
        serverOverride,
        setServer,
        checkHealth,
    } = useAdminOverride();

    const [healthStatus, setHealthStatus] = useState<HealthStatus>('idle');

    const handleServerChange = async (value: string) => {
        if (value === 'localhost') {
            setHealthStatus('checking');
            const success = await setServer('localhost');
            if (!success) {
                setHealthStatus('unhealthy');
                toast.error('Localhost unavailable', {
                    description: 'Cannot connect to the local server. Please start it and try again.',
                });
            } else {
                setHealthStatus('healthy');
                toast.success('Switched to localhost', {
                    description: `${BACKEND_URLS.localhost} is healthy`,
                });
            }
            return;
        }

        setHealthStatus('checking');

        if (value === 'default') {
            const healthy = await checkHealth('production');
            if (healthy) {
                await setServer(null);
                setHealthStatus('healthy');
                toast.success('Switched to production', {
                    description: `${BACKEND_URLS.production} is healthy`,
                });
            } else {
                setHealthStatus('unhealthy');
                toast.error('Production server unreachable', {
                    description: `Cannot connect to ${BACKEND_URLS.production}`,
                });
            }
            return;
        }

        const healthy = await checkHealth('production');
        if (healthy) {
            await setServer(value === 'production' ? 'production' : null);
            setHealthStatus('healthy');
        } else {
            setHealthStatus('unhealthy');
            toast.error('Server unreachable', {
                description: 'Cannot connect to the selected server.',
            });
        }
    };

    const currentValue = serverOverride || 'default';
    const showSpinner = isChecking || healthStatus === 'checking';

    return (
        <DropdownMenu onOpenChange={() => setHealthStatus('idle')}>
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
                <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Admin Settings
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                        <Server className="h-3 w-3" />
                        Server Environment
                    </DropdownMenuLabel>

                    {showSpinner ? (
                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Running health check...
                        </div>
                    ) : (
                        <DropdownMenuRadioGroup value={currentValue} onValueChange={handleServerChange}>
                            <DropdownMenuRadioItem value="default" className="text-xs">
                                <span className="flex items-center gap-2">
                                    Production (default)
                                    {currentValue === 'default' && <HealthIndicator status={healthStatus} />}
                                </span>
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="localhost" className="text-xs">
                                <span className="flex items-center gap-2">
                                    localhost:8000
                                    {currentValue === 'localhost' && <HealthIndicator status={healthStatus} />}
                                </span>
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
    );
}

function HealthIndicator({ status }: { status: HealthStatus }) {
    if (status === 'idle') return null;
    if (status === 'healthy') return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (status === 'unhealthy') return <XCircle className="h-3 w-3 text-destructive" />;
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
}

export default AdminMenu;
