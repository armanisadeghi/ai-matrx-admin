"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Code, Play, Pause, CheckCircle, AlertCircle, Settings, Database } from 'lucide-react';

interface FunctionArgument {
  id: string;
  name: string;
  required: boolean;
  data_type: 'str' | 'int' | 'float' | 'bool' | 'list' | 'dict';
  ready: boolean;
  default_value?: any;
  description?: string;
}

interface GenericFunctionNodeData {
  label: string;
  functionId?: string;
  functionName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  functionArgs?: FunctionArgument[];
  brokerInputs?: { [paramName: string]: string };
  brokerOutputs?: { [resultName: string]: string };
  description?: string;
  category?: string;
}

interface GenericFunctionNodeProps {
  data: GenericFunctionNodeData;
  selected?: boolean;
}

const GenericFunctionNode: React.FC<GenericFunctionNodeProps> = ({ data, selected }) => {
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

  const getTypeColor = (dataType: string) => {
    switch (dataType) {
      case 'str':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50';
      case 'int':
      case 'float':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50';
      case 'bool':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50';
      case 'list':
      case 'dict':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const requiredArgs = data.functionArgs?.filter(arg => arg.required) || [];
  const optionalArgs = data.functionArgs?.filter(arg => !arg.required) || [];
  const readyArgs = data.functionArgs?.filter(arg => arg.ready) || [];
  const totalArgs = data.functionArgs?.length || 0;

  return (
    <div className={`
      relative min-w-[220px] rounded-lg border-2 transition-all duration-200
      ${getStatusColor()}
      ${selected ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-2 dark:ring-offset-gray-900' : ''}
      hover:shadow-lg dark:hover:shadow-2xl
    `}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-indigo-500 dark:bg-indigo-400 border-2 border-white dark:border-gray-900"
      />

      {/* Node Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/50">
              <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {data.label}
              </h3>
              {data.functionName && data.functionName !== data.label && (
                <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                  {data.functionName}
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

        {/* Function Details */}
        <div className="space-y-2">
          {data.functionId && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Function ID:</span>
              <span className="text-gray-700 dark:text-gray-300 font-mono">
                {data.functionId.substring(0, 8)}...
              </span>
            </div>
          )}
          
          {data.category && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Category:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {data.category}
              </span>
            </div>
          )}

          {totalArgs > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Arguments:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {readyArgs.length}/{totalArgs} ready
              </span>
            </div>
          )}
        </div>

        {/* Arguments Display */}
        {data.functionArgs && data.functionArgs.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
              Arguments:
            </span>
            
            {/* Required Arguments */}
            {requiredArgs.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-red-600 dark:text-red-400 mb-1">Required:</div>
                <div className="space-y-1">
                  {requiredArgs.slice(0, 3).map((arg) => (
                    <div key={arg.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300 truncate">
                        {arg.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`px-1 py-0.5 rounded text-xs ${getTypeColor(arg.data_type)}`}>
                          {arg.data_type}
                        </span>
                        {arg.ready && (
                          <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />
                        )}
                      </div>
                    </div>
                  ))}
                  {requiredArgs.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{requiredArgs.length - 3} more required
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Optional Arguments (if space) */}
            {optionalArgs.length > 0 && requiredArgs.length <= 2 && (
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Optional:</div>
                <div className="space-y-1">
                  {optionalArgs.slice(0, 2).map((arg) => (
                    <div key={arg.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400 truncate">
                        {arg.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`px-1 py-0.5 rounded text-xs ${getTypeColor(arg.data_type)}`}>
                          {arg.data_type}
                        </span>
                        {arg.ready && (
                          <CheckCircle className="h-3 w-3 text-green-500 dark:text-green-400" />
                        )}
                      </div>
                    </div>
                  ))}
                  {optionalArgs.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{optionalArgs.length - 2} more optional
                    </div>
                  )}
                </div>
              </div>
            )}
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
        className="w-3 h-3 bg-indigo-500 dark:bg-indigo-400 border-2 border-white dark:border-gray-900"
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

      {/* Function Icon Badge */}
      <div className="absolute -top-1 -left-1">
        <div className="w-5 h-5 bg-indigo-500 dark:bg-indigo-400 rounded-full flex items-center justify-center">
          <Database className="h-3 w-3 text-white" />
        </div>
      </div>
    </div>
  );
};

export default GenericFunctionNode; 