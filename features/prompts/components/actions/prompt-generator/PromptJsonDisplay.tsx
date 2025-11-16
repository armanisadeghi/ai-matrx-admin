/**
 * PromptJsonDisplay Component
 * 
 * Displays prompt JSON data in a beautiful, user-friendly format
 * with progressive parsing support for streaming data
 */

"use client";

import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code2, Eye, Settings, MessageSquare, Variable, FileJson, Loader2, AlertTriangle } from 'lucide-react';
import { parsePartialJson, extractJsonBlock, type PartialPromptData } from './progressive-json-parser';
import { HighlightedMessageContentMarkdown } from './HighlightedMessageContent';
import { cn } from '@/styles/themes/utils';

interface PromptJsonDisplayProps {
  content: string;
  isStreamActive?: boolean;
  className?: string;
}

/**
 * Error Boundary for PromptJsonDisplay
 */
class PromptJsonErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PromptJsonDisplay Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                Display Error
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {this.state.error?.message || 'An error occurred while displaying the prompt JSON'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Internal component without error boundary
 */
function PromptJsonDisplayInternal({
  content,
  isStreamActive = false,
  className,
}: PromptJsonDisplayProps) {
  const [viewMode, setViewMode] = useState<'friendly' | 'json'>('friendly');
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Parse the JSON progressively as it streams in
  const promptData = useMemo<PartialPromptData>(() => {
    try {
      setParseError(null);
      return parsePartialJson(content);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Unknown parsing error');
      return { isComplete: false };
    }
  }, [content]);

  const jsonBlock = useMemo(() => {
    try {
      return extractJsonBlock(content);
    } catch (error) {
      return null;
    }
  }, [content]);

  const hasAnyData = !!(
    promptData.name ||
    promptData.description ||
    promptData.messages?.length ||
    promptData.variableDefaults?.length ||
    promptData.settings
  );

  // Always show something if we have a JSON block (even if parsing failed)
  if (!hasAnyData && !jsonBlock) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Error Display */}
      {parseError && !isStreamActive && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Parsing Error</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{parseError}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Toggle View Mode - Only show when stream is complete */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileJson className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Prompt Configuration
          </span>
          {!promptData.isComplete && isStreamActive && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              Streaming
            </Badge>
          )}
          {promptData.isComplete && (
            <Badge variant="outline" className="gap-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
              Complete
            </Badge>
          )}
        </div>
        
        {/* Only show toggle when complete */}
        {promptData.isComplete && (
          <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-background">
            <Button
              variant={viewMode === 'friendly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('friendly')}
              className="h-7 px-3 text-xs"
            >
              <Eye className="h-3 w-3 mr-1.5" />
              Friendly
            </Button>
            <Button
              variant={viewMode === 'json' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('json')}
              className="h-7 px-3 text-xs"
            >
              <Code2 className="h-3 w-3 mr-1.5" />
              JSON
            </Button>
          </div>
        )}
      </div>

      {/* Content Display - Always show friendly view during streaming */}
      {isStreamActive || viewMode === 'friendly' ? (
        <FriendlyView promptData={promptData} isStreamActive={isStreamActive} />
      ) : (
        <JsonView jsonContent={jsonBlock || ''} />
      )}
    </div>
  );
}

/**
 * Friendly View Component
 */
