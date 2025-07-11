"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Sparkles, Play, Pause, CheckCircle, AlertCircle, Settings } from 'lucide-react';

interface RecipeNodeData {
  label: string;
  recipeId?: string;
  recipeName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  modelOverride?: string;
  version?: string;
  recipeDependencies?: string[];
  brokerInputs?: { [paramName: string]: string };
  brokerOutputs?: { [resultName: string]: string };
  description?: string;
}

interface RecipeNodeProps {
  data: RecipeNodeData;
  selected?: boolean;
}

const RecipeNode: React.FC<RecipeNodeProps> = ({ data, selected }) => {
  const getStatusIcon = () => {
    switch (data.status) {
      case 'running':
        return <Play className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
      default:
        return <Pause className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'running':
        return 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'completed':
        return 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20';
      case 'failed':
        return 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800';
    }
  };

  return (
    <div className={`
      relative min-w-[200px] rounded-lg border-2 transition-all duration-200
      ${getStatusColor()}
      ${selected ? 'ring-2 ring-purple-500 dark:ring-purple-400 ring-offset-2 dark:ring-offset-gray-900' : ''}
      hover:shadow-lg dark:hover:shadow-2xl
    `}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500 dark:bg-purple-400 border-2 border-white dark:border-gray-900"
      />

      {/* Node Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/50">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {data.label}
              </h3>
              {data.recipeName && (
                <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                  {data.recipeName}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <Settings className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>

      {/* Node Body */}
      <div className="px-4 py-3">
        {data.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Recipe Details */}
        <div className="space-y-2">
          {data.recipeId && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Recipe ID:</span>
              <span className="text-gray-700 dark:text-gray-300 font-mono">
                {data.recipeId.substring(0, 8)}...
              </span>
            </div>
          )}
          
          {data.modelOverride && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Model:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {data.modelOverride}
              </span>
            </div>
          )}

          {data.version && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Version:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {data.version}
              </span>
            </div>
          )}
        </div>

        {/* Dependencies */}
        {data.recipeDependencies && data.recipeDependencies.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              Dependencies:
            </span>
            <div className="flex flex-wrap gap-1">
              {data.recipeDependencies.slice(0, 2).map((dep, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md"
                >
                  {dep.length > 10 ? `${dep.substring(0, 10)}...` : dep}
                </span>
              ))}
              {data.recipeDependencies.length > 2 && (
                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md">
                  +{data.recipeDependencies.length - 2}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Broker Connections Indicator */}
        {(data.brokerInputs || data.brokerOutputs) && (
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Brokers:</span>
              <div className="flex items-center gap-1">
                {data.brokerInputs && Object.keys(data.brokerInputs).length > 0 && (
                  <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs">
                    In: {Object.keys(data.brokerInputs).length}
                  </span>
                )}
                {data.brokerOutputs && Object.keys(data.brokerOutputs).length > 0 && (
                  <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-xs">
                    Out: {Object.keys(data.brokerOutputs).length}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500 dark:bg-purple-400 border-2 border-white dark:border-gray-900"
      />

      {/* Status Badge */}
      <div className="absolute -top-2 -right-2">
        <div className={`
          px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wide
          ${data.status === 'running' ? 'bg-blue-500 text-white' : ''}
          ${data.status === 'completed' ? 'bg-green-500 text-white' : ''}
          ${data.status === 'failed' ? 'bg-red-500 text-white' : ''}
          ${data.status === 'pending' ? 'bg-gray-500 text-white' : ''}
        `}>
          {data.status}
        </div>
      </div>
    </div>
  );
};

export default RecipeNode; 