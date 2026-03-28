'use client';

import React, { useEffect, useState } from 'react';
import { useCmsSites } from '@/features/content-manager/hooks/useCmsSites';
import { useCmsPages } from '@/features/content-manager/hooks/useCmsPages';
import PageListView from './PageListView';
import PageEditor from './PageEditor';
import SiteSelector from './SiteSelector';
import {
    Globe,
    Plus,
    Loader2,
    AlertCircle,
    PanelTop,
    Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type View = 'list' | 'editor' | 'site-settings';

export default function ContentDashboard() {
    const sitesHook = useCmsSites();
    const pagesHook = useCmsPages(sitesHook.activeSite?.id ?? null);
    const [view, setView] = useState<View>('list');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    // Fetch pages when active site changes
    useEffect(() => {
        if (sitesHook.activeSite) {
            pagesHook.fetchPages();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sitesHook.activeSite?.id]);

    // ── Loading state ────────────────────────────────────────────────────
    if (sitesHook.isLoading && sitesHook.sites.length === 0) {
        return (
            <div className="flex items-center justify-center h-[calc(100dvh-var(--shell-header-h,56px))]">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Loading your sites…</p>
                </div>
            </div>
        );
    }

    // ── Error state ──────────────────────────────────────────────────────
    if (sitesHook.error && sitesHook.sites.length === 0) {
        return (
            <div className="flex items-center justify-center h-[calc(100dvh-var(--shell-header-h,56px))]">
                <div className="flex flex-col items-center gap-3 text-destructive">
                    <AlertCircle className="h-8 w-8" />
                    <p className="text-sm font-medium">Failed to load sites</p>
                    <p className="text-xs text-muted-foreground">{sitesHook.error}</p>
                    <Button variant="outline" size="sm" onClick={sitesHook.fetchSites}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // ── No sites → empty state ───────────────────────────────────────────
    if (sitesHook.sites.length === 0) {
        return (
            <div className="flex items-center justify-center h-[calc(100dvh-var(--shell-header-h,56px))]">
                <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-md text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Globe className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">No sites yet</h2>
                    <p className="text-sm">
                        Create your first site to start managing pages, components, and content.
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Site
                    </Button>
                </div>
            </div>
        );
    }

    // ── Handle page open/close from list ─────────────────────────────────
    const handleOpenPage = async (pageId: string) => {
        await pagesHook.openPage(pageId);
        setView('editor');
    };

    const handleClosePage = () => {
        pagesHook.closePage();
        setView('list');
        // Refresh the list to reflect any changes
        pagesHook.fetchPages();
    };

    const handleCreatePage = () => {
        setView('editor');
        // activePage will be null → PageEditor will show create form
        pagesHook.closePage();
    };

    return (
        <div className="h-[calc(100dvh-var(--shell-header-h,56px))] flex flex-col overflow-hidden">
            {/* ── Dashboard header ─────────────────────────────────────── */}
            <div className="flex-none border-b border-border/50 bg-background/80 backdrop-blur-sm">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <PanelTop className="h-5 w-5 text-primary" />
                            <h1 className="text-base font-bold text-foreground">
                                Content Manager
                            </h1>
                        </div>

                        {sitesHook.sites.length > 1 && (
                            <SiteSelector
                                sites={sitesHook.sites}
                                activeSiteId={sitesHook.activeSite?.id ?? null}
                                onSelect={sitesHook.selectSite}
                            />
                        )}

                        {sitesHook.activeSite && (
                            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                                {sitesHook.activeSite.name}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {view === 'editor' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClosePage}
                                className="text-xs"
                            >
                                ← Back to Pages
                            </Button>
                        )}

                        {view === 'list' && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Site Settings"
                                    onClick={() => setView('site-settings')}
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCreatePage}
                                    className="gap-1.5 text-xs"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    New Page
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main content ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {view === 'list' && (
                    <PageListView
                        pages={pagesHook.pages}
                        isLoading={pagesHook.isLoading}
                        error={pagesHook.error}
                        onOpenPage={handleOpenPage}
                        onDeletePage={pagesHook.deletePage}
                        onRefresh={pagesHook.fetchPages}
                    />
                )}

                {view === 'editor' && sitesHook.activeSite && (
                    <PageEditor
                        siteId={sitesHook.activeSite.id}
                        page={pagesHook.activePage}
                        isSaving={pagesHook.isSaving}
                        error={pagesHook.error}
                        onSave={pagesHook.updatePage}
                        onSaveDraft={pagesHook.saveDraft}
                        onPublish={pagesHook.publishDraft}
                        onDiscardDraft={pagesHook.discardDraft}
                        onCreate={pagesHook.createPage}
                        onClose={handleClosePage}
                    />
                )}

                {view === 'site-settings' && sitesHook.activeSite && (
                    <div className="p-6 max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold">Site Settings</h2>
                            <Button variant="ghost" size="sm" onClick={() => setView('list')}>
                                ← Back
                            </Button>
                        </div>
                        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-foreground">Site Name</label>
                                <p className="text-sm text-muted-foreground mt-1">{sitesHook.activeSite.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">Slug</label>
                                <p className="text-sm text-muted-foreground mt-1">{sitesHook.activeSite.slug}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">Domain</label>
                                <p className="text-sm text-muted-foreground mt-1">{sitesHook.activeSite.domain || 'Not configured'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">Status</label>
                                <Badge variant={sitesHook.activeSite.is_active ? 'default' : 'secondary'} className="ml-2">
                                    {sitesHook.activeSite.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                            Full site configuration editor coming soon. Contact support to update theme, navigation, and footer settings.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
