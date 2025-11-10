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
    ExternalLink,
    Star,
    ShieldCheck,
    Ban,
    CheckCircle,
    Clock,
    Archive
} from 'lucide-react';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';
import {
    fetchAppsAdmin,
    updateAppAdmin,
    PromptAppAdminView
} from '@/lib/services/prompt-apps-admin-service';

export function AppsAdmin() {
    const [apps, setApps] = useState<PromptAppAdminView[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [featuredFilter, setFeaturedFilter] = useState<string>('all');
    const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchAppsAdmin();
            setApps(data);
        } catch (error) {
            console.error('Error loading apps:', error);
            toast({
                title: "Error",
                description: "Failed to load apps",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredApps = apps.filter(app => {
        const matchesSearch = searchTerm === '' || 
            app.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.creator_email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        const matchesFeatured = featuredFilter === 'all' || 
            (featuredFilter === 'featured' && app.is_featured) ||
            (featuredFilter === 'not-featured' && !app.is_featured);
        const matchesVerified = verifiedFilter === 'all' || 
            (verifiedFilter === 'verified' && app.is_verified) ||
            (verifiedFilter === 'not-verified' && !app.is_verified);
        
        return matchesSearch && matchesStatus && matchesFeatured && matchesVerified;
    });

    const handleToggleFeatured = async (app: PromptAppAdminView) => {
        try {
            await updateAppAdmin({
                id: app.id,
                is_featured: !app.is_featured
            });
            loadData();
            toast({
                title: "Success",
                description: `App ${!app.is_featured ? 'featured' : 'unfeatured'}`,
                variant: "success"
            });
        } catch (error) {
            console.error('Error updating app:', error);
            toast({
                title: "Error",
                description: "Failed to update app",
                variant: "destructive"
            });
        }
    };

    const handleToggleVerified = async (app: PromptAppAdminView) => {
        try {
            await updateAppAdmin({
                id: app.id,
                is_verified: !app.is_verified
            });
            loadData();
            toast({
                title: "Success",
                description: `App ${!app.is_verified ? 'verified' : 'unverified'}`,
                variant: "success"
            });
        } catch (error) {
            console.error('Error updating app:', error);
            toast({
                title: "Error",
                description: "Failed to update app",
                variant: "destructive"
            });
        }
    };

    const handleChangeStatus = async (app: PromptAppAdminView, newStatus: string) => {
        try {
            await updateAppAdmin({
                id: app.id,
                status: newStatus as any
            });
            loadData();
            toast({
                title: "Success",
                description: `App status changed to ${newStatus}`,
                variant: "success"
            });
        } catch (error) {
            console.error('Error updating app:', error);
            toast({
                title: "Error",
                description: "Failed to update app",
                variant: "destructive"
            });
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; icon: any }> = {
            draft: { variant: 'secondary', icon: Clock },
            published: { variant: 'default', icon: CheckCircle },
            archived: { variant: 'outline', icon: Archive },
            suspended: { variant: 'destructive', icon: Ban }
        };
        const config = variants[status] || variants.draft;
        const Icon = config.icon;
        return (
            <Badge variant={config.variant as any} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {status}
            </Badge>
        );
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
                        Apps Management
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {filteredApps.length} apps
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search apps..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Apps</SelectItem>
                            <SelectItem value="featured">Featured Only</SelectItem>
                            <SelectItem value="not-featured">Not Featured</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Verification</SelectItem>
                            <SelectItem value="verified">Verified Only</SelectItem>
                            <SelectItem value="not-verified">Not Verified</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Apps List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {filteredApps.map(app => (
                        <div
                            key={app.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-background hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {app.name}
                                        </h3>
                                        {getStatusBadge(app.status)}
                                        {app.is_featured && (
                                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                                <Star className="w-3 h-3 mr-1 fill-current" />
                                                Featured
                                            </Badge>
                                        )}
                                        {app.is_verified && (
                                            <Badge variant="outline" className="text-green-600 border-green-600">
                                                <ShieldCheck className="w-3 h-3 mr-1" />
                                                Verified
                                            </Badge>
                                        )}
                                        <a 
                                            href={`/p/${app.slug}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>

                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {app.tagline || app.description || 'No description'}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                        <span>Slug: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{app.slug}</code></span>
                                        <span>Creator: {app.creator_email}</span>
                                        {app.category && <span>Category: {app.category}</span>}
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                        <span>Executions: {app.total_executions}</span>
                                        <span>Users: {app.unique_users_count}</span>
                                        <span>Success Rate: {app.success_rate.toFixed(1)}%</span>
                                        <span>Cost: ${app.total_cost.toFixed(4)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Select
                                        value={app.status}
                                        onValueChange={(value) => handleChangeStatus(app, value)}
                                    >
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="published">Published</SelectItem>
                                            <SelectItem value="archived">Archived</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        variant={app.is_featured ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleToggleFeatured(app)}
                                    >
                                        <Star className={`w-4 h-4 mr-1 ${app.is_featured ? 'fill-current' : ''}`} />
                                        {app.is_featured ? 'Featured' : 'Feature'}
                                    </Button>

                                    <Button
                                        variant={app.is_verified ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleToggleVerified(app)}
                                    >
                                        <ShieldCheck className="w-4 h-4 mr-1" />
                                        {app.is_verified ? 'Verified' : 'Verify'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredApps.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No apps found matching the filters</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

