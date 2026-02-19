'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, FolderOpen, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { AutonomySelector } from '../init/AutonomySelector';
import { StatusBadge } from '../shared/StatusBadge';
import { updateTopic } from '../../service';
import { useUserProjects, ProjectFormSheet } from '@/features/projects';
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

    // Reset form when topic changes or panel opens
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
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
                {/* Project */}
                <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Project</h3>
                    <div className="space-y-2">
                        <Label>Move to Project</Label>
                        <Select
                            value={selectedProjectId}
                            onValueChange={setSelectedProjectId}
                            disabled={projectsLoading || saving}
                        >
                            <SelectTrigger style={{ fontSize: '16px' }}>
                                {projectsLoading ? (
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Loading projects...
                                    </span>
                                ) : (
                                    <SelectValue placeholder="Select a project" />
                                )}
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <span className="flex items-center gap-2">
                                            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                            <span>{p.name}</span>
                                            {p.isPersonal && (
                                                <span className="text-[10px] text-muted-foreground ml-1">Personal</span>
                                            )}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-primary px-1"
                            onClick={() => setNewProjectOpen(true)}
                        >
                            <FolderPlus className="h-3.5 w-3.5" />
                            Create new project
                        </Button>
                        {selectedProjectId !== topic.project_id && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                This topic will be moved to a different project on save.
                            </p>
                        )}
                    </div>
                </section>

                {/* Basic Info */}
                <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Info</h3>

                    <div className="space-y-2">
                        <Label htmlFor="topic-name">Topic Name</Label>
                        <Input
                            id="topic-name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g., All Green Brand Profile"
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="topic-description">Description</Label>
                        <Textarea
                            id="topic-description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Brief description of what this research covers..."
                            rows={3}
                            className="resize-none"
                            style={{ fontSize: '16px' }}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Status</Label>
                        <div className="flex items-center gap-3">
                            <Select value={status} onValueChange={v => setStatus(v as TopicStatus)}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TOPIC_STATUSES.map(s => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <StatusBadge status={status} />
                        </div>
                    </div>
                </section>

                {/* Autonomy */}
                <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Automation Level</h3>
                    <AutonomySelector value={autonomyLevel} onChange={setAutonomyLevel} />
                </section>

                {/* Search & Scrape Settings */}
                <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search & Scrape</h3>

                    <div className="space-y-2">
                        <Label>Search Provider</Label>
                        <Select value={searchProvider} onValueChange={v => setSearchProvider(v as SearchProvider)}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SEARCH_PROVIDERS.map(p => (
                                    <SelectItem key={p.value} value={p.value}>
                                        {p.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="scrapes-per-kw">Scrapes per Keyword</Label>
                            <p className="text-xs text-muted-foreground">How many sources to scrape per keyword search.</p>
                            <Input
                                id="scrapes-per-kw"
                                type="number"
                                min={1}
                                max={50}
                                value={scrapesPerKeyword}
                                onChange={e => setScrapesPerKeyword(Number(e.target.value))}
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="scrape-threshold">Good Scrape Threshold</Label>
                            <p className="text-xs text-muted-foreground">Minimum characters to consider a scrape successful.</p>
                            <Input
                                id="scrape-threshold"
                                type="number"
                                min={100}
                                max={50000}
                                step={100}
                                value={goodScrapeThreshold}
                                onChange={e => setGoodScrapeThreshold(Number(e.target.value))}
                                style={{ fontSize: '16px' }}
                            />
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                        {error}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex justify-end gap-2 px-4 py-3 border-t border-border bg-card">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                </Button>
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
                        <DrawerHeader className="shrink-0 border-b border-border px-4 pb-3">
                            <DrawerTitle>Topic Settings</DrawerTitle>
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
                <DialogContent className="max-w-xl max-h-[85dvh] flex flex-col p-0 gap-0">
                    <DialogHeader className="shrink-0 px-4 pt-4 pb-3 border-b border-border">
                        <DialogTitle>Topic Settings</DialogTitle>
                    </DialogHeader>
                    {content}
                </DialogContent>
            </Dialog>
            {newProjectSheet}
        </>
    );
}
