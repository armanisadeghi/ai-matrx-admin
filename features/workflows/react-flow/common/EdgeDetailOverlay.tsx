"use client";
import React from 'react';
import { X, ArrowRight, Database, GitBranch, Link, Zap } from 'lucide-react';
import { Edge } from 'reactflow';

interface EdgeDetailOverlayProps {
  edge: Edge | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Get connection type details for styling and display
 */
function getConnectionTypeInfo(connectionType: string) {
  switch (connectionType) {
    case 'to_argument':
      return {
        icon: Link,
        label: 'Argument Mapping',
        description: 'Node consumes data from broker for function argument',
        color: 'emerald',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
        borderColor: 'border-emerald-200 dark:border-emerald-700',
        textColor: 'text-emerald-700 dark:text-emerald-300',
        iconColor: 'text-emerald-500'
      };
    case 'to_relay':
      return {
        icon: ArrowRight,
        label: 'Relay Connection',
        description: 'Broker data is relayed to multiple targets',
        color: 'blue',
        bgColor: 'bg-blue-50 dark:bg-blue-950/50',
        borderColor: 'border-blue-200 dark:border-blue-700',
        textColor: 'text-blue-700 dark:text-blue-300',
        iconColor: 'text-blue-500'
      };
    case 'to_dependency':
      return {
        icon: GitBranch,
        label: 'Dependency Connection',
        description: 'Node waits for dependency before execution',
        color: 'red',
        bgColor: 'bg-red-50 dark:bg-red-950/50',
        borderColor: 'border-red-200 dark:border-red-700',
        textColor: 'text-red-700 dark:text-red-300',
        iconColor: 'text-red-500'
      };
    default:
      return {
        icon: Database,
        label: 'Unknown Connection',
        description: 'Unknown connection type',
        color: 'gray',
        bgColor: 'bg-gray-50 dark:bg-gray-800',
        borderColor: 'border-gray-200 dark:border-gray-700',
        textColor: 'text-gray-700 dark:text-gray-300',
        iconColor: 'text-gray-500'
      };
  }
}

export function EdgeDetailOverlay({ edge, isOpen, onClose }: EdgeDetailOverlayProps) {
  if (!isOpen || !edge) return null;

  const connectionType = edge.data?.connectionType || 'unknown';
  const sourceBrokerId = edge.data?.sourceBrokerId;
  const label = edge.data?.label || 'Unlabeled Connection';
  const metadata = edge.data?.metadata || {};
  
  const typeInfo = getConnectionTypeInfo(connectionType);
  const IconComponent = typeInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Overlay Content */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <IconComponent className={`w-6 h-6 ${typeInfo.iconColor}`} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {typeInfo.label}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {typeInfo.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Primary Focus: The Broker */}
          <div className={`${typeInfo.bgColor} ${typeInfo.borderColor} border rounded-lg p-4`}>
            <h3 className="flex items-center gap-2 text-sm font-medium mb-3">
              <Database className={`w-4 h-4 ${typeInfo.iconColor}`} />
              Broker ID
            </h3>
            <div className="font-mono text-lg bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-300 dark:border-gray-600">
              {sourceBrokerId || 'Unknown Broker'}
            </div>
            {label && label !== sourceBrokerId && (
              <div className={`text-sm ${typeInfo.textColor} mt-2`}>
                Label: {label}
              </div>
            )}
          </div>

          {/* Connection Flow */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Source Node */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Node</h4>
              <div className="font-mono text-sm text-gray-600 dark:text-gray-400 break-all">
                {edge.source}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Handle: {edge.sourceHandle || 'default'}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className={`w-8 h-8 ${typeInfo.iconColor}`} />
            </div>

            {/* Target Node */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Node</h4>
              <div className="font-mono text-sm text-gray-600 dark:text-gray-400 break-all">
                {edge.target}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Handle: {edge.targetHandle || 'default'}
              </div>
            </div>
          </div>

          {/* Connection Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Connection Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Basic Properties */}
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Edge ID:</span>
                  <div className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all">{edge.id}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Animated:</span>
                  <div className="text-sm">{edge.animated ? '✅ Yes' : '❌ No'}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Type:</span>
                  <div className="text-sm font-mono">{edge.type || 'default'}</div>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                {metadata.targetArgName && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Target Argument:</span>
                    <div className={`text-sm font-mono ${typeInfo.textColor}`}>{metadata.targetArgName}</div>
                  </div>
                )}
                {metadata.relayLabel && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Relay Label:</span>
                    <div className={`text-sm ${typeInfo.textColor}`}>{metadata.relayLabel}</div>
                  </div>
                )}
                {metadata.dependencyHasTarget !== undefined && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Has Target Broker:</span>
                    <div className="text-sm">{metadata.dependencyHasTarget ? '✅ Yes' : '❌ No'}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visual Style Info */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Visual Style</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Stroke:</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: edge.style?.stroke || '#000' }}
                  />
                  <span className="font-mono text-xs">{edge.style?.stroke || 'default'}</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Width:</span>
                <div className="font-mono">{edge.style?.strokeWidth || 1}px</div>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Dash:</span>
                <div className="font-mono text-xs">{edge.style?.strokeDasharray || 'solid'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 