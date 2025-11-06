'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Sparkles, type LucideIcon, Check, AlertCircle } from 'lucide-react';
import { RootState, useAppDispatch } from '@/lib/redux';
import { setPreference, UserPreferencesState } from '@/lib/redux/slices/userPreferencesSlice';
import { fetchAIModelsClient } from "@/lib/api/ai-models";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

type AIModel = {
    id: string;
    name: string;
    common_name: string | null;
    model_class: string;
    provider: string | null;
    is_deprecated: boolean;
};

const AiModelsPreferences = () => {
    const dispatch = useAppDispatch();
    const preferences = useSelector((state: RootState) => state.userPreferences as UserPreferencesState);
    const { aiModels, _meta } = preferences;
    
    const [models, setModels] = useState<AIModel[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Safety check for _meta
    const meta = _meta || {
        isLoading: false,
        error: null,
        lastSaved: null,
        hasUnsavedChanges: false,
    };

    // Fetch models on mount
    useEffect(() => {
        const loadModels = async () => {
            setLoading(true);
            try {
                const fetchedModels = await fetchAIModelsClient();
                setModels(fetchedModels);
            } catch (error) {
                console.error('Error loading AI models:', error);
            } finally {
                setLoading(false);
            }
        };
        loadModels();
    }, []);


    const toggleModel = (modelId: string, currentlyActive: boolean) => {
        if (currentlyActive) {
            // Moving from active to inactive
            const newActiveModels = aiModels.activeModels.filter(id => id !== modelId);
            const newInactiveModels = [...aiModels.inactiveModels, modelId];
            
            dispatch(setPreference({ module: 'aiModels', preference: 'activeModels', value: newActiveModels }));
            dispatch(setPreference({ module: 'aiModels', preference: 'inactiveModels', value: newInactiveModels }));
        } else {
            // Moving from inactive/unset to active
            const newInactiveModels = aiModels.inactiveModels.filter(id => id !== modelId);
            const newActiveModels = [...aiModels.activeModels, modelId];
            
            dispatch(setPreference({ module: 'aiModels', preference: 'inactiveModels', value: newInactiveModels }));
            dispatch(setPreference({ module: 'aiModels', preference: 'activeModels', value: newActiveModels }));
        }
    };

    // Categorize models
    const activeModels = models.filter(m => aiModels.activeModels.includes(m.id));
    const inactiveModels = models.filter(m => aiModels.inactiveModels.includes(m.id));
    const availableModels = models.filter(m => 
        !aiModels.activeModels.includes(m.id) && 
        !aiModels.inactiveModels.includes(m.id)
    );

    // Filter by search query
    const filterModels = (modelList: AIModel[]) => {
        if (!searchQuery.trim()) return modelList;
        const query = searchQuery.toLowerCase();
        return modelList.filter(m => 
            m.common_name?.toLowerCase().includes(query) ||
            m.name.toLowerCase().includes(query) ||
            m.provider?.toLowerCase().includes(query)
        );
    };

    const filteredActiveModels = filterModels(activeModels);
    const filteredInactiveModels = filterModels(inactiveModels);
    const filteredAvailableModels = filterModels(availableModels);

    const ModelItem = ({ model, isActive }: { model: AIModel; isActive: boolean }) => (
        <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleModel(model.id, isActive)}
                    className="shrink-0"
                />
                <div className="flex flex-col min-w-0 flex-1">
                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer truncate">
                        {model.common_name || model.name}
                    </Label>
                    {model.common_name && model.name !== model.common_name && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {model.name}
                        </span>
                    )}
                </div>
                {model.provider && (
                    <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                        {model.provider}
                    </Badge>
                )}
            </div>
        </div>
    );

    const ModelSection = ({ 
        title, 
        models, 
        emptyMessage, 
        isActive,
        icon: Icon
    }: { 
        title: string; 
        models: AIModel[]; 
        emptyMessage: string; 
        isActive: boolean;
        icon: LucideIcon;
    }) => (
        <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {title}
                </h4>
                <Badge variant="secondary" className="text-xs">
                    {models.length}
                </Badge>
            </div>
            {models.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic pl-6">
                    {emptyMessage}
                </p>
            ) : (
                <div className="space-y-1">
                    {models.map(model => (
                        <ModelItem key={model.id} model={model} isActive={isActive} />
                    ))}
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">AI Models</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage which AI models are available for use
                </p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    type="text"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                />
            </div>

            <div className="space-y-6">
                {/* Active Models */}
                <ModelSection
                    title="Active Models"
                    models={filteredActiveModels}
                    emptyMessage="No active models. Toggle models below to activate them."
                    isActive={true}
                    icon={Check}
                />

                <Separator />

                {/* Available Models */}
                <ModelSection
                    title="Available Models"
                    models={filteredAvailableModels}
                    emptyMessage="All models have been configured."
                    isActive={false}
                    icon={Sparkles}
                />

                <Separator />

                {/* Inactive Models */}
                <ModelSection
                    title="Inactive Models"
                    models={filteredInactiveModels}
                    emptyMessage="No inactive models."
                    isActive={false}
                    icon={AlertCircle}
                />
            </div>

            <div className="pt-4 mt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Total models: {models.length} • Active: {activeModels.length} • Available: {availableModels.length} • Inactive: {inactiveModels.length}
                </p>
            </div>
        </div>
    );
};

export default AiModelsPreferences;

