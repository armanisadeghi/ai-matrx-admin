'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { getUserFeedback, confirmFeedbackResolution, updateUserOwnFeedback } from '@/actions/feedback.actions';
import type { UserFeedback } from '@/types/feedback.types';
import {
    FEEDBACK_STATUS_LABELS,
    FEEDBACK_STATUS_COLORS,
} from '@/types/feedback.types';
import { Bug, Lightbulb, MessageSquare, HelpCircle, ChevronDown, ChevronRight, CheckCircle2, Loader2, ImageIcon, Pencil, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

function FeedbackTypeIcon({ type }: { type: string }) {
    switch (type) {
        case 'bug':
            return <Bug className="h-4 w-4 text-red-500" />;
        case 'feature':
            return <Lightbulb className="h-4 w-4 text-yellow-500" />;
        case 'suggestion':
            return <MessageSquare className="h-4 w-4 text-blue-500" />;
        default:
            return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
    }
}

function StatusBadge({ status }: { status: string }) {
    const colors = FEEDBACK_STATUS_COLORS[status as keyof typeof FEEDBACK_STATUS_COLORS] || {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
    };
    const label = FEEDBACK_STATUS_LABELS[status as keyof typeof FEEDBACK_STATUS_LABELS] || status;

    return (
        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors.bg, colors.text)}>
            {label}
        </span>
    );
}

function FeedbackItem({ item, onUpdate }: { item: UserFeedback; onUpdate: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [confirmed, setConfirmed] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editDescription, setEditDescription] = useState(item.description);
    const [editType, setEditType] = useState(item.feedback_type);
    const [isSaving, setIsSaving] = useState(false);

    const handleConfirm = () => {
        startTransition(async () => {
            const result = await confirmFeedbackResolution(item.id);
            if (result.success) {
                setConfirmed(true);
            }
        });
    };

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditDescription(item.description);
        setEditType(item.feedback_type);
        setIsEditing(true);
        if (!expanded) setExpanded(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditDescription(item.description);
        setEditType(item.feedback_type);
    };

    const handleSaveEdit = async () => {
        if (!editDescription.trim()) {
            toast.error('Description cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            const updates: { description?: string; feedback_type?: 'bug' | 'feature' | 'suggestion' | 'other' } = {};
            if (editDescription !== item.description) updates.description = editDescription;
            if (editType !== item.feedback_type) updates.feedback_type = editType;

            if (Object.keys(updates).length === 0) {
                setIsEditing(false);
                return;
            }

            const result = await updateUserOwnFeedback(item.id, updates);
            if (result.success) {
                toast.success('Feedback updated');
                setIsEditing(false);
                onUpdate();
            } else {
                toast.error(result.error || 'Failed to update');
            }
        } catch {
            toast.error('An error occurred');
        } finally {
            setIsSaving(false);
        }
    };

    const canEdit = item.status === 'new';
    const canConfirm = item.status === 'resolved' && !confirmed;
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
            {/* Summary Row */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
                {expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}

                <FeedbackTypeIcon type={isEditing ? editType : item.feedback_type} />

                <span className="flex-1 truncate text-sm text-foreground">
                    {item.description.length > 80
                        ? item.description.slice(0, 80) + '...'
                        : item.description}
                </span>

                {canEdit && !isEditing && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={handleStartEdit}
                        title="Edit this submission"
                    >
                        <Pencil className="h-3 w-3" />
                    </Button>
                )}

                <StatusBadge status={confirmed ? 'closed' : item.status} />

                <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
                    {formattedDate}
                </span>
            </button>

            {/* Expanded Detail */}
            {expanded && (
                <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/30">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {isEditing ? (
                                <Select value={editType} onValueChange={(v) => setEditType(v as typeof editType)}>
                                    <SelectTrigger className="h-6 w-auto text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bug">Bug</SelectItem>
                                        <SelectItem value="feature">Feature</SelectItem>
                                        <SelectItem value="suggestion">Suggestion</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Badge variant="outline" className="text-xs capitalize">
                                    {item.feedback_type}
                                </Badge>
                            )}
                            <span>on</span>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.route}</code>
                            <span className="sm:hidden">{formattedDate}</span>
                        </div>

                        {isEditing ? (
                            <div className="space-y-2">
                                <Textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="min-h-[100px] text-sm"
                                    placeholder="Describe the issue..."
                                />
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={isSaving}
                                        className="gap-1.5"
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Save className="h-3.5 w-3.5" />
                                        )}
                                        Save
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        className="gap-1.5"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-foreground whitespace-pre-wrap">{item.description}</p>
                        )}
                    </div>

                    {/* Images */}
                    {item.image_urls && item.image_urls.length > 0 && (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Attached Screenshots ({item.image_urls.length})
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {item.image_urls.map((url, i) => (
                                    <a
                                        key={i}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-20 h-20 rounded border border-border overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={url}
                                            alt={`Screenshot ${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resolution Notes */}
                    {item.resolution_notes && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-md p-3">
                            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Resolution Notes</p>
                            <p className="text-sm text-foreground">{item.resolution_notes}</p>
                        </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Submitted: {formattedDate}</span>
                        {item.resolved_at && (
                            <span>
                                Resolved:{' '}
                                {new Date(item.resolved_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </span>
                        )}
                        {item.user_confirmed_at && (
                            <span>
                                Confirmed:{' '}
                                {new Date(item.user_confirmed_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </span>
                        )}
                    </div>

                    {/* Confirm Button */}
                    {canConfirm && (
                        <div className="pt-1">
                            <Button
                                size="sm"
                                onClick={handleConfirm}
                                disabled={isPending}
                                className="gap-1.5"
                            >
                                {isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                Confirm Fix Works
                            </Button>
                        </div>
                    )}

                    {confirmed && (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />
                            Thank you for confirming!
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default function UserFeedbackPage() {
    const [items, setItems] = useState<UserFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadItems = async () => {
        const result = await getUserFeedback();
        if (result.success && result.data) {
            setItems(result.data);
        } else {
            setError(result.error || 'Failed to load feedback');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadItems();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-destructive">{error}</p>
            </div>
        );
    }

    const activeItems = items.filter((i) => !['closed', 'wont_fix'].includes(i.status));
    const closedItems = items.filter((i) => ['closed', 'wont_fix'].includes(i.status));

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-foreground">My Feedback</h2>
                <p className="text-sm text-muted-foreground">
                    Track the status of your bug reports and feature requests.
                </p>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No feedback submitted yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Use the feedback button in the bottom-right corner to report bugs or request features.
                    </p>
                </div>
            ) : (
                <>
                    {/* Active Items */}
                    {activeItems.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Active ({activeItems.length})
                            </h3>
                            <div className="space-y-2">
                                {activeItems.map((item) => (
                                    <FeedbackItem key={item.id} item={item} onUpdate={loadItems} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Closed Items */}
                    {closedItems.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Closed ({closedItems.length})
                            </h3>
                            <div className="space-y-2">
                                {closedItems.map((item) => (
                                    <FeedbackItem key={item.id} item={item} onUpdate={loadItems} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
