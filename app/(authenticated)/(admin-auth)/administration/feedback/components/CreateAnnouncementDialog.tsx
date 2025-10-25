'use client';

import React, { useState } from 'react';
import { createAnnouncement } from '@/actions/feedback.actions';
import { AnnouncementType } from '@/types/feedback.types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface CreateAnnouncementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const announcementTypes: { value: AnnouncementType; label: string; description: string }[] = [
    { value: 'info', label: 'Info', description: 'General information' },
    { value: 'warning', label: 'Warning', description: 'Important warning' },
    { value: 'critical', label: 'Critical', description: 'Critical issue' },
    { value: 'update', label: 'Update', description: 'System update' },
];

export default function CreateAnnouncementDialog({ open, onOpenChange, onSuccess }: CreateAnnouncementDialogProps) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [announcementType, setAnnouncementType] = useState<AnnouncementType>('info');
    const [minDisplaySeconds, setMinDisplaySeconds] = useState(3);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createAnnouncement({
                title: title.trim(),
                message: message.trim(),
                announcement_type: announcementType,
                min_display_seconds: minDisplaySeconds,
            });

            if (result.success) {
                toast.success('Announcement created successfully!');
                // Reset form
                setTitle('');
                setMessage('');
                setAnnouncementType('info');
                setMinDisplaySeconds(3);
                onOpenChange(false);
                // Trigger refresh callback
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                toast.error('Failed to create announcement: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating announcement:', error);
            toast.error('An error occurred while creating the announcement');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create New Announcement</DialogTitle>
                    <DialogDescription>
                        Create a system-wide announcement that will be shown to users on their next login.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Major System Update"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Type */}
                    <div className="space-y-2">
                        <Label htmlFor="type">Announcement Type *</Label>
                        <Select
                            value={announcementType}
                            onValueChange={(value) => setAnnouncementType(value as AnnouncementType)}
                            disabled={isSubmitting}
                        >
                            <SelectTrigger id="type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {announcementTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{type.label}</span>
                                            <span className="text-xs text-gray-500">{type.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Enter the announcement message here. Be clear and concise about what users need to know."
                            className="min-h-[200px]"
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-gray-500">
                            This message will be displayed prominently to users. Include information about what changed and what actions they should take.
                        </p>
                    </div>

                    {/* Min Display Seconds */}
                    <div className="space-y-2">
                        <Label htmlFor="displaySeconds">Minimum Display Time (seconds)</Label>
                        <Input
                            id="displaySeconds"
                            type="number"
                            min={1}
                            max={30}
                            value={minDisplaySeconds}
                            onChange={(e) => setMinDisplaySeconds(parseInt(e.target.value) || 3)}
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-gray-500">
                            Users must wait this many seconds before they can close the announcement.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !title.trim() || !message.trim()}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Announcement'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

