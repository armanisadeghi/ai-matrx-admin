'use client';

import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import AiModelDetailPanel from '../components/AiModelDetailPanel';
import { aiModelService } from '../service';
import type { AiModelRow, AiProvider } from '../types';

interface ModelDetailSheetProps {
    modelId: string | null;
    allModels: AiModelRow[];
    onClose: () => void;
    onSaved: (model: AiModelRow) => void;
}

export default function ModelDetailSheet({ modelId, allModels, onClose, onSaved }: ModelDetailSheetProps) {
    const [providers, setProviders] = useState<AiProvider[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(false);

    // Load providers once on first open
    useEffect(() => {
        if (!modelId || providers.length > 0) return;
        setLoadingProviders(true);
        aiModelService.fetchProviders()
            .then(setProviders)
            .catch(console.error)
            .finally(() => setLoadingProviders(false));
    }, [modelId, providers.length]);

    const model = allModels.find((m) => m.id === modelId) ?? null;

    return (
        <Sheet open={!!modelId} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent
                side="right"
                className="w-[600px] sm:max-w-[600px] p-0 flex flex-col overflow-hidden"
                // Prevent the detail panel's own click-outside handler from firing on Sheet overlay clicks
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                {loadingProviders ? (
                    <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                    </div>
                ) : model ? (
                    <AiModelDetailPanel
                        model={model}
                        isNew={false}
                        providers={providers}
                        allModels={allModels}
                        onClose={onClose}
                        onSaved={(saved) => { onSaved(saved); }}
                        onDeleted={onClose}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                        Model not found
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

/** Small icon button used in every audit table row to open the detail sheet */
export function OpenDetailButton({ onClick }: { onClick: () => void }) {
    return (
        <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            title="Open full model editor"
        >
            <ExternalLink className="h-3.5 w-3.5" />
        </Button>
    );
}
