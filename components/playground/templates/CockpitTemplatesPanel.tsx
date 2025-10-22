'use client';

import React, { useState } from 'react';
import { TemplateLibraryPanel } from './TemplateLibraryPanel';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';
import { ContentBlock } from '@/features/rich-text-editor/config/contentBlocks';
import { CockpitPanelProps } from '../types';
import { useToast } from '@/components/ui/use-toast';

export default function CockpitTemplatesPanel({ playgroundControls }: CockpitPanelProps) {
    const [previewTemplate, setPreviewTemplate] = useState<ContentBlock | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const { toast } = useToast();

    const handleInsertTemplate = (template: ContentBlock) => {
        // Store the template in a way that the message editor can access it
        // We'll use localStorage as a temporary bridge
        localStorage.setItem('pendingTemplateInsert', JSON.stringify(template));
        
        // Dispatch custom event to notify message editors
        window.dispatchEvent(new CustomEvent('templateInsertRequested', {
            detail: { template }
        }));

        toast({
            title: 'Template Ready',
            description: `Click in any message editor to insert "${template.label}"`,
            duration: 3000
        });
    };

    const handlePreviewTemplate = (template: ContentBlock) => {
        setPreviewTemplate(template);
        setIsPreviewOpen(true);
    };

    const handleCopyTemplate = (template: ContentBlock) => {
        toast({
            title: 'Copied!',
            description: 'Template copied to clipboard',
            duration: 2000
        });
    };

    return (
        <>
            <TemplateLibraryPanel
                onInsertTemplate={handleInsertTemplate}
                onPreviewTemplate={handlePreviewTemplate}
                className="h-full"
            />
            <TemplatePreviewDialog
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                template={previewTemplate}
                onInsert={handleInsertTemplate}
                onCopy={handleCopyTemplate}
            />
        </>
    );
}

