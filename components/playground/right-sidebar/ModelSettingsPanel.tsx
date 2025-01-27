'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlaygroundResources from './PlaygroundResources';
import MetricsCard from './MetricsCard';
import { useMeasure } from '@uidotdev/usehooks';
import DynamicPromptSettings from './settings/DynamicPromptSettings';
import { Button } from '@/components/ui';
import { Save, SquarePlus } from 'lucide-react';
import { PlaygroundPanelProps } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { debugFor } from '@/utils/simple-debugger';
import { useAppDispatch, useAppSelector, useEntityTools } from '@/lib/redux';
import { useRecipeAgentSettings } from '../hooks/useRecipeAgentSettings';

const MAX_SETTINGS = 4;
const log = debugFor('aiSettings', 'ModelSettingsPanel');

const ModelSettingsPanel: React.FC<PlaygroundPanelProps> = ({ playgroundControls }) => {

    const dispatch = useAppDispatch();
    const [ref, { width }] = useMeasure<HTMLDivElement>();
    const [activeTab, setActiveTab] = useState('model1');
    const [isNarrow, setIsNarrow] = useState(false);
    const [tempRecords, setTempRecords] = useState<Record<string, string>>({});

    const { actions, selectors, store } = useEntityTools('aiSettings');

    const operationMode = useAppSelector(selectors.selectEntityOperationMode);

    log('Got Operation Mode', operationMode, true, true);

    useEffect(() => {
        if (operationMode === 'view') {
            dispatch(actions.setOperationMode('update'));
        }
    }, [operationMode, dispatch, actions]);

    const { doubleParentActiveRecipeHook } = playgroundControls;
    const { activeParentMatrxId: activeRecipeId, secondRelHook: recipeAgentProcessingHook } = doubleParentActiveRecipeHook || {};

    const recipeAgentSettingsHook = useRecipeAgentSettings(recipeAgentProcessingHook)

    const {
        settingsMapper,
        aiAgents,
        agentMatrxIds,
        settingsIds,
        settingsMatrxIds,
        coreSettings,
        processedSettings,
        recipePkId,
        recipeMatrxId,
        deleteSettings,
        createNewSettingsData,
        aiSettingsIsLoading,
        aiSettingsLoadingState,
    } = recipeAgentSettingsHook;
    
    log('Got Settings IDs', settingsMatrxIds, true, true);

    useEffect(() => {
        setIsNarrow(width < 175);
    }, [width]);

    const settingsSlots = useMemo(() => {
        // Ensure we have valid arrays/objects
        const safeMatrxIds = Array.isArray(settingsMatrxIds) ? settingsMatrxIds : [];
        const existingCount = safeMatrxIds.length;

        return Array.from({ length: MAX_SETTINGS }, (_, i) => {
            // Get the existing ID if there is one
            const existingId = safeMatrxIds[i];
            const tempId = tempRecords[`model${i + 1}`];

            // For empty state (no settings)
            if (existingCount === 0) {
                return {
                    index: i + 1,
                    tabId: `model${i + 1}`,
                    type: i === 0 ? 'add-enabled' : 'add-disabled',
                    recordId: tempId || null,
                };
            }

            // For existing settings
            if (existingId) {
                return {
                    index: i + 1,
                    tabId: `model${i + 1}`,
                    type: 'existing',
                    recordId: existingId,
                };
            }

            // For the next available slot
            if (i === existingCount) {
                return {
                    index: i + 1,
                    tabId: `model${i + 1}`,
                    type: 'add-enabled',
                    recordId: tempId || null,
                };
            }

            // For future slots
            return {
                index: i + 1,
                tabId: `model${i + 1}`,
                type: 'add-disabled',
                recordId: null,
            };
        });
    }, [settingsMatrxIds, tempRecords]);

    const handleTabChange = (tabId: string) => {
        const slot = settingsSlots.find((s) => s.tabId === tabId);

        if (!slot || slot.type === 'add-disabled') return;

        if (slot.type === 'add-enabled' && !slot.recordId) {
            // Create a new temp record for this slot
            const tempId = `new-record-${uuidv4()}`;
            setTempRecords((prev) => ({
                ...prev,
                [tabId]: tempId,
            }));
        }

        setActiveTab(tabId);
    };

    const activeSlot = settingsSlots.find((s) => s.tabId === activeTab);

    return (
        <div
            className='h-full flex flex-col bg-background'
            ref={ref}
        >
            <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className='w-full rounded-none'
            >
                <TabsList className='w-full grid grid-cols-4 rounded-none bg-elevation2 p-0.5 gap-px'>
                    {settingsSlots.map((slot) => (
                        <TabsTrigger
                            key={slot.tabId}
                            value={slot.tabId}
                            disabled={slot.type === 'add-disabled'}
                            className={`
                                text-sm font-medium rounded-none px-1 py-1.5 
                                data-[state=active]:bg-primary 
                                data-[state=active]:text-primary-foreground
                                border-r border-border/30 last:border-r-0 
                                transition-colors hover:bg-muted/50 
                                data-[state=active]:shadow-sm
                                ${slot.type.startsWith('add') ? 'text-muted-foreground' : ''}
                                ${slot.type === 'add-disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {isNarrow
                                ? slot.type === 'existing' || slot.recordId
                                    ? `S${slot.index}`
                                    : '+'
                                : slot.type === 'existing' || slot.recordId
                                ? `Set ${slot.index}`
                                : 'Add'}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className='p-2 space-y-4'>
                <div className='flex gap-2 items-center'>
                    <Button
                        variant='outline'
                        size='icon'
                        className='h-9 w-9'
                        disabled={!activeSlot?.recordId}
                    >
                        <Save size={16} />
                    </Button>
                    <Button
                        variant='outline'
                        size='icon'
                        className='h-9 w-9'
                        disabled={settingsSlots.filter((s) => s.type === 'existing' || s.recordId).length >= MAX_SETTINGS}
                    >
                        <SquarePlus size={16} />
                    </Button>
                </div>
                {activeSlot?.recordId && (
                    <DynamicPromptSettings
                        playgroundControls={playgroundControls}
                        recipeAgentSettingsHook={recipeAgentSettingsHook}
                        settingsSetNumber={activeSlot.index}
                        key={activeSlot.recordId}
                    />
                )}
            </div>

            <div className='mt-auto'>
                <PlaygroundResources />
                <MetricsCard />
            </div>
        </div>
    );
};

export default ModelSettingsPanel;
