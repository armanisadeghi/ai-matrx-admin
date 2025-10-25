'use client';

import React, { useState, useEffect } from 'react';
import { updateAnnouncement } from '@/actions/feedback.actions';
import { AnnouncementType, SystemAnnouncement } from '@/types/feedback.types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface EditAnnouncementDialogProps {
    announcement: SystemAnnouncement | null;
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

export default function EditAnnouncementDialog({ announcement, open, onOpenChange, onSuccess }: EditAnnouncementDialogProps) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [announcementType, setAnnouncementType] = useState<AnnouncementType>('info');
    const [minDisplaySeconds, setMinDisplaySeconds] = useState(3);
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (announcement) {
            setTitle(announcement.title);
            setMessage(announcement.message);
            setAnnouncementType(announcement.announcement_type);
            setMinDisplaySeconds(announcement.min_display_seconds);
            setIsActive(announcement.is_active);
        }
    }, [announcement]);

    const handleSubmit = async () => {
        if (!announcement) return;
        
        if (!title.trim() || !message.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await updateAnnouncement(announcement.id, {
                title: title.trim(),
                message: message.trim(),
                announcement_type: announcementType,
                min_display_seconds: minDisplaySeconds,
                is_active: isActive,
            });

            if (result.success) {
                toast.success('Announcement updated successfully!');
                onOpenChange(false);
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                toast.error('Failed to update announcement: ' + result.error);
            }
        } catch (error) {
            console.error('Error updating announcement:', error);
            toast.error('An error occurred while updating the announcement');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!announcement) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Announcement</DialogTitle>
                    <DialogDescription>
                        Update the announcement details. Changes will affect how users see this announcement.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Active Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div>
                            <Label htmlFor="active" className="font-medium">Active Status</Label>
                            <p className="text-xs text-gray-500">Control whether this announcement is shown to users</p>
                        </div>
                        <Switch
                            id="active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                            disabled={isSubmitting}
                        />
                    </div>

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
                            placeholder="Enter the announcement message here..."
                            className="min-h-[200px]"
                            disabled={isSubmitting}
                        />
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
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