function FriendlyView({
  promptData,
  isStreamActive,
}: {
  promptData: PartialPromptData;
  isStreamActive: boolean;
}) {
  const hasAnyContent = !!(
    promptData.name ||
    promptData.description ||
    promptData.messages?.length ||
    promptData.variableDefaults?.length ||
    (promptData.settings && Object.keys(promptData.settings).length > 0)
  );

  // Show loading state when streaming with no data yet
  if (isStreamActive && !hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Generating prompt configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Name & Description */}
      {(promptData.name || promptData.description) && (
        <div className="border-l-2 border-purple-400 dark:border-purple-600 pl-2 py-1">
          {promptData.name && (
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {promptData.name}
            </h3>
          )}
          {promptData.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {promptData.description}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      {promptData.messages && promptData.messages.length > 0 && (
        <div className="space-y-1.5">
          {promptData.messages.map((message, index) => (
            <MessageCard
              key={index}
              message={message}
              isStreamActive={isStreamActive && index === promptData.messages!.length - 1}
            />
          ))}
        </div>
      )}

      {/* Variables */}
      {promptData.variableDefaults && promptData.variableDefaults.length > 0 && (
        <div className="border-t pt-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Variable className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Variables ({promptData.variableDefaults.length})
            </h4>
          </div>
          <VariablesTable variables={promptData.variableDefaults} />
        </div>
      )}

      {/* Settings */}
      {promptData.settings && Object.keys(promptData.settings).length > 0 && (
        <div className="border-t pt-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Settings className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Settings
            </h4>
          </div>
          <SettingsCard settings={promptData.settings} />
        </div>
      )}
    </div>
  );
}

/**
 * Message Card Component
 */
function MessageCard({
  message,
  isStreamActive,
}: {
  message: { role: string; content: string };
  isStreamActive: boolean;
}) {
  const roleConfig = {
    system: {
      icon: MessageSquare,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
    },
    user: {
      icon: MessageSquare,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/20',
      border: 'border-green-200 dark:border-green-800',
    },
    assistant: {
      icon: MessageSquare,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      border: 'border-purple-200 dark:border-purple-800',
    },
  };

  const config = roleConfig[message.role as keyof typeof roleConfig] || roleConfig.system;
  const Icon = config.icon;

  return (
    <div className={cn('border rounded-md overflow-hidden', config.border)}>
      {/* Compact header with icon and role on same line */}
      <div className={cn('flex items-center gap-1.5 px-2 py-1 border-b', config.bg, config.border)}>
        <Icon className={cn('h-3 w-3', config.color)} />
        <span className={cn('text-xs font-semibold uppercase tracking-wide', config.color)}>
          {message.role}
        </span>
      </div>
      {/* Tight content area */}
      <div className="px-2 py-1.5 bg-textured">
        <div className="prose prose-xs dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <HighlightedMessageContentMarkdown
            content={message.content}
            isStreamActive={isStreamActive}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Variables Table Component
 */
function VariablesTable({
  variables,
}: {
  variables: Array<{
    name: string;
    defaultValue?: string;
    customComponent?: any;
  }>;
}) {
  return (
    <div className="border rounded-md overflow-hidden bg-white dark:bg-gray-900/50">
      <table className="w-full">
        <thead>
          <tr className="bg-purple-50 dark:bg-purple-900/20 border-b">
            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
              Name
            </th>
            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
              Default
            </th>
            <th className="px-2 py-1 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {variables.map((variable, index) => (
            <tr
              key={index}
              className="border-b last:border-b-0"
            >
              <td className="px-2 py-1.5">
                <code className="text-xs font-mono bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded text-purple-700 dark:text-purple-300">
                  {variable.name}
                </code>
              </td>
              <td className="px-2 py-1.5">
                {variable.defaultValue ? (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {variable.defaultValue.length > 40
                      ? variable.defaultValue.substring(0, 40) + '...'
                      : variable.defaultValue}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-600 italic">
                    -
                  </span>
                )}
              </td>
              <td className="px-2 py-1.5">
                {variable.customComponent ? (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {variable.customComponent.type || 'custom'}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-600">
                    text
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Settings Card Component
 */
function SettingsCard({ settings }: { settings: Record<string, any> }) {
  const settingEntries = Object.entries(settings).filter(
    ([key]) => key !== 'tools' || (Array.isArray(settings.tools) && settings.tools.length > 0)
  );

  return (
    <div className="border rounded-md p-2 bg-gray-50 dark:bg-gray-900/50">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
        {settingEntries.map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {key.replace(/_/g, ' ')}
            </span>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {formatSettingValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * JSON View Component
 */
function JsonView({ jsonContent }: { jsonContent: string }) {
  return (
    <div className="relative">
      <pre className="p-4 bg-gray-900 dark:bg-black text-gray-100 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed border">
        <code>{jsonContent || '// Waiting for JSON...'}</code>
      </pre>
    </div>
  );
}

/**
 * Helper function to format setting values
 */
function formatSettingValue(value: any): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'string') {
    return value.length > 30 ? value.substring(0, 30) + '...' : value;
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === 'object' && value !== null) {
    return '{...}';
  }
  return String(value);
}

/**
 * Main export with error boundary
 */
export function PromptJsonDisplay(props: PromptJsonDisplayProps) {
  return (
    <PromptJsonErrorBoundary>
      <PromptJsonDisplayInternal {...props} />
    </PromptJsonErrorBoundary>
  );
}
