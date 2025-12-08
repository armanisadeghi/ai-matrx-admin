"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Check, AlertCircle, Search, Move, Plus } from "lucide-react";
import { useCreateManyToMany } from "@/lib/redux/entity/hooks/useCreateManyToMany";
import { RELATIONSHIP_DEFINITIONS } from "@/app/entities/hooks/relationships/relationshipData";
import { AiModelDataOptional, AiEndpointDataOptional } from "@/types";

export const aiModelEndpointDef = RELATIONSHIP_DEFINITIONS.aiModelEndpoint;

// Color palette for items and containers
const colorPalette = [
  { bg: "bg-blue-500", bgDark: "dark:bg-blue-600", text: "text-blue-500", textDark: "dark:text-blue-400" },
  { bg: "bg-teal-500", bgDark: "dark:bg-teal-600", text: "text-teal-500", textDark: "dark:text-teal-400" },
  { bg: "bg-purple-500", bgDark: "dark:bg-purple-600", text: "text-purple-500", textDark: "dark:text-purple-400" },
  { bg: "bg-indigo-500", bgDark: "dark:bg-indigo-600", text: "text-indigo-500", textDark: "dark:text-indigo-400" },
  { bg: "bg-pink-500", bgDark: "dark:bg-pink-600", text: "text-pink-500", textDark: "dark:text-pink-400" },
  { bg: "bg-amber-500", bgDark: "dark:bg-amber-600", text: "text-amber-500", textDark: "dark:text-amber-400" },
  { bg: "bg-cyan-500", bgDark: "dark:bg-cyan-600", text: "text-cyan-500", textDark: "dark:text-cyan-400" },
  { bg: "bg-emerald-500", bgDark: "dark:bg-emerald-600", text: "text-emerald-500", textDark: "dark:text-emerald-400" },
  { bg: "bg-red-500", bgDark: "dark:bg-red-600", text: "text-red-500", textDark: "dark:text-red-400" },
  { bg: "bg-yellow-500", bgDark: "dark:bg-yellow-600", text: "text-yellow-500", textDark: "dark:text-yellow-400" },
  { bg: "bg-lime-500", bgDark: "dark:bg-lime-600", text: "text-lime-500", textDark: "dark:text-lime-400" },
  { bg: "bg-gray-500", bgDark: "dark:bg-gray-600", text: "text-gray-500", textDark: "dark:text-gray-400" },
];

const getColorForIndex = (index) => {
  return colorPalette[index % colorPalette.length];
};

