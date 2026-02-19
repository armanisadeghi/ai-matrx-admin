'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Loader2, Search, FolderOpen, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useUserProjects } from '@/features/projects';
import { useTopicsForProject } from '../../hooks/useResearchState';
import { StatusBadge } from '../shared/StatusBadge';
import type { ResearchTopic, TopicStatus } from '../../types';
import type { ProjectWithRole } from '@/features/projects';
import { supabase } from '@/utils/supabase/client';

export default function TopicList() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { projects, loading: projectsLoading } = useUserProjects();
    const [selectedProject, setSelectedProject] = useState<ProjectWithRole | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [navigatingId, setNavigatingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ResearchTopic | null>(null);
    const [deleting, setDeleting] = useState(false);

    const activeProject = selectedProject ?? projects[0] ?? null;
    const { data: topics, isLoading: topicsLoading, refresh } = useTopicsForProject(activeProject?.id);

    const filteredTopics = (topics ?? []).filter(t =>
        !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleNavigateToTopic = (topicId: string) => {
        setNavigatingId(topicId);
        startTransition(() => {
            router.push(`/p/research/topics/${topicId}`);
        });
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const { error } = await supabase.from('rs_topic').delete().eq('id', deleteTarget.id);
            if (error) throw error;
            refresh();
        } catch {
            // silently fail for now
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const loading = projectsLoading || topicsLoading;
    const hasTopics = filteredTopics.length > 0;

    return (
        <div className="h-[calc(100dvh-var(--header-height,2.5rem))] flex flex-col overflow-hidden bg-textured">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <h1 className="text-xl font-bold truncate">Research Topics</h1>
                    {/* Project Selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 max-w-[200px] min-h-[36px]" disabled={projectsLoading}>
                                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{activeProject?.name ?? 'Select Project'}</span>
                                <ChevronDown className="h-3 w-3 shrink-0" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-w-[280px]">
                            {projects.map(p => (
                                <DropdownMenuItem key={p.id} onClick={() => setSelectedProject(p)} className="gap-2">
                                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{p.name}</span>
                                    {p.isPersonal && <span className="text-[10px] text-muted-foreground ml-auto">Personal</span>}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <Button onClick={() => router.push('/p/research/topics/new')} className="gap-2 min-h-[44px]" disabled={isPending}>
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">New Topic</span>
                </Button>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b border-border">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search topics..."
                        className="pl-9 text-base"
                        style={{ fontSize: '16px' }}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-xl" />
                        ))}
                    </div>
                ) : hasTopics ? (
                    <div className="space-y-2">
                        {filteredTopics.map(topic => (
                            <div
                                key={topic.id}
                                className={cn(
                                    'group relative flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 cursor-pointer min-h-[44px]',
                                    navigatingId === topic.id && 'opacity-60',
                                )}
                                onClick={() => handleNavigateToTopic(topic.id)}
                            >
                                {navigatingId === topic.id && (
                                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-sm truncate">{topic.name}</h3>
                                        <StatusBadge status={topic.status} />
                                    </div>
                                    {topic.subject_name && (
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">Subject: {topic.subject_name}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Created {new Date(topic.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0"
                                    onClick={e => { e.stopPropagation(); setDeleteTarget(topic); }}
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Search className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No research topics yet</h3>
                        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                            Create a research topic to start gathering, analyzing, and synthesizing information on any subject.
                        </p>
                        <Button asChild className="gap-2 min-h-[44px]">
                            <Link href="/p/research/topics/new">
                                <Plus className="h-4 w-4" />
                                Create Your First Topic
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Topic</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete &ldquo;{deleteTarget?.name}&rdquo; and all its sources, analyses, and documents. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
