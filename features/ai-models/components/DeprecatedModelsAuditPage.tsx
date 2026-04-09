'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCcw } from 'lucide-react';
import { aiModelService } from '../service';
import type { AiModel } from '../types';
import DeprecatedModelsAudit from './DeprecatedModelsAudit';

export default function DeprecatedModelsAuditPage() {
    const [models, setModels] = useState<AiModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadModels = useCallback(async () => {
        setIsLoading(true);
        try {
            const fetched = await aiModelService.fetchAll();
            setModels(fetched);
        } catch (err) {
            console.error('Failed to load AI models', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadModels();
    }, [loadModels]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm gap-2">
                <RefreshCcw className="h-4 w-4 animate-spin" />
                Loading models…
            </div>
        );
    }

    return (
        <DeprecatedModelsAudit
            allModels={models}
            onClose={() => window.history.back()}
            onModelsChanged={loadModels}
        />
    );
}
