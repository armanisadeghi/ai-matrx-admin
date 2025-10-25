'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, X, Check } from 'lucide-react';
import { submitFeedback } from '@/actions/feedback.actions';
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
    const [submitted, setSubmitted] = useState(false);
    const [showNewFeatureHighlight, setShowNewFeatureHighlight] = useState(false);

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
                toast.success('Feedback submitted successfully! Thank you.');
                // Reset after 2 seconds
                setTimeout(() => {
                    setSubmitted(false);
                    setIsOpen(false);
                }, 2000);
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

    const handleUploadComplete = (results: UploadedFileResult[]) => {
        const urls = results.map(r => r.url);
        setUploadedImages(prev => [...prev, ...urls]);
    };

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
                        <MessageSquare className="w-5 h-5" />
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
                                    🎉 NEW! Report bugs & issues
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
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
                    // Prevent closing when clicking inside
                    if (isSubmitting || submitted) {
                        e.preventDefault();
                    }
                }}
            >
                <Card className="border-0 shadow-none">
                    {submitted ? (
                        // Success Message
                        <div className="p-6 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-green-100 dark:bg-green-900/30">
                                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                                Thank You!
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Your feedback has been submitted successfully.
                            </p>
                        </div>
                    ) : (
                        // Feedback Form
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
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
                                </div>

                                {/* Screenshot/Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                        Screenshots (optional)
                                    </label>
                                    <FileUploadWithStorage
                                        bucket="userContent"
                                        path="feedback-images"
                                        saveTo="public"
                                        onUploadComplete={handleUploadComplete}
                                        multiple={true}
                                        useMiniUploader={true}
                                        maxHeight="150px"
                                    />
                                    {uploadedImages.length > 0 && (
                                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                            {uploadedImages.length} image{uploadedImages.length !== 1 ? 's' : ''} uploaded
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

