"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import { User, Type, Hash, FileText, List, CheckSquare, Upload, AlertTriangle } from 'lucide-react';

interface UserInputNodeData {
  label: string;
  inputType: 'text' | 'number' | 'json' | 'file' | 'selection';
  defaultValue?: any;
  isRequired: boolean;
  outputBrokerId?: string;
  description?: string;
  validationRules?: Array<{
    type: string;
    value?: any;
    message: string;
  }>;
  options?: string[]; // For selection type
  currentValue?: any;
  hasError?: boolean;
  errorMessage?: string;
}

interface UserInputNodeProps {
  data: UserInputNodeData;
  selected?: boolean;
}

const UserInputNode: React.FC<UserInputNodeProps> = ({ data, selected }) => {
  const getInputTypeIcon = () => {
    switch (data.inputType) {
      case 'text':
        return <Type className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'number':
        return <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'json':
        return <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'file':
        return <Upload className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      case 'selection':
        return <List className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Type className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getInputTypeColor = () => {
    switch (data.inputType) {
      case 'text':
        return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
      case 'number':
        return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300';
      case 'json':
        return 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300';
      case 'file':
        return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
      case 'selection':
        return 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getBorderColor = () => {
    if (data.hasError) {
      return 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20';
    }
    if (data.currentValue !== undefined && data.currentValue !== null && data.currentValue !== '') {
      return 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20';
    }
    return 'border-gray-300 dark:border-gray-600 bg-textured';
  };

  const hasValidationRules = data.validationRules && data.validationRules.length > 0;
  const requiredRules = data.validationRules?.filter(rule => rule.type === 'required') || [];
  const otherRules = data.validationRules?.filter(rule => rule.type !== 'required') || [];

  return (
    <div className={`
      relative min-w-[200px] rounded-lg border-2 transition-all duration-200
      ${getBorderColor()}
      ${selected ? 'ring-2 ring-emerald-500 dark:ring-emerald-400 ring-offset-2 dark:ring-offset-gray-900' : ''}
      hover:shadow-lg dark:hover:shadow-2xl
    `}>
      {/* Output Handle Only - User inputs only produce data */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-emerald-500 dark:bg-emerald-400 border-2 border-white dark:border-gray-900"
      />

      {/* Node Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50">
              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {data.label}
              </h3>
              <div className="flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getInputTypeColor()}`}>
                  {data.inputType}
                </span>
                {data.isRequired && (
                  <span className="px-1 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs">
                    Required
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {getInputTypeIcon()}
            {data.hasError && (
              <AlertTriangle className="h-3 w-3 text-red-500 dark:text-red-400" />
            )}
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

        {/* Current Value Display */}
        {data.currentValue !== undefined && data.currentValue !== null && data.currentValue !== '' && (
          <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Value:</div>
            <div className="text-xs text-gray-700 dark:text-gray-300 font-mono">
              {typeof data.currentValue === 'object' 
                ? JSON.stringify(data.currentValue).substring(0, 50) + '...'
                : String(data.currentValue).substring(0, 50)
              }
            </div>
          </div>
        )}

        {/* Default Value */}
        {data.defaultValue !== undefined && data.defaultValue !== null && data.defaultValue !== '' && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Default Value:</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {typeof data.defaultValue === 'object' 
                ? JSON.stringify(data.defaultValue).substring(0, 40) + '...'
                : String(data.defaultValue).substring(0, 40)
              }
            </div>
          </div>
        )}

        {/* Selection Options */}
        {data.inputType === 'selection' && data.options && data.options.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Options:</div>
            <div className="flex flex-wrap gap-1">
              {data.options.slice(0, 3).map((option, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md"
                >
                  {option.length > 8 ? `${option.substring(0, 8)}...` : option}
                </span>
              ))}
              {data.options.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md">
                  +{data.options.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Validation Rules */}
        {hasValidationRules && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Validation:</div>
            <div className="space-y-1">
              {/* Required Rules */}
              {requiredRules.map((rule, index) => (
                <div key={`req-${index}`} className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3 text-red-500 dark:text-red-400" />
                  <span className="text-xs text-red-600 dark:text-red-400">Required</span>
                </div>
              ))}
              
              {/* Other Rules */}
              {otherRules.slice(0, 2).map((rule, index) => (
                <div key={`rule-${index}`} className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {rule.type}{rule.value ? `: ${rule.value}` : ''}
                  </span>
                </div>
              ))}
              
              {otherRules.length > 2 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{otherRules.length - 2} more rules
                </div>
              )}
            </div>
          </div>
        )}

        {/* Output Broker */}
        {data.outputBrokerId && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Output Broker:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                {data.outputBrokerId.length > 12 ? `${data.outputBrokerId.substring(0, 12)}...` : data.outputBrokerId}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {data.hasError && data.errorMessage && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500 dark:text-red-400" />
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">Error</span>
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
              {data.errorMessage}
            </div>
          </div>
        )}
      </div>

      {/* User Input Badge */}
      <div className="absolute -top-1 -left-1">
        <div className="w-5 h-5 bg-emerald-500 dark:bg-emerald-400 rounded-full flex items-center justify-center">
          <User className="h-3 w-3 text-white" />
        </div>
      </div>

      {/* Required Badge */}
      {data.isRequired && (
        <div className="absolute -top-2 -right-2">
          <div className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-medium uppercase tracking-wide">
            Required
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInputNode; 