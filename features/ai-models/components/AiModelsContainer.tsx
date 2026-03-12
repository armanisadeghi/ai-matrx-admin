'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AiModelTable from './AiModelTable';
import AiModelTabBar from './AiModelTabBar';
import AiModelDetailPanel from './AiModelDetailPanel';
import { useTabUrlState } from '../hooks/useTabUrlState';
import { aiModelService } from '../service';
import type { AiModelRow, AiProvider } from '../types';
import { applyFiltersForCount } from '@/features/ai-models/utils/filterUtils';

export default function AiModelsContainer() {
    const [models, setModels] = useState<AiModelRow[]>([]);
    const [providers, setProviders] = useState<AiProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedModel, setSelectedModel] = useState<AiModelRow | null>(null);
    const [isNewModel, setIsNewModel] = useState(false);
    const [panelOpen, setPanelOpen] = useState(false);

    const { tabIds, activeTabId, tabStates, activeTab, setActiveTab, openTab, closeTab, renameTab, updateTabState } =
        useTabUrlState();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedModels, fetchedProviders] = await Promise.all([
                aiModelService.fetchAll(),
                aiModelService.fetchProviders(),
            ]);
            setModels(fetchedModels);
            setProviders(fetchedProviders);
        } catch (err) {
            console.error('Failed to load AI models', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Count badges: how many models match each tab's filters
    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const tab of tabStates) {
            counts[tab.id] = applyFiltersForCount(models, tab.q, tab.filters);
        }
        return counts;
    }, [models, tabStates]);

    const openModel = (model: AiModelRow) => {
        setSelectedModel(model);
        setIsNewModel(false);
        setPanelOpen(true);
    };

    const openNew = () => {
        setSelectedModel(null);
        setIsNewModel(true);
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setSelectedModel(null);
        setIsNewModel(false);
    };

    const handleSaved = (saved: AiModelRow) => {
        setModels((prev) => {
            const idx = prev.findIndex((m) => m.id === saved.id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = saved;
                return next;
            }
            return [saved, ...prev];
        });
        setSelectedModel(saved);
        setIsNewModel(false);
    };

    const handleDeleted = (id: string) => {
        setModels((prev) => prev.filter((m) => m.id !== id));
        closePanel();
    };

    const handleDuplicate = async (model: AiModelRow) => {
        try {
            const { id: _id, ...rest } = model;
            const duplicate = await aiModelService.create({
                ...rest,
                name: `${model.name}-copy`,
                common_name: model.common_name ? `${model.common_name} (Copy)` : null,
                is_primary: false,
            });
            setModels((prev) => [duplicate, ...prev]);
            openModel(duplicate);
        } catch (err) {
            console.error('Duplicate failed', err);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Tab bar */}
            <AiModelTabBar
                tabs={tabStates}
                activeTabId={activeTabId}
                counts={tabCounts}
                onSelectTab={setActiveTab}
                onCloseTab={closeTab}
                onRenameTab={renameTab}
                onAddTab={() => openTab()}
            />

            {/* Main content: table + optional detail panel */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Table panel */}
                <div className={`${panelOpen ? 'w-1/2' : 'w-full'} min-w-0 flex flex-col transition-all duration-200 overflow-hidden`}>
                    <AiModelTable
                        models={models}
                        providers={providers}
                        isLoading={isLoading}
                        selectedId={selectedModel?.id ?? null}
                        tabState={activeTab}
                        onUpdateTabState={(patch) => updateTabState(activeTabId, patch)}
                        onSelect={openModel}
                        onEdit={openModel}
                        onDelete={(model) => handleDeleted(model.id)}
                        onDuplicate={handleDuplicate}
                        onCreate={openNew}
                        onRefresh={loadData}
                    />
                </div>

                {/* Detail panel — sticky, independently scrollable */}
                {panelOpen && (
                    <div className="w-1/2 border-l shrink-0 overflow-y-auto">
                        <AiModelDetailPanel
                            model={selectedModel}
                            isNew={isNewModel}
                            providers={providers}
                            allModels={models}
                            onClose={closePanel}
                            onSaved={handleSaved}
                            onDeleted={handleDeleted}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
