/**
 * PromptJsonDisplay Component
 * 
 * Displays prompt JSON data in a beautiful, user-friendly format
 * with progressive parsing support for streaming data
 */

"use client";

import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
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

  if (!hasAnyData && !jsonBlock) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Error Display */}
      {parseError && (
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
      
      {/* Toggle View Mode */}
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
      </div>

      {/* Content Display */}
      {viewMode === 'friendly' ? (
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
  return (
    <div className="space-y-4">
      {/* Name & Description */}
      {(promptData.name || promptData.description) && (
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
          {promptData.name && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {promptData.name}
            </h3>
          )}
          {promptData.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {promptData.description}
            </p>
          )}
        </Card>
      )}

      {/* Messages */}
      {promptData.messages && promptData.messages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Messages
            </h4>
          </div>
          
          <div className="space-y-3">
            {promptData.messages.map((message, index) => (
              <MessageCard
                key={index}
                message={message}
                isStreamActive={isStreamActive && index === promptData.messages!.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Variables */}
      {promptData.variableDefaults && promptData.variableDefaults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Variable className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Variables
            </h4>
            <Badge variant="secondary" className="text-xs">
              {promptData.variableDefaults.length}
            </Badge>
          </div>
          
          <VariablesTable variables={promptData.variableDefaults} />
        </div>
      )}

      {/* Settings */}
      {promptData.settings && Object.keys(promptData.settings).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
  const roleColors = {
    system: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300',
    user: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300',
    assistant: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300',
  };

  const roleColor = roleColors[message.role as keyof typeof roleColors] || roleColors.assistant;

  return (
    <Card className="overflow-hidden border-2">
      <div className={cn('px-3 py-2 border-b', roleColor)}>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {message.role}
        </span>
      </div>
      <div className="p-3 bg-white dark:bg-gray-900/50">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <HighlightedMessageContentMarkdown
            content={message.content}
            isStreamActive={isStreamActive}
          />
        </div>
      </div>
    </Card>
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
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900/50">
      <table className="w-full">
        <thead>
          <tr className="bg-purple-50 dark:bg-purple-900/20 border-b">
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
              Variable Name
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
              Default Value
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
              Component Type
            </th>
          </tr>
        </thead>
        <tbody>
          {variables.map((variable, index) => (
            <tr
              key={index}
              className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td className="px-4 py-3">
                <code className="text-xs font-mono bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-purple-700 dark:text-purple-300">
                  {variable.name}
                </code>
              </td>
              <td className="px-4 py-3">
                {variable.defaultValue ? (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {variable.defaultValue.length > 50
                      ? variable.defaultValue.substring(0, 50) + '...'
                      : variable.defaultValue}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-600 italic">
                    (empty)
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {variable.customComponent ? (
                  <Badge variant="secondary" className="text-xs">
                    {variable.customComponent.type || 'custom'}
                  </Badge>
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
    <Card className="p-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {settingEntries.map(([key, value]) => (
          <div key={key} className="flex items-start gap-2">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                {formatSettingValue(value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
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
