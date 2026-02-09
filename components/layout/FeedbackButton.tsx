'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bug, Send, X, Check, PartyPopper, Clipboard, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { submitFeedback, getUserFeedback } from '@/actions/feedback.actions';
import { FeedbackType } from '@/types/feedback.types';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { setModulePreferences, saveModulePreferencesToDatabase } from '@/lib/redux/slices/userPreferencesSlice';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { FileUploadWithStorage, UploadedFileResult } from '@/components/ui/file-upload/FileUploadWithStorage';
import { useFileUploadWithStorage } from '@/components/ui/file-upload/useFileUploadWithStorage';
import { toast } from 'sonner';

interface FeedbackButtonProps {
    className?: string;
}

const feedbackTypes: { value: FeedbackType; label: string }[] = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'other', label: 'Other' },
];

export default function FeedbackButton({ className = '' }: FeedbackButtonProps) {
    const dispatch = useAppDispatch();
    const pathname = usePathname();
    const username = useAppSelector(state => state.user.userMetadata.preferredUsername || state.user.userMetadata.fullName || state.user.email || 'Anonymous');
    const feedbackFeatureViewCount = useAppSelector(state => state.userPreferences.system.feedbackFeatureViewCount);
    const [isOpen, setIsOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
    const [description, setDescription] = useState('');
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPasting, setIsPasting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [feedbackStats, setFeedbackStats] = useState<{ total: number; pending: number; resolved: number } | null>(null);
    const [showNewFeatureHighlight, setShowNewFeatureHighlight] = useState(false);

    // Reset submitted state after dropdown close animation completes
    useEffect(() => {
        if (!isOpen && (submitted || feedbackStats)) {
            const timer = setTimeout(() => {
                setSubmitted(false);
                setFeedbackStats(null);
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isOpen, submitted, feedbackStats]);

    // Upload hook for programmatic paste uploads only
    const { uploadToPublicUserAssets, isLoading: isUploadHookLoading } = useFileUploadWithStorage('user-public-assets', 'feedback-images');

    // Show new feature highlight for first 5 views
    useEffect(() => {
        if (feedbackFeatureViewCount < 5) {
            setShowNewFeatureHighlight(true);
            // Increment view count after 3 seconds
            const timer = setTimeout(() => {
                const newCount = feedbackFeatureViewCount + 1;
                dispatch(setModulePreferences({
                    module: 'system',
                    preferences: {
                        feedbackFeatureViewCount: newCount,
                    },
                }));
                dispatch(saveModulePreferencesToDatabase({
                    module: 'system',
                    preferences: {
                        feedbackFeatureViewCount: newCount,
                    },
                }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [feedbackFeatureViewCount, dispatch]);

    // Upload a pasted image via the storage hook
    const uploadPastedImage = useCallback(async (file: File) => {
        setIsPasting(true);
        try {
            const result = await uploadToPublicUserAssets(file);
            if (result?.url) {
                setUploadedImages(prev => [...prev, result.url]);
                toast.success('Image pasted and uploaded');
            }
        } catch (err) {
            console.error('Paste upload failed:', err);
            toast.error('Failed to upload pasted image');
        } finally {
            setIsPasting(false);
        }
    }, [uploadToPublicUserAssets]);

    // Clipboard paste handler (Ctrl+V when form is open)
    useEffect(() => {
        if (!isOpen) return;

        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        const timestamp = Date.now();
                        const ext = file.type.split('/')[1] || 'png';
                        const namedFile = new File([file], `pasted-image-${timestamp}.${ext}`, { type: file.type });
                        await uploadPastedImage(namedFile);
                    }
                    break;
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [isOpen, uploadPastedImage]);

    const handleSubmit = async () => {
        if (!description.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await submitFeedback({
                feedback_type: feedbackType,
                route: pathname,
                description: description.trim(),
                image_urls: uploadedImages.length > 0 ? uploadedImages : undefined,
            });

            if (result.success) {
                setSubmitted(true);
                setDescription('');
                setUploadedImages([]);

                // Fetch user's feedback stats to show in the confirmation
                getUserFeedback().then(res => {
                    if (res.success && res.data) {
                        const items = res.data;
                        const pending = items.filter(i => ['new', 'in_progress'].includes(i.status)).length;
                        const resolved = items.filter(i => ['resolved', 'closed'].includes(i.status)).length;
                        setFeedbackStats({ total: items.length, pending, resolved });
                    }
                }).catch(() => { /* stats are optional, don't block */ });
            } else {
                toast.error('Failed to submit feedback: ' + result.error);
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setDescription('');
        setFeedbackType('bug');
        setUploadedImages([]);
        setSubmitted(false);
        setIsOpen(false);
    };

    // Callback from FileUploadWithStorage (drag/click uploads)
    const handleUploadComplete = (results: UploadedFileResult[]) => {
        const urls = results.map(r => r.url);
        setUploadedImages(prev => [...prev, ...urls]);
    };

    // Remove an uploaded image
    const removeImage = useCallback((index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    // Paste button handler (uses Clipboard API)
    const handlePasteButton = useCallback(async () => {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find(t => t.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const ext = imageType.split('/')[1] || 'png';
                    const file = new File([blob], `pasted-image-${Date.now()}.${ext}`, { type: imageType });
                    await uploadPastedImage(file);
                    return;
                }
            }
            toast.info('No image found in clipboard');
        } catch {
            toast.info('Copy an image to your clipboard first, then click Paste or press Ctrl+V');
        }
    }, [uploadPastedImage]);

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <div className="relative">
                    <button
                        className={`p-2 rounded-lg transition-all duration-200 ease-in-out ${className}`}
                        aria-label="Submit Feedback"
                        onClick={() => {
                            // Dismiss highlight on click
                            if (showNewFeatureHighlight) {
                                setShowNewFeatureHighlight(false);
                            }
                        }}
                    >
                        <Bug className="w-5 h-5" />
                    </button>
                    
                    {/* New Feature Highlight */}
                    {showNewFeatureHighlight && (
                        <>
                            {/* Pulsing ring animation */}
                            <span className="absolute top-0 right-0 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                            
                            {/* Tooltip */}
                            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 z-50">
                                <div className="bg-blue-600 text-white text-xs font-medium px-3 py-2 pr-8 rounded-lg shadow-lg whitespace-nowrap animate-bounce relative">
                                    <PartyPopper className="w-4 h-4 inline mr-1" /> NEW! Report bugs & issues
                                    <button
                                        onPointerDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            setShowNewFeatureHighlight(false);
                                            // Mark as seen by setting count to max
                                            dispatch(setModulePreferences({
                                                module: 'system',
                                                preferences: {
                                                    feedbackFeatureViewCount: 5,
                                                },
                                            }));
                                            dispatch(saveModulePreferencesToDatabase({
                                                module: 'system',
                                                preferences: {
                                                    feedbackFeatureViewCount: 5,
                                                },
                                            }));
                                        }}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 hover:bg-blue-700 rounded p-0.5 transition-colors"
                                        aria-label="Dismiss"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45"></div>
                                </div>
                            </div>
                            
                            {/* Background glow pulse */}
                            <div className="absolute inset-0 rounded-lg animate-pulse bg-blue-500 opacity-20 -z-10"></div>
                        </>
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                align="end" 
                className="w-[400px] p-0"
                onInteractOutside={(e) => {
                    // Prevent closing while actively submitting
                    if (isSubmitting) {
                        e.preventDefault();
                    }
                    // When submitted, let the dropdown close naturally.
                    // State reset happens via useEffect after close animation.
                }}
            >
                <Card className="border-0 shadow-none">
                    {submitted ? (
                        // Success Message
                        <div className="p-6 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-green-100 dark:bg-green-900/30">
                                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-gray-100">
                                Thank You!
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Your feedback has been submitted and we&apos;ll get on it.
                            </p>

                            {/* Stats */}
                            {feedbackStats && (
                                <div className="flex justify-center gap-4 mb-3 text-xs">
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-foreground">{feedbackStats.total}</div>
                                        <div className="text-muted-foreground">Submitted</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{feedbackStats.pending}</div>
                                        <div className="text-muted-foreground">Pending</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-600 dark:text-green-400">{feedbackStats.resolved}</div>
                                        <div className="text-muted-foreground">Resolved</div>
                                    </div>
                                </div>
                            )}

                            {/* Link to feedback portal */}
                            <Link
                                href="/settings/feedback"
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                View all your submissions
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            {/* Close button */}
                            <div className="mt-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs text-muted-foreground"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // Feedback Form
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Submit Feedback
                                </h3>
                                <button
                                    onClick={handleCancel}
                                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Form Content */}
                            <div className="p-4 space-y-4">
                                {/* Feedback Type */}
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                        Type
                                    </label>
                                    <Select
                                        value={feedbackType}
                                        onValueChange={(value) => setFeedbackType(value as FeedbackType)}
                                        disabled={isSubmitting}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {feedbackTypes.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Auto-captured info */}
                                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    <div>
                                        <span className="font-medium text-blue-500">User:</span> {username}
                                    </div>
                                    <div>
                                        <span className="font-medium text-blue-500">Route:</span> {pathname}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                        Description
                                    </label>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Please describe your feedback in detail..."
                                        className="min-h-[100px] resize-none"
                                        disabled={isSubmitting}
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Tip: Paste screenshots anytime with Ctrl+V
                                    </p>
                                </div>

                                {/* Screenshot/Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                        Screenshots (optional)
                                    </label>
                                    
                                    {/* Original file uploader -- handles drag/drop and click-to-upload */}
                                    <FileUploadWithStorage
                                        bucket="userContent"
                                        path="feedback-images"
                                        saveTo="public"
                                        onUploadComplete={handleUploadComplete}
                                        multiple={true}
                                        useMiniUploader={true}
                                        maxHeight="150px"
                                    />

                                    {/* Paste button */}
                                    <div className="mt-2 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handlePasteButton}
                                            disabled={isSubmitting || isPasting}
                                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-background hover:bg-accent text-foreground transition-colors disabled:opacity-50"
                                        >
                                            <Clipboard className="w-3 h-3" />
                                            {isPasting ? 'Pasting...' : 'Paste Image'}
                                        </button>
                                        <span className="text-[10px] text-muted-foreground">
                                            or Ctrl+V
                                        </span>
                                    </div>

                                    {/* Image thumbnails with remove */}
                                    {uploadedImages.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-muted-foreground mb-1.5">
                                                {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} attached
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {uploadedImages.map((url, index) => (
                                                    <div
                                                        key={`img-${index}`}
                                                        className="relative group w-14 h-14 rounded-md overflow-hidden border border-border bg-muted"
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={`Attachment ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(index)}
                                                            className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                            aria-label={`Remove image ${index + 1}`}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 justify-end pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleCancel}
                                        disabled={isSubmitting}
                                        size="sm"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !description.trim()}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        {isSubmitting ? (
                                            'Submitting...'
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Submit
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </Card>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
