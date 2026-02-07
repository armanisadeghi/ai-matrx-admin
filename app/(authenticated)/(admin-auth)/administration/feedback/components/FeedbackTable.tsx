'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllFeedback, updateFeedback, setAdminDecision } from '@/actions/feedback.actions';
import { UserFeedback, FeedbackStatus, FeedbackType, AdminDecision, ADMIN_DECISION_COLORS, ADMIN_DECISION_LABELS } from '@/types/feedback.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AlertCircle, Sparkles, Lightbulb, HelpCircle, Search, ArrowUpDown, Eye, ImageIcon,
    ChevronLeft, ChevronRight, Loader2, Brain, CheckCircle2, Hash, ArrowRight, User, Bot,
    ClipboardCheck, Archive, ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import FeedbackDetailDialog from './FeedbackDetailDialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusOptions: { value: FeedbackStatus; label: string; color: string }[] = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'triaged', label: 'Triaged', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { value: 'awaiting_review', label: 'Awaiting Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
    { value: 'wont_fix', label: "Won't Fix", color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
];

const feedbackTypeIcons: Record<FeedbackType, React.ReactNode> = {
    bug: <AlertCircle className="w-4 h-4 text-red-500" />,
    feature: <Sparkles className="w-4 h-4 text-purple-500" />,
    suggestion: <Lightbulb className="w-4 h-4 text-yellow-500" />,
    other: <HelpCircle className="w-4 h-4 text-gray-500" />,
};

type SortField = 'created_at' | 'status' | 'feedback_type' | 'username' | 'work_priority';
type SortDirection = 'asc' | 'desc';

// Mutually exclusive pipeline stages
type PipelineStage = 'untriaged' | 'your_decision' | 'agent_working' | 'test_results' | 'done' | 'all';

interface StageConfig {
    key: PipelineStage;
    label: string;
    shortLabel: string;
    owner: 'agent' | 'admin' | 'none';
    icon: React.ReactNode;
    color: string;
    activeColor: string;
    borderColor: string;
    match: (item: UserFeedback) => boolean;
}

const DONE_STATUSES: FeedbackStatus[] = ['resolved', 'closed', 'wont_fix', 'deferred'];

const pipelineStages: StageConfig[] = [
    {
        key: 'untriaged',
        label: 'Untriaged',
        shortLabel: 'New',
        owner: 'agent',
        icon: <Bot className="w-3.5 h-3.5" />,
        color: 'text-blue-700 dark:text-blue-400',
        activeColor: 'bg-blue-600 dark:bg-blue-600 text-white',
        borderColor: 'border-blue-300 dark:border-blue-700',
        match: (item) => item.status === 'new',
    },
    {
        key: 'your_decision',
        label: 'Your Decision',
        shortLabel: 'Decide',
        owner: 'admin',
        icon: <User className="w-3.5 h-3.5" />,
        color: 'text-amber-700 dark:text-amber-400',
        activeColor: 'bg-amber-600 dark:bg-amber-600 text-white',
        borderColor: 'border-amber-300 dark:border-amber-700',
        match: (item) =>
            item.status === 'triaged' &&
            (item.admin_decision === 'pending' || !item.admin_decision),
    },
    {
        key: 'agent_working',
        label: 'Agent Working',
        shortLabel: 'Fixing',
        owner: 'agent',
        icon: <Bot className="w-3.5 h-3.5" />,
        color: 'text-purple-700 dark:text-purple-400',
        activeColor: 'bg-purple-600 dark:bg-purple-600 text-white',
        borderColor: 'border-purple-300 dark:border-purple-700',
        match: (item) =>
            item.admin_decision === 'approved' &&
            ['triaged', 'in_progress'].includes(item.status) &&
            !DONE_STATUSES.includes(item.status),
    },
    {
        key: 'test_results',
        label: 'Test Results',
        shortLabel: 'Test',
        owner: 'admin',
        icon: <ClipboardCheck className="w-3.5 h-3.5" />,
        color: 'text-green-700 dark:text-green-400',
        activeColor: 'bg-green-600 dark:bg-green-600 text-white',
        borderColor: 'border-green-300 dark:border-green-700',
        match: (item) => item.status === 'awaiting_review',
    },
    {
        key: 'done',
        label: 'Done',
        shortLabel: 'Done',
        owner: 'none',
        icon: <Archive className="w-3.5 h-3.5" />,
        color: 'text-gray-500 dark:text-gray-500',
        activeColor: 'bg-gray-600 dark:bg-gray-600 text-white',
        borderColor: 'border-gray-300 dark:border-gray-700',
        match: (item) => DONE_STATUSES.includes(item.status),
    },
];

