"use client";

import React, { useState } from "react";
import ModelCard from "./ModelCard";
import QuickRefSearchableSelect from "@/app/(authenticated)/tests/forms/entity-final-test/dynamic-quick-ref/QuickRefSearchableSelect";
import QuickRefSelect from "@/app/(authenticated)/tests/forms/entity-final-test/dynamic-quick-ref/QuickRefSelect";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";

interface ModelSelectionWithInfoProps {
  initialSettings?: {
    recipe?: QuickReferenceRecord;
    provider?: QuickReferenceRecord;
    model?: QuickReferenceRecord;
    endpoint?: QuickReferenceRecord;
  };
}

const ModelSelectionWithInfo: React.FC<ModelSelectionWithInfoProps> = ({
  initialSettings,
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState<
    QuickReferenceRecord | undefined
  >(initialSettings?.recipe);
  const [selectedProvider, setSelectedProvider] = useState<
    QuickReferenceRecord | undefined
  >(initialSettings?.provider);
  const [selectedModel, setSelectedModel] = useState<
    QuickReferenceRecord | undefined
  >(initialSettings?.model);
  const [selectedEndpoint, setSelectedEndpoint] = useState<
    QuickReferenceRecord | undefined
  >(initialSettings?.endpoint);

  const handleProviderChange = (record: QuickReferenceRecord) => {
    setSelectedProvider(record);
    setSelectedModel(undefined);
    setSelectedEndpoint(undefined);
  };

  const handleModelChange = (record: QuickReferenceRecord) => {
    setSelectedModel(record);
    setSelectedEndpoint(undefined);
  };

  const handleEndpointChange = (record: QuickReferenceRecord) => {
    setSelectedEndpoint(record);
  };

  const handleRecipeChange = (record: QuickReferenceRecord) => {
    setSelectedRecipe(record);
  };

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      <div className="space-y-4">
        {/* Recipe Selection */}
        <div className="w-full min-w-0">
          <QuickRefSearchableSelect
            entityKey="recipe"
            initialSelectedRecord={selectedRecipe}
            onRecordChange={handleRecipeChange}
          />
        </div>
        {/* Provider Selection */}
        <div className="w-full min-w-0">
          <QuickRefSelect
            entityKey="aiProvider"
            initialSelectedRecord={selectedProvider}
            onRecordChange={handleProviderChange}
          />
        </div>

        {/* Model Selection */}
        <div className="w-full min-w-0">
          <QuickRefSearchableSelect
            entityKey="aiModel"
            initialSelectedRecord={selectedModel}
            onRecordChange={handleModelChange}
          />
        </div>

        {/* Endpoint Selection */}
        <div className="w-full min-w-0">
          <QuickRefSelect
            entityKey="aiEndpoint"
            initialSelectedRecord={selectedEndpoint}
            onRecordChange={handleEndpointChange}
          />
        </div>

        {/* Model Info Card */}
        <div className="w-full min-w-0">
          <ModelCard
            model={selectedModel?.recordKey}
            provider={selectedProvider?.recordKey}
            endpoint={selectedEndpoint?.recordKey}
          />
        </div>
      </div>
    </div>
  );
};

export default ModelSelectionWithInfo;
