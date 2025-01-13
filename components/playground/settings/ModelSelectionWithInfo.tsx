'use client';

import React, { useEffect, useState } from 'react';
import ModelCard from './ModelCard';
import QuickRefSelect from '@/app/entities/quick-reference/dynamic-quick-ref/QuickRefSelect';
import { MatrxRecordId, QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import { useAiSettings } from '../hooks/useAiSettings';
import QuickRefActiveRecordSelect from '@/app/entities/quick-reference/dynamic-quick-ref/QuickRefActiveRecordSelect';

interface ModelSelectionWithInfoProps {
    initialSettings?: {
        recipe?: MatrxRecordId;
        aiAgent?: MatrxRecordId;
        provider?: MatrxRecordId;
        model?: MatrxRecordId;
        endpoint?: MatrxRecordId;
    };
}

const ModelSelectionWithInfo: React.FC<ModelSelectionWithInfoProps> = ({ initialSettings }) => {
    const { activeRecipeId } = useAiSettings();

    const [selectedRecipe, setSelectedRecipe] = useState<MatrxRecordId | undefined>(initialSettings?.recipe);
    const [selectedAgent, setSelectedAgent] = useState<MatrxRecordId | undefined>(initialSettings?.aiAgent);
    const [selectedProvider, setSelectedProvider] = useState<MatrxRecordId | undefined>(initialSettings?.provider);
    const [selectedModel, setSelectedModel] = useState<MatrxRecordId | undefined>(initialSettings?.model);
    const [selectedEndpoint, setSelectedEndpoint] = useState<MatrxRecordId | undefined>(initialSettings?.endpoint);


    const handleProviderChange = (record: QuickReferenceRecord) => {
        setSelectedProvider(record.recordKey);
        setSelectedModel(undefined);
        setSelectedEndpoint(undefined);
    };

    const handleModelChange = (record: QuickReferenceRecord) => {
        setSelectedModel(record.recordKey);
        setSelectedEndpoint(undefined);
    };

    const handleEndpointChange = (record: QuickReferenceRecord) => {
        setSelectedEndpoint(record.recordKey);
    };

    const handleRecipeChange = (record: QuickReferenceRecord) => {
        setSelectedRecipe(record.recordKey);
    };

    const handleAgentChange = (record: QuickReferenceRecord) => {
        setSelectedAgent(record.recordKey);
    };

    return (
        <div className='flex flex-col gap-4 w-full min-w-0'>
            <div className='space-y-4'>
                {/* Agent Selection */}
                <div className='w-full min-w-0'>
                    <QuickRefActiveRecordSelect
                        entityKey='aiAgent'
                        onRecordChange={handleAgentChange}
                    />
                </div>
                {/* Provider Selection */}
                <div className='w-full min-w-0'>
                    <QuickRefActiveRecordSelect
                        entityKey='aiProvider'
                        onRecordChange={handleProviderChange}
                    />
                </div>

                {/* Model Selection */}
                <div className='w-full min-w-0'>
                    <QuickRefActiveRecordSelect
                        entityKey='aiModel'
                        onRecordChange={handleModelChange}
                    />
                </div>

                {/* Endpoint Selection */}
                <div className='w-full min-w-0'>
                    <QuickRefActiveRecordSelect
                        entityKey='aiEndpoint'
                        onRecordChange={handleEndpointChange}
                    />
                </div>

                {/* Model Info Card */}
                <div className='w-full min-w-0'>
                    <ModelCard
                        model={selectedModel}
                        provider={selectedProvider}
                        endpoint={selectedEndpoint}
                    />
                </div>
            </div>
        </div>
    );
};

export default ModelSelectionWithInfo;
