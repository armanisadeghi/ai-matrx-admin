"use client";

import React, { useMemo, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Code, Play, Pause, CheckCircle, AlertCircle, Settings, Database, Search, Loader } from 'lucide-react';
import { useRegisteredFunctionWithFetch, useArgWithFetch } from '@/lib/redux/entity/hooks/functions-and-args';
import { RegisteredFunctionData, ArgData } from '@/types';

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
  // Real database function data
  const { 
    registeredFunctionRecords, 
    registeredFunctionIsLoading,
    fetchRegisteredFunctionAll 
  } = useRegisteredFunctionWithFetch();
  
  const { 
    argRecords, 
    argIsLoading,
    fetchArgAll 
  } = useArgWithFetch();

  // Fetch data on mount if needed
  useEffect(() => {
    if (Object.keys(registeredFunctionRecords).length === 0 && !registeredFunctionIsLoading) {
      fetchRegisteredFunctionAll();
    }
    if (Object.keys(argRecords).length === 0 && !argIsLoading) {
      fetchArgAll();
    }
  }, [registeredFunctionRecords, argRecords, registeredFunctionIsLoading, argIsLoading, fetchRegisteredFunctionAll, fetchArgAll]);

  // Get real function data
  const realFunctionData: RegisteredFunctionData | null = useMemo(() => {
    if (!data.functionId || !registeredFunctionRecords[data.functionId]) {
      return null;
    }
    return registeredFunctionRecords[data.functionId];
  }, [data.functionId, registeredFunctionRecords]);

  // Get real function arguments
  const realFunctionArgs: ArgData[] = useMemo(() => {
    if (!data.functionId) return [];
    
    return Object.values(argRecords).filter(arg => 
      arg.registeredFunction === data.functionId
    );
  }, [data.functionId, argRecords]);

  // Convert real args to display format
  const displayArgs: FunctionArgument[] = useMemo(() => {
    return realFunctionArgs.map(arg => ({
      id: arg.id?.toString() || '',
      name: arg.name || 'unknown',
      required: arg.required || false,
      data_type: (arg.dataType as any) || 'str',
      ready: false, // TODO: Check against broker data
      default_value: arg.defaultValue,
      description: undefined // TODO: Add description field to database schema
    }));
  }, [realFunctionArgs]);

  // Use real data if available, fallback to node data
  const functionName = realFunctionData?.name || data.functionName || data.label;
  const functionDescription = realFunctionData?.description || data.description;
  const functionCategory = data.category; // TODO: Add category field to database schema
  const functionArgs = displayArgs.length > 0 ? displayArgs : (data.functionArgs || []);

  const getStatusIcon = () => {
    if (registeredFunctionIsLoading || argIsLoading) {
      return <Loader className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-spin" />;
    }
    
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
    if (registeredFunctionIsLoading || argIsLoading) {
      return 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
    
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

  // Data validation indicator
  const isRealFunction = !!realFunctionData;
  const hasValidFunctionId = !!data.functionId;

  const requiredArgs = functionArgs?.filter(arg => arg.required) || [];
  const optionalArgs = functionArgs?.filter(arg => !arg.required) || [];
  const readyArgs = functionArgs?.filter(arg => arg.ready) || [];
  const totalArgs = functionArgs?.length || 0;

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
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                  {data.label}
                </h3>
                {isRealFunction && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected to database function" />
                )}
              </div>
              {functionName && functionName !== data.label && (
                <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                  {functionName}
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
        {/* Function Status Indicator */}
        {!hasValidFunctionId && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs text-yellow-700 dark:text-yellow-300">
                No function selected
              </span>
            </div>
          </div>
        )}

        {hasValidFunctionId && !isRealFunction && !registeredFunctionIsLoading && (
          <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs text-red-700 dark:text-red-300">
                Function not found in database
              </span>
            </div>
          </div>
        )}

        {functionDescription && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
            {functionDescription}
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
          
          {functionCategory && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Category:</span>
              <span className="text-gray-700 dark:text-gray-300">
                {functionCategory}
              </span>
            </div>
          )}

          {isRealFunction && realFunctionData && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">DB Function:</span>
              <span className="text-green-600 dark:text-green-400 text-xs">
                ✓ Connected
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
        {functionArgs && functionArgs.length > 0 && (
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
        <div className={`w-5 h-5 rounded-full flex items-center justify-center
          ${isRealFunction ? 'bg-green-500 dark:bg-green-400' : 'bg-indigo-500 dark:bg-indigo-400'}
        `}>
          <Database className="h-3 w-3 text-white" />
        </div>
      </div>
    </div>
  );
};

export default GenericFunctionNode; 