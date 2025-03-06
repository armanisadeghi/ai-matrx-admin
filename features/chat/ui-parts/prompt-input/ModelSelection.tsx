import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChevronDown, X } from "lucide-react";
import { MatrxRecordId } from "@/types";

interface Model {
    id: string;
    name: string;
    modelClass: string;
    provider?: string;
    commonName?: string;
    endpoints?: Record<string, unknown>;
    contextWindow?: number;
    maxTokens?: number;
    capabilities?: Record<string, unknown>;
    controls?: Record<string, unknown>;
    modelProvider?: string;
}

interface ModelSelectionProps {
  models: Record<MatrxRecordId, Model>;
  selectedModelKey: MatrxRecordId | undefined;
  onModelSelect: (modelKey: MatrxRecordId) => void;
  className?: string;
}

// Memoize the model entry component to prevent rerenders
const ModelEntry = React.memo(({ 
  model, 
  modelKey, 
  isSelected, 
  onSelect 
}: { 
  model: Model; 
  modelKey: MatrxRecordId; 
  isSelected: boolean; 
  onSelect: () => void 
}) => (
  <button
    onClick={onSelect}
    className={`block w-full text-left px-4 py-2 text-sm ${
      isSelected
        ? "bg-zinc-100 dark:bg-zinc-700 text-gray-900 dark:text-white"
        : "text-gray-700 dark:text-gray-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
    }`}
  >
    <div className="flex flex-col">
      <span className="text-sm truncate">{model.commonName || model.name}</span>
      {model.contextWindow && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Context: {model.contextWindow.toLocaleString()} tokens
        </span>
      )}
    </div>
  </button>
));

// Memoize the provider section component
const ProviderSection = React.memo(({ 
  provider, 
  modelEntries, 
  selectedModelKey, 
  onModelSelect, 
  onCloseDropdown 
}: { 
  provider: string; 
  modelEntries: { model: Model; key: MatrxRecordId }[]; 
  selectedModelKey: MatrxRecordId | undefined; 
  onModelSelect: (key: MatrxRecordId) => void; 
  onCloseDropdown: () => void;
}) => (
  <div className="mt-2 first:mt-0">
    <div className="px-2 py-1 text-xs uppercase tracking-wider font-bold text-blue-500 dark:text-blue-400 bg-zinc-100 dark:bg-zinc-700/70 sticky top-0 border-y border-zinc-200 dark:border-zinc-600">
      {provider}
    </div>
    {modelEntries.map(({ key, model }) => (
      <ModelEntry
        key={key}
        model={model}
        modelKey={key}
        isSelected={selectedModelKey === key}
        onSelect={() => {
          onModelSelect(key);
          onCloseDropdown();
        }}
      />
    ))}
  </div>
));

const ModelSelection: React.FC<ModelSelectionProps> = React.memo(({
  models,
  selectedModelKey,
  onModelSelect,
  className = "",
}) => {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Memoize the selected model name
  const selectedModelName = useMemo(() => 
    selectedModelKey && models[selectedModelKey]
      ? models[selectedModelKey].commonName || models[selectedModelKey].name || "Select a model" 
      : "Select a model",
    [selectedModelKey, models]
  );

  // Close dropdown when clicking outside - use useCallback to prevent recreation on every render
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  // Memoize the organization of models by provider
  const providersWithModels = useMemo(() => {
    const providers: Record<string, { model: Model, key: MatrxRecordId }[]> = {};
    
    Object.entries(models).forEach(([key, model]) => {
      const provider = model.provider || model.modelProvider || "Other";
      if (!providers[provider]) {
        providers[provider] = [];
      }
      providers[provider].push({ model, key });
    });
    
    const priorityProviders = ["Anthropic", "OpenAI", "Meta"];
    
    return Object.entries(providers)
      .sort(([a], [b]) => {
        // Check if either provider is in the priority list
        const aIndex = priorityProviders.indexOf(a);
        const bIndex = priorityProviders.indexOf(b);
        
        // If both are in priority list, sort by priority
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // If only a is in priority list, it comes first
        if (aIndex !== -1) {
          return -1;
        }
        // If only b is in priority list, it comes first
        if (bIndex !== -1) {
          return 1;
        }
        // Otherwise sort alphabetically
        return a.localeCompare(b);
      })
      .map(([provider, modelEntries]) => [
        provider,
        // Sort models by name within each provider
        modelEntries.sort((a, b) => 
          (a.model.commonName || a.model.name).localeCompare(b.model.commonName || b.model.name)
        )
      ]);
  }, [models]); // Only recalculate when models change

  // Memoize the filtered models based on search term
  const filteredModels = useMemo(() => 
    searchTerm 
      ? Object.entries(models)
          .map(([key, model]) => ({ key, model }))
          .filter(({ model }) => {
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = (model.commonName || model.name || "")
              .toLowerCase().includes(searchLower);
            const providerMatch = (model.provider || model.modelProvider || "")
              .toLowerCase().includes(searchLower);
            return nameMatch || providerMatch;
          })
      : [],
    [models, searchTerm]
  );

  // Memoize handlers
  const toggleDropdown = useCallback(() => {
    setShowDropdown(prev => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleModelSelectAndClose = useCallback((key: MatrxRecordId) => {
    onModelSelect(key);
    setShowDropdown(false);
    setSearchTerm("");
  }, [onModelSelect]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        className="p-2 rounded-full text-xs text-gray-800 dark:text-gray-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 flex items-center border-none"
        onClick={toggleDropdown}
      >
        <span className="mr-1 text-sm font-medium truncate max-w-[150px]">{selectedModelName}</span>
        <ChevronDown size={16} />
      </button>
      {showDropdown && (
        <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 min-w-[280px] max-w-[360px] z-20">
          <div className="flex justify-between items-center p-2 border-b border-zinc-200 dark:border-zinc-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select a model</span>
            <button
              onClick={closeDropdown}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          </div>
          
          {/* Search input */}
          <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-700 text-gray-900 dark:text-gray-100 text-sm"
            />
          </div>
          
          <div className="max-h-[350px] overflow-y-auto py-1 overscroll-contain">
            {searchTerm ? (
              // Show search results
              <div>
                {filteredModels.length > 0 ? (
                  filteredModels.map(({ key, model }) => (
                    <ModelEntry
                      key={key}
                      model={model}
                      modelKey={key}
                      isSelected={selectedModelKey === key}
                      onSelect={() => handleModelSelectAndClose(key)}
                    />
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No models found
                  </div>
                )}
              </div>
            ) : (
              // Show models grouped by provider
              providersWithModels.map(([provider, modelEntries], index) => (
                <ProviderSection
                  key={provider.toString()}
                  provider={provider as string}
                  modelEntries={modelEntries as { model: Model; key: MatrxRecordId }[]}
                  selectedModelKey={selectedModelKey}
                  onModelSelect={onModelSelect}
                  onCloseDropdown={closeDropdown}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

ModelSelection.displayName = "ModelSelection";
ModelEntry.displayName = "ModelEntry";
ProviderSection.displayName = "ProviderSection";

export default ModelSelection;