const RelationshipMaker = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [endpointsearch, setendpointsearch] = useState("");
  const [modelFilter, setModelFilter] = useState("All");
  const [associatedEndpointsModelFilter, setassociatedEndpointsModelFilter] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [draggedModel, setDraggedModel] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [showAddassociatedEndpointsModal, setShowAddassociatedEndpointsModal] = useState(false);

  // References for scroll containers
  const modelsContainerRef = useRef(null);
  const endpointsContainerRef = useRef(null);

  // Get data and methods from your hook
  const {
    allParentRecordsArray,
    allChildRecordsArray,
    getGroupedChildrenByParent,
    createManyToMany,
    deleteManyToMany,
  } = useCreateManyToMany(aiModelEndpointDef, {
    onSuccess: (recordId) => {
      showNotification("Relationship saved successfully");
    },
  });

  const models = allChildRecordsArray as AiModelDataOptional[];
  const allendpoints = allParentRecordsArray as AiEndpointDataOptional[];
  const { groupedChildren, unassociatedChildren } = getGroupedChildrenByParent;
  const endpoints = allendpoints.map((associatedEndpoints, index) => {
    const modelIds = groupedChildren[associatedEndpoints.id] || [];
    const associatedEndpointsModels = modelIds
      .map((modelId) => models.find((model) => model.id === modelId))
      .filter(Boolean) as AiModelDataOptional[];
    
    return {
      ...associatedEndpoints,
      models: associatedEndpointsModels,
      colorIndex: index
    };
  });

  const isLoading = !allParentRecordsArray.length || !allChildRecordsArray.length;

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle drag start
  const handleDragStart = (model) => {
    setDraggedModel(model);
    setIsDragging(true);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedModel(null);
    setIsDragging(false);
  };

  // Handle auto-scroll when dragging near edges
  const handleDragOver = (e, containerType) => {
    e.preventDefault();
    
    const container = containerType === "models" ? modelsContainerRef.current : endpointsContainerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const edgeThreshold = 60;
    
    if (e.clientY - rect.top < edgeThreshold) {
      // Near top edge - scroll up
      container.scrollTop -= 10;
    } else if (rect.bottom - e.clientY < edgeThreshold) {
      // Near bottom edge - scroll down
      container.scrollTop += 10;
    }
  };

  // Handle dropping a model into a associatedEndpoints
  const handleDrop = async (associatedEndpointsId) => {
    if (!draggedModel) return;
    
    const associatedEndpoints = endpoints.find(p => p.id === associatedEndpointsId);
    if (!associatedEndpoints) return;
    
    // Check if model already exists in the associatedEndpoints
    if (associatedEndpoints.models.some(m => m.id === draggedModel.id)) {
      showNotification(`${draggedModel.commonName || draggedModel.name} is already in this associatedEndpoints`, "error");
      return;
    }
    
    // Add model to associatedEndpoints
    setIsCreating(true);
    try {
      await createManyToMany(associatedEndpointsId, draggedModel.id);
      showNotification(`Added ${draggedModel.commonName || draggedModel.name} to ${associatedEndpoints.name || "associatedEndpoints"}`);
    } catch (error) {
      console.error("Create failed:", error);
      showNotification("Failed to create relationship", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle removing a model from a associatedEndpoints
  const handleRemoveModel = async (associatedEndpointsId, modelId) => {
    const associatedEndpoints = endpoints.find(p => p.id === associatedEndpointsId);
    const model = models.find(m => m.id === modelId);
    
    if (!associatedEndpoints || !model) return;
    
    setIsCreating(true);
    try {
      await deleteManyToMany(associatedEndpointsId, modelId);
      showNotification(`Removed ${model.commonName || model.name} from ${associatedEndpoints.name || "associatedEndpoints"}`);
    } catch (error) {
      console.error("Delete failed:", error);
      showNotification("Failed to remove relationship", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Check if a associatedEndpoints already has the dragged model
  const associatedEndpointsHasModel = (associatedEndpoints) => {
    return draggedModel && associatedEndpoints.models.some(m => m.id === draggedModel.id);
  };

  // Filter functions
  const filterModels = () => {
    let filtered = models;
    
    // Apply search filter
    if (modelSearch) {
      const lowerQuery = modelSearch.toLowerCase();
      filtered = filtered.filter(model => 
        (model.name && model.name.toLowerCase().includes(lowerQuery)) ||
        (model.commonName && model.commonName.toLowerCase().includes(lowerQuery)) ||
        (model.modelClass && model.modelClass.toLowerCase().includes(lowerQuery)) ||
        (model.id && model.id.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Apply relationship filter
    if (modelFilter !== "All") {
      filtered = filtered.filter(model => {
        const associatedCount = endpoints.filter(p => 
          p.models.some(m => m.id === model.id)
        ).length;
        
        if (modelFilter === "Unassociated") return associatedCount === 0;
        if (modelFilter === "1+ Matches") return associatedCount > 0;
        return true;
      });
    }
    
    return filtered;
  };

  const filterendpoints = () => {
    let filtered = endpoints;
    
    // Apply search filter
    if (endpointsearch) {
      const lowerQuery = endpointsearch.toLowerCase();
      filtered = filtered.filter(associatedEndpoints => 
        (associatedEndpoints.name && associatedEndpoints.name.toLowerCase().includes(lowerQuery)) ||
        (associatedEndpoints.description && associatedEndpoints.description.toLowerCase().includes(lowerQuery)) ||
        (associatedEndpoints.id && associatedEndpoints.id.toLowerCase().includes(lowerQuery))
      );
    }
    
    // Apply model filter
    if (associatedEndpointsModelFilter) {
      filtered = filtered.filter(associatedEndpoints => 
        associatedEndpoints.models.some(m => m.id === associatedEndpointsModelFilter)
      );
    }
    
    return filtered;
  };

  const filteredModels = filterModels();
  const filteredendpoints = filterendpoints();

  // Truncate long text
  const truncateText = (text, maxLength = 50) =>
    text ? (text.length > maxLength ? `${text.slice(0, maxLength)}...` : text) : "";

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-200">
        <motion.div
          className="w-12 h-12 border-4 border-t-indigo-500 border-gray-300 rounded-full animate-spin"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col font-sans overflow-hidden text-gray-800 dark:text-gray-200">
      <header className="p-4 bg-textured shadow-sm dark:shadow-gray-900 z-10">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">AI Model endpoints</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Drag models to associate them with endpoints</p>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left side - Models */}
        <div className="lg:w-1/3 h-full border-r border-border flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-border">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-md font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <Move className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                AI Models
              </h2>
              <button
                onClick={() => setShowAddModelModal(true)}
                className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Model
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search models..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="All">All</option>
                <option value="Unassociated">Unassociated</option>
                <option value="1+ Matches">1+ Matches</option>
              </select>
            </div>
          </div>
          <div
            className="overflow-y-auto flex-1 p-3"
            ref={modelsContainerRef}
            onDragOver={(e) => {
              e.preventDefault();
              handleDragOver(e, "models");
            }}
          >
            {filteredModels.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {modelSearch ? "No models match your search" : "No models available"}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredModels.map((model, index) => {
                  const colorData = getColorForIndex(index);
                  const associatedEndpoints = endpoints.filter((p) =>
                    p.models.some((m) => m.id === model.id)
                  );
                  const isSelected = selectedModelId === model.id;
                  
                  return (
                    <div
                      key={model.id}
                      className={`card cursor-grab transition-all duration-200 ease-in-out rounded-lg shadow-md hover:shadow-lg 
                        ${isSelected 
                          ? "bg-gradient-to-br from-cyan-400 to-teal-500 dark:from-cyan-600 dark:to-teal-700" 
                          : "bg-white dark:bg-gray-700"} 
                        ${isDragging && draggedModel?.id === model.id ? "opacity-50 scale-95" : "opacity-100"}
                        ${isCreating ? "pointer-events-none" : ""}`}
                      draggable={!isCreating}
                      onDragStart={() => handleDragStart(model)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedModelId(model.id === selectedModelId ? null : model.id)}
                    >
                      <div className={`h-2 ${colorData.bg} ${colorData.bgDark} rounded-t-lg`}></div>
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-800 dark:text-gray-200">
                              {model.commonName || "Unnamed"} {model.name ? `(${model.name})` : ""}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {[
                                model.modelClass,
                                model.contextWindow ? `${model.contextWindow} ctx` : "",
                                model.maxTokens ? `${model.maxTokens} tokens` : "",
                                model.capabilities ? "Capable" : "",
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">ID: {model.id}</div>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              associatedEndpoints.length === 0
                                ? "bg-orange-400 dark:bg-orange-600"
                                : "bg-green-400 dark:bg-green-600"
                            }`}
                          >
                            {associatedEndpoints.length > 0
                              ? `${associatedEndpoints[0].name || "Unnamed"}${
                                  associatedEndpoints.length > 1 ? ` +${associatedEndpoints.length - 1}` : ""
                                }`
                              : "Unused"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right side - endpoints */}
        <div className="lg:w-2/3 flex-1 overflow-hidden flex flex-col">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b border-border">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-md font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <Check className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                Inference Endpoints
              </h2>
              <button
                onClick={() => setShowAddassociatedEndpointsModal(true)}
                className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Endpoint
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search endpoints..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  value={endpointsearch}
                  onChange={(e) => setendpointsearch(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <select
                value={associatedEndpointsModelFilter}
                onChange={(e) => setassociatedEndpointsModelFilter(e.target.value)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value="">All Models</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.commonName || model.name || "Unnamed"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            className="overflow-y-auto flex-1 p-3"
            ref={endpointsContainerRef}
            onDragOver={(e) => {
              e.preventDefault();
              handleDragOver(e, "endpoints");
            }}
          >
            {isCreating && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <motion.div
                  className="w-12 h-12 border-4 border-t-indigo-500 border-gray-300 rounded-full animate-spin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              </div>
            )}
            
            {filteredendpoints.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {endpointsearch ? "No endpoints match your search" : "No endpoints available"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredendpoints.map((associatedEndpoints) => {
                  const hasModel = associatedEndpointsHasModel(associatedEndpoints);
                  const colorData = getColorForIndex(associatedEndpoints.colorIndex);
                  const highlightClasses = {
                    active: "border-blue-500 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30",
                    disabled: "opacity-75 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                  };

                  let dynamicClasses = "";
                  if (isDragging) {
                    dynamicClasses = hasModel ? highlightClasses.disabled : "";
                  }

                  const isSelectedModelInassociatedEndpoints = selectedModelId && associatedEndpoints.models.some(m => m.id === selectedModelId);

                  return (
                    <div
                      key={associatedEndpoints.id}
                      className={`container relative bg-white dark:bg-gray-700 rounded-lg shadow-md transition-all duration-300 ease-in-out 
                        ${isDragging && !hasModel ? "scale-102" : ""} 
                        ${dynamicClasses} 
                        ${isDragging && !hasModel ? "border-2 border-dashed border-blue-300 dark:border-blue-700" : ""}
                        ${isSelectedModelInassociatedEndpoints ? "border border-cyan-500 shadow-lg shadow-cyan-500/20" : ""}
                        ${isCreating ? "pointer-events-none" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!hasModel && !isCreating) {
                          e.currentTarget.classList.add("border-blue-500");
                          e.currentTarget.classList.add("dark:border-blue-700");
                          e.currentTarget.classList.add("bg-blue-50");
                          e.currentTarget.classList.add("dark:bg-blue-900/30");
                        }
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-blue-500");
                        e.currentTarget.classList.remove("dark:border-blue-700");
                        e.currentTarget.classList.remove("bg-blue-50");
                        e.currentTarget.classList.remove("dark:bg-blue-900/30");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-blue-500");
                        e.currentTarget.classList.remove("dark:border-blue-700");
                        e.currentTarget.classList.remove("bg-blue-50");
                        e.currentTarget.classList.remove("dark:bg-blue-900/30");
                        if (!hasModel && !isCreating) {
                          handleDrop(associatedEndpoints.id);
                        }
                      }}
                    >
                      <div className="py-4">
                        <div className="flex flex-col mb-3">
                          <h3 className={`font-semibold ${colorData.text} ${colorData.textDark}`}>
                            {associatedEndpoints.name || "Unnamed associatedEndpoints"}
                          </h3>
                          {associatedEndpoints.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 hover:line-clamp-none transition-all duration-300">
                              {associatedEndpoints.description}
                            </p>
                          )}
                        </div>
                        <div className={`min-h-16 flex flex-wrap gap-2 rounded-md ${associatedEndpoints.models.length === 0 && !isDragging ? "empty-container" : ""}`}>
                          {associatedEndpoints.models.length === 0 && !isDragging && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 italic w-full text-center my-2">
                              Drop models here
                            </p>
                          )}
                          {associatedEndpoints.models.map((model) => {
                            const modelIndex = filteredModels.findIndex(m => m.id === model.id);
                            const modelColorData = getColorForIndex(modelIndex >= 0 ? modelIndex : model.id.charCodeAt(0) % colorPalette.length);
                            const isHighlighted = selectedModelId === model.id;

                            return (
                              <div
                                key={`${associatedEndpoints.id}-${model.id}`}
                                className={`flex items-center px-3 py-1 rounded-full text-sm text-white
                                  ${modelColorData.bg} ${modelColorData.bgDark}
                                  ${isHighlighted ? "ring-2 ring-white dark:ring-gray-300 shadow-lg" : ""}`}
                              >
                                <span className="truncate max-w-40">{model.commonName || model.name || "Unnamed"}</span>
                                <button
                                  className="ml-2 text-white opacity-70 hover:opacity-100 focus:outline-none transition-opacity"
                                  onClick={() => handleRemoveModel(associatedEndpoints.id, model.id)}
                                  aria-label={`Remove ${model.commonName || model.name || "Unnamed"} from ${associatedEndpoints.name || "associatedEndpoints"}`}
                                  disabled={isCreating}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 flex items-center p-4 rounded-lg shadow-lg z-50 ${
            notification.type === "success"
              ? "bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-200"
          }`}
        >
          {notification.type === "success" ? <Check className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Add Model Modal */}
      {showAddModelModal && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-textured p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">Add New associatedEndpoints</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Placeholder for associatedEndpoints creation form
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddassociatedEndpointsModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddassociatedEndpointsModal(false)}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </motion.div>
      )}
      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .hover:line-clamp-none:hover {
          -webkit-line-clamp: unset;
        }
        .empty-container {
          min-height: 60px;
          border: 1px dashed #ccc;
          border-radius: 0.375rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dark .empty-container {
          border-color: #555;
        }
      `}</style>
    </div>
  );
};

export default RelationshipMaker;
