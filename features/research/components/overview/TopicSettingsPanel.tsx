'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, FolderOpen, FolderPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { AutonomySelector } from '../init/AutonomySelector';
import { StatusBadge } from '../shared/StatusBadge';
import { updateTopic } from '../../service';
import { useUserProjects, ProjectFormSheet } from '@/features/projects';
import { cn } from '@/lib/utils';
import type { ResearchTopic, AutonomyLevel, SearchProvider, TopicStatus } from '../../types';

interface TopicSettingsPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    topic: ResearchTopic;
    onSaved: () => void;
}

const TOPIC_STATUSES: { value: TopicStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'searching', label: 'Searching' },
    { value: 'scraping', label: 'Scraping' },
    { value: 'curating', label: 'Curating' },
    { value: 'analyzing', label: 'Analyzing' },
    { value: 'complete', label: 'Complete' },
];

const SEARCH_PROVIDERS: { value: SearchProvider; label: string }[] = [
    { value: 'brave', label: 'Brave Search' },
    { value: 'google', label: 'Google' },
];

export function TopicSettingsPanel({ open, onOpenChange, topic, onSaved }: TopicSettingsPanelProps) {
    const isMobile = useIsMobile();
    const { projects, loading: projectsLoading, refresh: refreshProjects } = useUserProjects();

    const [name, setName] = useState(topic.name);
    const [description, setDescription] = useState(topic.description ?? '');
    const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>(topic.autonomy_level);
    const [searchProvider, setSearchProvider] = useState<SearchProvider>(topic.default_search_provider);
    const [status, setStatus] = useState<TopicStatus>(topic.status);
    const [goodScrapeThreshold, setGoodScrapeThreshold] = useState(topic.good_scrape_threshold);
    const [scrapesPerKeyword, setScrapesPerKeyword] = useState(topic.scrapes_per_keyword);
    const [selectedProjectId, setSelectedProjectId] = useState(topic.project_id);
    const [newProjectOpen, setNewProjectOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setName(topic.name);
            setDescription(topic.description ?? '');
            setAutonomyLevel(topic.autonomy_level);
            setSearchProvider(topic.default_search_provider);
            setStatus(topic.status);
            setGoodScrapeThreshold(topic.good_scrape_threshold);
            setScrapesPerKeyword(topic.scrapes_per_keyword);
            setSelectedProjectId(topic.project_id);
            setError(null);
        }
    }, [open, topic]);

    const handleSave = async () => {
        if (!name.trim()) { setError('Topic name is required.'); return; }
        if (!selectedProjectId) { setError('Please select a project.'); return; }
        setSaving(true);
        setError(null);
        try {
            await updateTopic(topic.id, {
                name: name.trim(),
                description: description.trim() || null,
                autonomy_level: autonomyLevel,
                default_search_provider: searchProvider,
                status,
                good_scrape_threshold: goodScrapeThreshold,
                scrapes_per_keyword: scrapesPerKeyword,
                project_id: selectedProjectId,
            });
            onSaved();
            onOpenChange(false);
        } catch (err) {
            setError((err as Error).message ?? 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const content = (
        <div className="flex flex-col gap-0 overflow-hidden h-full">
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
                {/* Project */}
                <section className="space-y-2 pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Project</span>
                    <Select
                        value={selectedProjectId}
                        onValueChange={setSelectedProjectId}
                        disabled={projectsLoading || saving}
                    >
                        <SelectTrigger className="h-9 text-xs rounded-lg" style={{ fontSize: '16px' }}>
                            {projectsLoading ? (
                                <span className="flex items-center gap-2 text-muted-foreground text-xs">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading...
                                </span>
                            ) : (
                                <SelectValue placeholder="Select a project" />
                            )}
                        </SelectTrigger>
                        <SelectContent>
                            {projects.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    <span className="flex items-center gap-2 text-xs">
                                        <FolderOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                                        {p.name}
                                        {p.isPersonal && (
                                            <span className="text-[9px] text-muted-foreground">Personal</span>
                                        )}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <button
                        onClick={() => setNewProjectOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors px-0.5"
                    >
                        <FolderPlus className="h-3 w-3" />
                        Create new project
                    </button>
                    {selectedProjectId !== topic.project_id && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                            Topic will be moved to a different project on save.
                        </p>
                    )}
                </section>

                {/* Basic Info */}
                <section className="space-y-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Basic Info</span>

                    <div className="space-y-1">
                        <label htmlFor="topic-name" className="text-[11px] font-medium text-muted-foreground">Name</label>
                        <Input
                            id="topic-name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., Brand Profile"
                            className="h-9 text-xs rounded-lg"
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="topic-description" className="text-[11px] font-medium text-muted-foreground">Description</label>
                        <Textarea
                            id="topic-description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Brief description..."
                            rows={2}
                            className="resize-none text-xs rounded-lg min-h-[60px]"
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Status</label>
                        <div className="flex items-center gap-2">
                            <Select value={status} onValueChange={v => setStatus(v as TopicStatus)}>
                                <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TOPIC_STATUSES.map(s => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <StatusBadge status={status} />
                        </div>
                    </div>
                </section>

                {/* Autonomy */}
                <section className="space-y-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Automation</span>
                    <AutonomySelector value={autonomyLevel} onChange={setAutonomyLevel} />
                </section>

                {/* Search & Scrape Settings */}
                <section className="space-y-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Search & Scrape</span>

                    <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Provider</label>
                        <Select value={searchProvider} onValueChange={v => setSearchProvider(v as SearchProvider)}>
                            <SelectTrigger className="w-36 h-8 text-xs rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SEARCH_PROVIDERS.map(p => (
                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label htmlFor="scrapes-per-kw" className="text-[11px] font-medium text-muted-foreground">Scrapes/Keyword</label>
                            <Input
                                id="scrapes-per-kw"
                                type="number"
                                min={1}
                                max={50}
                                value={scrapesPerKeyword}
                                onChange={e => setScrapesPerKeyword(Number(e.target.value))}
                                className="h-8 text-xs rounded-lg"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="scrape-threshold" className="text-[11px] font-medium text-muted-foreground">Good Threshold</label>
                            <Input
                                id="scrape-threshold"
                                type="number"
                                min={100}
                                max={50000}
                                step={100}
                                value={goodScrapeThreshold}
                                onChange={e => setGoodScrapeThreshold(Number(e.target.value))}
                                className="h-8 text-xs rounded-lg"
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 text-[11px] text-destructive">
                        {error}
                    </div>
                )}
            </div>

            {/* Footer — glass pill buttons */}
            <div className="shrink-0 flex justify-end gap-2 px-4 py-2.5 border-t border-border/50">
                <button
                    onClick={() => onOpenChange(false)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full glass-subtle text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 min-h-[44px]"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                    className={cn(
                        'inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-medium transition-all min-h-[44px]',
                        'bg-primary text-primary-foreground hover:bg-primary/90',
                        'disabled:opacity-40 disabled:pointer-events-none',
                    )}
                >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save Changes
                </button>
            </div>
        </div>
    );

    const newProjectSheet = (
        <ProjectFormSheet
            open={newProjectOpen}
            onOpenChange={setNewProjectOpen}
            skipRedirect
            onSuccess={(project) => {
                refreshProjects();
                setSelectedProjectId(project.id);
            }}
        />
    );

    if (isMobile) {
        return (
            <>
                <Drawer open={open} onOpenChange={onOpenChange}>
                    <DrawerContent className="h-[85dvh] flex flex-col">
                        <DrawerHeader className="shrink-0 border-b border-border/50 px-4 pb-2">
                            <DrawerTitle className="text-sm font-semibold">Settings</DrawerTitle>
                        </DrawerHeader>
                        {content}
                    </DrawerContent>
                </Drawer>
                {newProjectSheet}
            </>
        );
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md max-h-[85dvh] flex flex-col p-0 gap-0">
                    <DialogHeader className="shrink-0 px-4 pt-3 pb-2 border-b border-border/50">
                        <DialogTitle className="text-sm font-semibold">Settings</DialogTitle>
                    </DialogHeader>
                    {content}
                </DialogContent>
            </Dialog>
            {newProjectSheet}
        </>
    );
}
