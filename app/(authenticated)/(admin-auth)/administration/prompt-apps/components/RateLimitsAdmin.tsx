'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
    Search,
    Shield,
    ShieldOff,
    ExternalLink,
    User,
    Globe
} from 'lucide-react';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';
import {
    fetchRateLimits,
    unblockRateLimit,
    PromptAppRateLimit
} from '@/lib/services/prompt-apps-admin-service';

export function RateLimitsAdmin() {
    const [rateLimits, setRateLimits] = useState<PromptAppRateLimit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [blockedFilter, setBlockedFilter] = useState<string>('blocked');
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const blockedValue = blockedFilter === 'all' ? undefined : blockedFilter === 'blocked';
            const data = await fetchRateLimits({
                is_blocked: blockedValue,
                limit: 500
            });
            setRateLimits(data);
        } catch (error) {
            console.error('Error loading rate limits:', error);
            toast({
                title: "Error",
                description: "Failed to load rate limits",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [blockedFilter, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredRateLimits = rateLimits.filter(limit => {
        const matchesSearch = searchTerm === '' || 
            limit.app_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            limit.app_slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            limit.ip_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            limit.fingerprint?.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesSearch;
    });

    const handleUnblock = async (limit: PromptAppRateLimit) => {
        if (!confirm(`Unblock this ${limit.user_id ? 'user' : limit.ip_address ? 'IP' : 'fingerprint'}?`)) return;

        try {
            await unblockRateLimit(limit.id);
            loadData();
            toast({
                title: "Success",
                description: "Rate limit unblocked successfully",
                variant: "success"
            });
        } catch (error) {
            console.error('Error unblocking rate limit:', error);
            toast({
                title: "Error",
                description: "Failed to unblock rate limit",
                variant: "destructive"
            });
        }
    };

    const getIdentifierDisplay = (limit: PromptAppRateLimit) => {
        if (limit.user_id) {
            return (
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>User: {limit.user_id}</span>
                    <Badge variant="outline">Authenticated</Badge>
                </div>
            );
        } else if (limit.ip_address) {
            return (
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>IP: {limit.ip_address}</span>
                </div>
            );
        } else if (limit.fingerprint) {
            return (
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span>Fingerprint: {limit.fingerprint.substring(0, 12)}...</span>
                </div>
            );
        }
        return <span>Unknown</span>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <MatrxMiniLoader />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full bg-textured overflow-hidden">
            {/* Header with Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-textured space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Rate Limits Management
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {filteredRateLimits.length} rate limits
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search by app, IP, or fingerprint..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select value={blockedFilter} onValueChange={setBlockedFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Rate Limits</SelectItem>
                            <SelectItem value="blocked">Blocked Only</SelectItem>
                            <SelectItem value="not-blocked">Not Blocked</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Rate Limits List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {filteredRateLimits.map(limit => (
                        <div
                            key={limit.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-background hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {limit.is_blocked ? (
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <ShieldOff className="w-3 h-3" />
                                                Blocked
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Shield className="w-3 h-3" />
                                                Active
                                            </Badge>
                                        )}
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {limit.app_name}
                                        </span>
                                        <a 
                                            href={`/p/${limit.app_slug}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>

                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        {getIdentifierDisplay(limit)}
                                    </div>

                                    <div className="grid grid-cols-4 gap-4 text-xs text-gray-500 dark:text-gray-400">
                                        <div>
                                            <span className="font-medium">Execution Count:</span>
                                            <div className="mt-1">{limit.execution_count}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium">First Execution:</span>
                                            <div className="mt-1">{new Date(limit.first_execution_at).toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium">Last Execution:</span>
                                            <div className="mt-1">{new Date(limit.last_execution_at).toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <span className="font-medium">Window Start:</span>
                                            <div className="mt-1">{new Date(limit.window_start_at).toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {limit.is_blocked && (
                                        <div className="p-2 bg-red-50 dark:bg-red-950 rounded text-xs">
                                            <div className="font-medium text-red-900 dark:text-red-100">
                                                Blocked Information:
                                            </div>
                                            {limit.blocked_until && (
                                                <div className="text-red-700 dark:text-red-300 mt-1">
                                                    Until: {new Date(limit.blocked_until).toLocaleString()}
                                                </div>
                                            )}
                                            {limit.blocked_reason && (
                                                <div className="text-red-700 dark:text-red-300 mt-1">
                                                    Reason: {limit.blocked_reason}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-shrink-0">
                                    {limit.is_blocked && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUnblock(limit)}
                                        >
                                            <Shield className="w-4 h-4 mr-1" />
                                            Unblock
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredRateLimits.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No rate limits found matching the filters</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

