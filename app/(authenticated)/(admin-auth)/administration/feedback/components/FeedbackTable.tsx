'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAllFeedback, updateFeedback } from '@/actions/feedback.actions';
import { UserFeedback, FeedbackStatus, FeedbackType } from '@/types/feedback.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Sparkles, Lightbulb, HelpCircle, Search, ArrowUpDown, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import FeedbackDetailDialog from './FeedbackDetailDialog';
import { toast } from 'sonner';

const statusOptions: { value: FeedbackStatus; label: string; color: string }[] = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
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

type SortField = 'created_at' | 'status' | 'feedback_type' | 'username';
type SortDirection = 'asc' | 'desc';

type QuickFilter = 'open' | 'closed' | 'all';

export default function FeedbackTable() {
    const [feedback, setFeedback] = useState<UserFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    
    // Filters
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('open');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');
    const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all');
    
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

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleViewDetails = (item: UserFeedback) => {
        setSelectedFeedback(item);
        setDetailDialogOpen(true);
    };

    const filteredAndSortedFeedback = useMemo(() => {
        const closedStatuses: FeedbackStatus[] = ['resolved', 'closed', 'wont_fix'];
        const openStatuses: FeedbackStatus[] = ['new', 'in_review', 'in_progress'];
        
        let filtered = feedback.filter(item => {
            // Quick filter (open/closed/all)
            if (quickFilter === 'open' && !openStatuses.includes(item.status)) return false;
            if (quickFilter === 'closed' && !closedStatuses.includes(item.status)) return false;
            
            // Status filter
            if (filterStatus !== 'all' && item.status !== filterStatus) return false;
            
            // Type filter
            if (filterType !== 'all' && item.feedback_type !== filterType) return false;
            
            // Search filter
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

        // Sorting
        filtered.sort((a, b) => {
            let aVal: any, bVal: any;
            
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
                default:
                    return 0;
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [feedback, quickFilter, searchTerm, filterStatus, filterType, sortField, sortDirection]);

    const getStatusOption = (status: FeedbackStatus) => {
        return statusOptions.find(s => s.value === status);
    };

    if (loading) {
        return (
            <Card className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">Loading feedback...</p>
            </Card>
        );
    }

    return (
        <>
            <Card className="p-4">
                {/* Quick Filter Buttons */}
                <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg w-fit">
                    <Button
                        variant={quickFilter === 'open' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setQuickFilter('open')}
                        className="gap-2"
                    >
                        Open
                        {quickFilter === 'open' && (
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                                {feedback.filter(f => ['new', 'in_review', 'in_progress'].includes(f.status)).length}
                            </Badge>
                        )}
                    </Button>
                    <Button
                        variant={quickFilter === 'closed' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setQuickFilter('closed')}
                        className="gap-2"
                    >
                        Closed
                        {quickFilter === 'closed' && (
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                                {feedback.filter(f => ['resolved', 'closed', 'wont_fix'].includes(f.status)).length}
                            </Badge>
                        )}
                    </Button>
                    <Button
                        variant={quickFilter === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setQuickFilter('all')}
                    >
                        All
                    </Button>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search description, user, or route..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FeedbackStatus | 'all')}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {statusOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterType} onValueChange={(value) => setFilterType(value as FeedbackType | 'all')}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="bug">Bug Report</SelectItem>
                            <SelectItem value="feature">Feature Request</SelectItem>
                            <SelectItem value="suggestion">Suggestion</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                        Showing <strong>{filteredAndSortedFeedback.length}</strong> of <strong>{feedback.length}</strong> items
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadFeedback}
                    >
                        Refresh
                    </Button>
                </div>

                {/* Table */}
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-900">
                                <TableHead className="w-[100px]">
                                    <button
                                        onClick={() => handleSort('feedback_type')}
                                        className="flex items-center gap-1 font-semibold hover:text-gray-900 dark:hover:text-gray-100"
                                    >
                                        Type
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[120px]">
                                    <button
                                        onClick={() => handleSort('status')}
                                        className="flex items-center gap-1 font-semibold hover:text-gray-900 dark:hover:text-gray-100"
                                    >
                                        Status
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[150px]">
                                    <button
                                        onClick={() => handleSort('username')}
                                        className="flex items-center gap-1 font-semibold hover:text-gray-900 dark:hover:text-gray-100"
                                    >
                                        User
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[200px]">Route</TableHead>
                                <TableHead className="w-[120px]">
                                    <button
                                        onClick={() => handleSort('created_at')}
                                        className="flex items-center gap-1 font-semibold hover:text-gray-900 dark:hover:text-gray-100"
                                    >
                                        Created
                                        <ArrowUpDown className="w-3 h-3" />
                                    </button>
                                </TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedFeedback.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        No feedback found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAndSortedFeedback.map((item) => {
                                    const statusOption = getStatusOption(item.status);
                                    return (
                                        <TableRow 
                                            key={item.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer"
                                            onClick={() => handleViewDetails(item)}
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {feedbackTypeIcons[item.feedback_type]}
                                                    <span className="text-xs font-medium capitalize">
                                                        {item.feedback_type}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={item.status}
                                                    onValueChange={(value) => {
                                                        handleStatusChange(item.id, value as FeedbackStatus);
                                                    }}
                                                >
                                                    <SelectTrigger 
                                                        className="h-7 text-xs"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Badge className={`${statusOption?.color} border-0`}>
                                                            {statusOption?.label}
                                                        </Badge>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {statusOptions.map(option => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <p className="line-clamp-2 text-sm">
                                                    {item.description}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {item.username || 'Anonymous'}
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                {item.route}
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-600 dark:text-gray-400">
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
        </>
    );
}

