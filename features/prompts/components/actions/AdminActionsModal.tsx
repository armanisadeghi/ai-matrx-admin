'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, Sparkles, Settings } from 'lucide-react';
import { PromptsData } from '@/features/prompts/types/core';
import { PublishSystemPromptModal } from './PublishSystemPromptModal';
import { SaveTemplateModal } from '../templates/SaveTemplateModal';

interface AdminActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prompt: PromptsData;
    onTemplateCreated?: () => void;
    onSystemPromptCreated?: () => void;
}

export function AdminActionsModal({
    isOpen,
    onClose,
    prompt,
    onTemplateCreated,
    onSystemPromptCreated
}: AdminActionsModalProps) {
    const [showPublishSystemModal, setShowPublishSystemModal] = useState(false);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

    const handlePublishAsSystem = () => {
        setShowPublishSystemModal(true);
        onClose();
    };

    const handleSaveAsTemplate = () => {
        setShowSaveTemplateModal(true);
        onClose();
    };

    // Get system message content for template
    const systemMessageContent = prompt.messages?.find(m => m.role === 'system')?.content || '';

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Admin Actions
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Publish as System Prompt */}
                        <Card className="cursor-pointer hover:border-purple-500 hover:shadow-md transition-all" onClick={handlePublishAsSystem}>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                                        <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">Publish as System Prompt</CardTitle>
                                        <CardDescription className="mt-1">
                                            Make this prompt available globally for context menus, buttons, and cards
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Sparkles className="h-3 w-3" />
                                    <span>Creates a system-wide reusable prompt</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Save as Template */}
                        <Card className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all" onClick={handleSaveAsTemplate}>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">Save as Message Template</CardTitle>
                                        <CardDescription className="mt-1">
                                            Save the system message as a reusable template for future prompts
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <FileText className="h-3 w-3" />
                                    <span>Quick-insert template for message content</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Publish System Prompt Modal */}
            {showPublishSystemModal && (
                <PublishSystemPromptModal
                    isOpen={showPublishSystemModal}
                    onClose={() => setShowPublishSystemModal(false)}
                    prompt={prompt}
                    onSuccess={() => {
                        setShowPublishSystemModal(false);
                        onSystemPromptCreated?.();
                    }}
                />
            )}

            {/* Save Template Modal */}
            {showSaveTemplateModal && (
                <SaveTemplateModal
                    isOpen={showSaveTemplateModal}
                    onClose={() => setShowSaveTemplateModal(false)}
                    role="system"
                    currentContent={systemMessageContent}
                    onSave={(label, content, tags) => {
                        setShowSaveTemplateModal(false);
                        onTemplateCreated?.();
                    }}
                />
            )}
        </>
    );
}
