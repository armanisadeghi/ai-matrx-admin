"use client";

import React, { useState } from "react";
import ModelCard from "./ModelCard";
import ProviderSelect from "./ProviderSelect";
import ModelSelect from "./ModelSelection";

// Main ModelSelection Component
interface ModelSelectionWithInfoProps {
  initialSettings?: {
    provider?: string;
    model?: string;
  };
}

const ModelSelectionWithinfo: React.FC<ModelSelectionWithInfoProps> = ({
  initialSettings,
}) => {
  const [provider, setProvider] = useState(
    initialSettings?.provider || "openai"
  );
  const [model, setModel] = useState(initialSettings?.model || "gpt4");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <ProviderSelect provider={provider} setProvider={setProvider} />
      </div>

      <ModelSelect provider={provider} model={model} setModel={setModel} />

      <ModelCard model={model} provider={provider} />
    </div>
  );
};

export default ModelSelectionWithinfo;
