'use client';

import React, { useState, useEffect } from 'react';
import { updateFeedback } from '@/actions/feedback.actions';
import { UserFeedback, FeedbackStatus, FeedbackType } from '@/types/feedback.types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Sparkles, Lightbulb, HelpCircle, Calendar, User, MapPin, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { toast } from 'sonner';

interface FeedbackDetailDialogProps {
    feedback: UserFeedback;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: () => void;
}

const statusOptions: { value: FeedbackStatus; label: string; color: string }[] = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
    { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
    { value: 'wont_fix', label: "Won't Fix", color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
];

const feedbackTypeIcons: Record<string, React.ReactNode> = {
    bug: <AlertCircle className="w-5 h-5 text-red-500" />,
    feature: <Sparkles className="w-5 h-5 text-purple-500" />,
    suggestion: <Lightbulb className="w-5 h-5 text-yellow-500" />,
    other: <HelpCircle className="w-5 h-5 text-gray-500" />,
};

export default function FeedbackDetailDialog({ feedback, open, onOpenChange, onUpdate }: FeedbackDetailDialogProps) {
    const [description, setDescription] = useState(feedback.description);
    const [feedbackType, setFeedbackType] = useState<FeedbackType>(feedback.feedback_type);
    const [route, setRoute] = useState(feedback.route);
    const [adminNotes, setAdminNotes] = useState(feedback.admin_notes || '');
    const [status, setStatus] = useState(feedback.status);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setDescription(feedback.description);
        setFeedbackType(feedback.feedback_type);
        setRoute(feedback.route);
        setAdminNotes(feedback.admin_notes || '');
        setStatus(feedback.status);
    }, [feedback]);

    const handleSave = async () => {
        if (!description.trim()) {
            toast.error('Description cannot be empty');
            return;
        }

        setIsSaving(true);
        try {
            // Build updates object with all changed fields
            const updates: any = {};
            
            if (description !== feedback.description) {
                updates.description = description;
            }
            
            if (feedbackType !== feedback.feedback_type) {
                updates.feedback_type = feedbackType;
            }
            
            if (route !== feedback.route) {
                updates.route = route;
            }
            
            if (status !== feedback.status) {
                updates.status = status;
            }
            
            if (adminNotes !== (feedback.admin_notes || '')) {
                updates.admin_notes = adminNotes;
            }

            if (Object.keys(updates).length > 0) {
                const result = await updateFeedback(feedback.id, updates);
                if (result.success) {
                    toast.success('Feedback updated successfully');
                    onUpdate();
                    onOpenChange(false);
                } else {
                    toast.error(`Failed to save changes: ${result.error}`);
                }
            } else {
                onOpenChange(false);
            }
        } catch (error) {
            console.error('Error saving feedback:', error);
            toast.error('An error occurred while saving. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const statusOption = statusOptions.find(s => s.value === status);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        {feedbackTypeIcons[feedback.feedback_type]}
                        Feedback Details
                    </DialogTitle>
                    <DialogDescription>
                        View and manage feedback submission
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Read-only Metadata */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-xs text-gray-500">User</div>
                                <div className="font-medium">{feedback.username || 'Anonymous'}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <div>
                                <div className="text-xs text-gray-500">Submitted</div>
                                <div className="font-medium">
                                    {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Editable Type */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Feedback Type</label>
                        <Select value={feedbackType} onValueChange={(value) => setFeedbackType(value as FeedbackType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bug">Bug Report</SelectItem>
                                <SelectItem value="feature">Feature Request</SelectItem>
                                <SelectItem value="suggestion">Suggestion</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Editable Route */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Route</label>
                        <Input
                            value={route}
                            onChange={(e) => setRoute(e.target.value)}
                            placeholder="/path/to/page"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Status</label>
                        <Select value={status} onValueChange={(value) => setStatus(value as FeedbackStatus)}>
                            <SelectTrigger>
                                <Badge className={statusOption?.color}>
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
                    </div>

                    {/* Editable Description */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Feedback description..."
                            className="min-h-[120px]"
                        />
                    </div>

                    {/* Attached Images */}
                    {feedback.image_urls && feedback.image_urls.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Attached Screenshots ({feedback.image_urls.length})
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {feedback.image_urls.map((url, index) => (
                                    <a
                                        key={index}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
                                    >
                                        <Image
                                            src={url}
                                            alt={`Screenshot ${index + 1}`}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admin Notes */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Admin Notes</label>
                        <Textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Add notes about this feedback..."
                            className="min-h-[120px]"
                        />
                    </div>

                    {/* Resolution Info */}
                    {feedback.resolved_at && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="text-sm">
                                <div className="font-medium text-green-800 dark:text-green-400 mb-1">
                                    Resolved
                                </div>
                                <div className="text-green-700 dark:text-green-300">
                                    {formatDistanceToNow(new Date(feedback.resolved_at), { addSuffix: true })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