function getItemStage(item: UserFeedback): PipelineStage {
    for (const stage of pipelineStages) {
        if (stage.match(item)) return stage.key;
    }
    // Fallback for edge cases (e.g. split items, rejected but not wont_fix)
    return 'done';
}

// ---------- Image Preview Modal (unchanged) ----------

function ImagePreviewModal({
    open,
    onOpenChange,
    feedbackId,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedbackId: string | null;
}) {
    const [signedUrls, setSignedUrls] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (open && feedbackId) {
            setIsLoading(true);
            setCurrentIndex(0);
            fetch(`/api/admin/feedback/images?feedback_id=${feedbackId}`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.success && data.signed_urls) {
                        setSignedUrls(
                            data.signed_urls
                                .filter((item: { signed_url: string | null }) => item.signed_url)
                                .map((item: { signed_url: string }) => item.signed_url)
                        );
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        } else {
            setSignedUrls([]);
        }
    }, [open, feedbackId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-black/95">
                {isLoading ? (
                    <div className="flex items-center justify-center h-96">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                ) : signedUrls.length === 0 ? (
                    <div className="flex items-center justify-center h-96 text-white/60">
                        No images found
                    </div>
                ) : (
                    <div className="relative">
                        <div className="flex items-center justify-center min-h-[400px] max-h-[80vh]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={signedUrls[currentIndex]}
                                alt={`Screenshot ${currentIndex + 1}`}
                                className="max-w-full max-h-[80vh] object-contain"
                            />
                        </div>
                        {signedUrls.length > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentIndex((i) => (i === 0 ? signedUrls.length - 1 : i - 1))}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setCurrentIndex((i) => (i === signedUrls.length - 1 ? 0 : i + 1))}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                                    {currentIndex + 1} / {signedUrls.length}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ---------- Main Component ----------

export default function FeedbackTable() {
    const [feedback, setFeedback] = useState<UserFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
    const [imagePreviewFeedbackId, setImagePreviewFeedbackId] = useState<string | null>(null);

    // Pipeline stage (primary filter)
    const [activeStage, setActiveStage] = useState<PipelineStage>('untriaged');

    // Secondary filters (work alongside or override pipeline)
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');
    const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all');
    const [filterDecision, setFilterDecision] = useState<AdminDecision | 'all'>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Sorting
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    useEffect(() => {
        loadFeedback();
    }, []);

    const loadFeedback = async () => {
        setLoading(true);
        const result = await getAllFeedback();
        if (result.success && result.data) {
            setFeedback(result.data);
            // Keep selectedFeedback fresh from the reloaded list
            setSelectedFeedback(prev => {
                if (!prev) return prev;
                const fresh = result.data!.find(f => f.id === prev.id);
                return fresh ?? prev;
            });
        }
        setLoading(false);
    };

    const handleStatusChange = async (feedbackId: string, newStatus: FeedbackStatus) => {
        const result = await updateFeedback(feedbackId, { status: newStatus });
        if (result.success) {
            toast.success('Status updated successfully');
            await loadFeedback();
            if (selectedFeedback?.id === feedbackId && result.data) {
                setSelectedFeedback(result.data);
            }
        } else {
            toast.error(`Failed to update status: ${result.error}`);
        }
    };

    const handleQuickApprove = useCallback(async (feedbackId: string) => {
        const maxPriority = feedback
            .filter(f => f.work_priority !== null)
            .reduce((max, f) => Math.max(max, f.work_priority || 0), 0);
        const newPriority = maxPriority + 1;

        const result = await setAdminDecision(feedbackId, 'approved', undefined, newPriority);
        if (result.success) {
            toast.success('Approved and added to work queue');
            await loadFeedback();
            if (selectedFeedback?.id === feedbackId && result.data) {
                setSelectedFeedback(result.data);
            }
        } else {
            toast.error(`Failed to approve: ${result.error}`);
        }
    }, [feedback, selectedFeedback]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'work_priority' ? 'asc' : 'desc');
        }
    };

    const handleViewDetails = (item: UserFeedback) => {
        setSelectedFeedback(item);
        setDetailDialogOpen(true);
    };

    const handleViewImages = (e: React.MouseEvent, feedbackId: string) => {
        e.stopPropagation();
        setImagePreviewFeedbackId(feedbackId);
        setImagePreviewOpen(true);
    };

    // Count items per pipeline stage
    const stageCounts = useMemo(() => {
        const counts: Record<PipelineStage, number> = {
            untriaged: 0,
            your_decision: 0,
            agent_working: 0,
            test_results: 0,
            done: 0,
            all: feedback.length,
        };
        for (const item of feedback) {
            const stage = getItemStage(item);
            counts[stage]++;
        }
        return counts;
    }, [feedback]);

    const filteredAndSortedFeedback = useMemo(() => {
        let filtered = feedback.filter(item => {
            // Pipeline stage filter
            if (activeStage !== 'all') {
                const stage = pipelineStages.find(s => s.key === activeStage);
                if (stage && !stage.match(item)) return false;
            }

            // Secondary filters
            if (filterStatus !== 'all' && item.status !== filterStatus) return false;
            if (filterType !== 'all' && item.feedback_type !== filterType) return false;
            if (filterDecision !== 'all' && item.admin_decision !== filterDecision) return false;

            // Search
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                return (
                    item.description.toLowerCase().includes(search) ||
                    item.username?.toLowerCase().includes(search) ||
                    item.route.toLowerCase().includes(search)
                );
            }

            return true;
        });

        // Smart default sort per stage
        filtered.sort((a, b) => {
            let aVal: string | number, bVal: string | number;

            switch (sortField) {
                case 'created_at':
                    aVal = new Date(a.created_at).getTime();
                    bVal = new Date(b.created_at).getTime();
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
                    break;
                case 'feedback_type':
                    aVal = a.feedback_type;
                    bVal = b.feedback_type;
                    break;
                case 'username':
                    aVal = a.username || '';
                    bVal = b.username || '';
                    break;
                case 'work_priority':
                    if (a.work_priority === null && b.work_priority === null) return 0;
                    if (a.work_priority === null) return 1;
                    if (b.work_priority === null) return -1;
                    aVal = a.work_priority;
                    bVal = b.work_priority;
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [feedback, activeStage, searchTerm, filterStatus, filterType, filterDecision, sortField, sortDirection]);

    const getStatusOption = (status: FeedbackStatus) => {
        return statusOptions.find(s => s.value === status);
    };

    const hasActiveFilters = filterStatus !== 'all' || filterType !== 'all' || filterDecision !== 'all' || searchTerm !== '';

    if (loading) {
        return (
            <Card className="p-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading feedback...</p>
            </Card>
        );
    }

    return (
        <>
            <Card className="p-4">
                {/* Pipeline Stage Selector */}
                <div className="mb-4">
                    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                        {pipelineStages.map((stage, index) => {
                            const count = stageCounts[stage.key];
                            const isActive = activeStage === stage.key;
                            const isAdminTurn = stage.owner === 'admin';

                            return (
                                <React.Fragment key={stage.key}>
                                    {index > 0 && (
                                        <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0 hidden sm:block" />
                                    )}
                                    <button
                                        onClick={() => {
                                            setActiveStage(stage.key);
                                            // Reset secondary filters when changing stage
                                            setFilterStatus('all');
                                            setFilterType('all');
                                            setFilterDecision('all');
                                            // Smart sort defaults
                                            if (stage.key === 'agent_working') {
                                                setSortField('work_priority');
                                                setSortDirection('asc');
                                            } else {
                                                setSortField('created_at');
                                                setSortDirection('desc');
                                            }
                                        }}
                                        className={cn(
                                            'relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all flex-1 justify-center',
                                            isActive
                                                ? stage.activeColor
                                                : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {stage.icon}
                                        <span className="hidden sm:inline">{stage.label}</span>
                                        <span className="sm:hidden">{stage.shortLabel}</span>
                                        {count > 0 && (
                                            <span
                                                className={cn(
                                                    'min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-1',
                                                    isActive
                                                        ? 'bg-white/25 text-white'
                                                        : isAdminTurn && count > 0
                                                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                                        : 'bg-muted-foreground/10 text-muted-foreground'
                                                )}
                                            >
                                                {count}
                                            </span>
                                        )}
                                        {/* "Your turn" indicator for admin stages with items */}
                                        {!isActive && isAdminTurn && count > 0 && (
                                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        )}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                        {/* All items button */}
                        <div className="w-px h-6 bg-border mx-1 flex-shrink-0" />
                        <button
                            onClick={() => {
                                setActiveStage('all');
                                setSortField('created_at');
                                setSortDirection('desc');
                            }}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all',
                                activeStage === 'all'
                                    ? 'bg-foreground text-background'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                            )}
                        >
                            All
                            <span className={cn(
                                'min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-1',
                                activeStage === 'all' ? 'bg-white/25 text-white dark:bg-black/25 dark:text-black' : 'bg-muted-foreground/10 text-muted-foreground',
                            )}>
                                {feedback.length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Search + Filter Toggle */}
                <div className="flex gap-3 mb-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search description, user, or route..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-9"
                        />
                    </div>
                    <Button
                        variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="gap-1.5 h-9"
                    >
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showFilters && 'rotate-180')} />
                        Filters
                        {hasActiveFilters && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadFeedback} className="h-9">
                        Refresh
                    </Button>
                </div>

                {/* Collapsible Filters */}
                {showFilters && (
                    <div className="flex flex-col md:flex-row gap-3 mb-3 p-3 bg-muted/30 rounded-lg border">
                        <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FeedbackStatus | 'all')}>
                            <SelectTrigger className="w-full md:w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {statusOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterType} onValueChange={(value) => setFilterType(value as FeedbackType | 'all')}>
                            <SelectTrigger className="w-full md:w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="bug">Bug Report</SelectItem>
                                <SelectItem value="feature">Feature Request</SelectItem>
                                <SelectItem value="suggestion">Suggestion</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterDecision} onValueChange={(value) => setFilterDecision(value as AdminDecision | 'all')}>
                            <SelectTrigger className="w-full md:w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Decision" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Decisions</SelectItem>
                                {Object.entries(ADMIN_DECISION_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => {
                                    setFilterStatus('all');
                                    setFilterType('all');
                                    setFilterDecision('all');
                                    setSearchTerm('');
                                }}
                            >
                                Clear all
                            </Button>
                        )}
                    </div>
                )}

                {/* Results count */}
                <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <span>
                        <strong className="text-foreground">{filteredAndSortedFeedback.length}</strong> item{filteredAndSortedFeedback.length !== 1 ? 's' : ''}
                        {activeStage !== 'all' && (
                            <> in <strong className="text-foreground">{pipelineStages.find(s => s.key === activeStage)?.label || 'All'}</strong></>
                        )}
                    </span>
                </div>

                {/* Table */}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="w-[70px]">
                                    <button
                                        onClick={() => handleSort('work_priority')}
                                        className="flex items-center gap-1 font-semibold hover:text-foreground"
                                    >
                                        <Hash className="w-3 h-3" />
                                        Pri
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[90px]">
                                    <button
                                        onClick={() => handleSort('feedback_type')}
                                        className="flex items-center gap-1 font-semibold hover:text-foreground"
                                    >
                                        Type
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[120px]">
                                    <button
                                        onClick={() => handleSort('status')}
                                        className="flex items-center gap-1 font-semibold hover:text-foreground"
                                    >
                                        Status
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[150px]">Decision</TableHead>
                                <TableHead className="w-[130px]">
                                    <button
                                        onClick={() => handleSort('username')}
                                        className="flex items-center gap-1 font-semibold hover:text-foreground"
                                    >
                                        User
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[100px]">
                                    <button
                                        onClick={() => handleSort('created_at')}
                                        className="flex items-center gap-1 font-semibold hover:text-foreground"
                                    >
                                        Created
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedFeedback.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-1">
                                            {activeStage === 'untriaged' && (
                                                <>
                                                    <Bot className="w-6 h-6 opacity-30 mb-1" />
                                                    <span className="text-sm">No untriaged items</span>
                                                    <span className="text-xs">All feedback has been analyzed</span>
                                                </>
                                            )}
                                            {activeStage === 'your_decision' && (
                                                <>
                                                    <CheckCircle2 className="w-6 h-6 opacity-30 mb-1" />
                                                    <span className="text-sm">Nothing needs your decision</span>
                                                    <span className="text-xs">All triaged items have been reviewed</span>
                                                </>
                                            )}
                                            {activeStage === 'agent_working' && (
                                                <>
                                                    <Bot className="w-6 h-6 opacity-30 mb-1" />
                                                    <span className="text-sm">No items in the work queue</span>
                                                    <span className="text-xs">Approve items to add them here</span>
                                                </>
                                            )}
                                            {activeStage === 'test_results' && (
                                                <>
                                                    <ClipboardCheck className="w-6 h-6 opacity-30 mb-1" />
                                                    <span className="text-sm">Nothing to test</span>
                                                    <span className="text-xs">Completed fixes will appear here for testing</span>
                                                </>
                                            )}
                                            {(activeStage === 'done' || activeStage === 'all') && (
                                                <span className="text-sm">No items found</span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAndSortedFeedback.map((item) => {
                                    const statusOption = getStatusOption(item.status);
                                    const decisionColors = ADMIN_DECISION_COLORS[item.admin_decision] || ADMIN_DECISION_COLORS.pending;
                                    const decisionLabel = ADMIN_DECISION_LABELS[item.admin_decision] || ADMIN_DECISION_LABELS.pending;
                                    const isTriaged = item.status === 'triaged';
                                    const needsDecision = (item.status === 'triaged' || item.status === 'new') &&
                                        (item.admin_decision === 'pending' || !item.admin_decision);
                                    const isApproved = item.admin_decision === 'approved';
                                    const isClosed = DONE_STATUSES.includes(item.status);
                                    const isDeferred = item.admin_decision === 'deferred';

                                    return (
                                        <TableRow
                                            key={item.id}
                                            className={cn(
                                                'hover:bg-muted/50 cursor-pointer',
                                                isApproved && !isClosed && 'bg-green-500/5',
                                                isDeferred && 'opacity-60',
                                            )}
                                            onClick={() => handleViewDetails(item)}
                                        >
                                            <TableCell>
                                                <div className="text-sm font-medium">
                                                    {item.work_priority !== null ? (
                                                        <span className="text-foreground/80">#{item.work_priority}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground/40">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    {feedbackTypeIcons[item.feedback_type]}
                                                    <span className="text-xs font-medium capitalize">{item.feedback_type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={item.status}
                                                    onValueChange={(value) => handleStatusChange(item.id, value as FeedbackStatus)}
                                                >
                                                    <SelectTrigger className="h-7 text-xs" onClick={(e) => e.stopPropagation()}>
                                                        <Badge className={`${statusOption?.color} border-0`}>
                                                            {statusOption?.label}
                                                        </Badge>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {statusOptions.map(option => (
                                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-start gap-2">
                                                    <p className="line-clamp-2 text-sm flex-1">{item.description}</p>
                                                    {isTriaged && item.ai_solution_proposal && (
                                                        <Badge
                                                            variant="outline"
                                                            className="flex-shrink-0 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800"
                                                            title="AI triaged with solution proposal"
                                                        >
                                                            <Brain className="w-3 h-3 mr-1 text-indigo-600 dark:text-indigo-400" />
                                                        </Badge>
                                                    )}
                                                    {item.image_urls && item.image_urls.length > 0 && (
                                                        <button
                                                            onClick={(e) => handleViewImages(e, item.id)}
                                                            className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-xs"
                                                            title="View screenshots"
                                                        >
                                                            <ImageIcon className="h-3 w-3" />
                                                            {item.image_urls.length}
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`${decisionColors.bg} ${decisionColors.text} border-0 text-xs`}>
                                                        {decisionLabel}
                                                    </Badge>
                                                    {needsDecision && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleQuickApprove(item.id);
                                                            }}
                                                            title="Quick approve"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">{item.username || 'Anonymous'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewDetails(item);
                                                    }}
                                                    className="h-7 px-2"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {selectedFeedback && (
                <FeedbackDetailDialog
                    feedback={selectedFeedback}
                    open={detailDialogOpen}
                    onOpenChange={setDetailDialogOpen}
                    onUpdate={loadFeedback}
                />
            )}

            <ImagePreviewModal
                open={imagePreviewOpen}
                onOpenChange={setImagePreviewOpen}
                feedbackId={imagePreviewFeedbackId}
            />
        </>
    );
}
