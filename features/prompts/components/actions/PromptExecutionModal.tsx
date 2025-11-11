/**
 * Universal Prompt Execution Modal
 * 
 * A reusable modal that can execute any prompt by ID.
 * Automatically detects variables and provides input forms.
 * Supports table bookmarks and other data sources.
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Loader2, Copy, Check, Database, FileText, Link } from 'lucide-react';
import { usePromptExecution } from '../../hooks/usePromptExecution';
import { supabase } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { extractVariablesFromMessages } from '../../utils/variable-resolver';
import type { TableBookmark, VariableDataSource } from '../../types/data-sources';

interface PromptExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  promptName?: string;
  modalTitle?: string;
  onResult?: (result: string) => void;
  onExecutionComplete?: (result: any) => void;
  defaultValues?: Record<string, string>;
  hiddenVariables?: Record<string, string>;
  hideUserInput?: boolean;
  allowInitialMessage?: boolean;
  allowChat?: boolean;
}

interface PromptData {
  id: string;
  name: string;
  messages: any[];
  variables: string[];
}

export function PromptExecutionModal({
  isOpen,
  onClose,
  promptId,
  promptName: externalPromptName,
  modalTitle,
  onResult,
  onExecutionComplete,
  defaultValues = {},
  hiddenVariables = {},
  hideUserInput = false,
  allowInitialMessage = true,
  allowChat = false
}: PromptExecutionModalProps) {
  const [promptData, setPromptData] = useState<PromptData | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [variableValues, setVariableValues] = useState<Record<string, VariableDataSource>>({});
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'result'>('input');
  
  const { execute, isExecuting } = usePromptExecution();

  // Load prompt data when modal opens
  useEffect(() => {
    if (isOpen && promptId) {
      loadPromptData();
    }
  }, [isOpen, promptId]);

  // Initialize default values and hidden variables (only once when modal opens)
  useEffect(() => {
    if (!isOpen || !promptData) return;
    
    const initialized: Record<string, VariableDataSource> = {};
    
    // Process defaultValues
    Object.keys(defaultValues).forEach(varName => {
      if (promptData.variables.includes(varName) && defaultValues[varName]) {
        initialized[varName] = {
          type: 'text',
          value: defaultValues[varName]
        };
      }
    });
    
    // Process hiddenVariables (takes precedence)
    Object.keys(hiddenVariables).forEach(varName => {
      if (promptData.variables.includes(varName) && hiddenVariables[varName]) {
        initialized[varName] = {
          type: 'text',
          value: hiddenVariables[varName]
        };
      }
    });
    
    if (Object.keys(initialized).length > 0) {
      setVariableValues(initialized);
    }
    
    // Only run once when modal opens with new prompt data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, promptData?.id]);

  // Auto-execute if all variables are provided and no user input needed
  useEffect(() => {
    if (!isOpen || !promptData || isExecuting || result) return;
    
    const visibleVars = promptData.variables.filter(v => !hiddenVariables[v]);
    const hasAllVariables = promptData.variables.every(v => {
      const varValue = variableValues[v];
      if (!varValue) return false;
      if (varValue.type === 'text') return !!varValue.value;
      return true; // Other types are considered valid if present
    });
    const shouldAutoExecute = hasAllVariables && visibleVars.length === 0 && !allowInitialMessage;
    
    if (shouldAutoExecute && Object.keys(variableValues).length > 0) {
      // Small delay to ensure state is fully set
      setTimeout(() => {
        handleExecute();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, promptData?.id, variableValues, isExecuting, result]);

  const loadPromptData = async () => {
    setIsLoadingPrompt(true);
    try {
      const { data: prompt, error } = await supabase
        .from('prompts')
        .select('id, name, messages')
        .eq('id', promptId)
        .single();

      if (error || !prompt) {
        toast.error('Failed to load prompt');
        return;
      }

      const variables = extractVariablesFromMessages(prompt.messages || []);

      setPromptData({
        id: prompt.id,
        name: prompt.name,
        messages: prompt.messages,
        variables
      });
    } catch (error) {
      toast.error('Error loading prompt');
      console.error(error);
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  const handleVariableChange = (varName: string, source: VariableDataSource) => {
    setVariableValues(prev => ({
      ...prev,
      [varName]: source
    }));
  };

  const handleExecute = async () => {
    if (!promptData) return;

    // Validate all variables have values
    const missingVars = promptData.variables.filter(
      varName => !variableValues[varName] || 
                 (variableValues[varName].type === 'text' && !variableValues[varName].value)
    );

    if (missingVars.length > 0) {
      toast.error('Missing variables', {
        description: `Please provide values for: ${missingVars.join(', ')}`
      });
      return;
    }

    setResult('');
    setActiveTab('result');

    try {
      // Convert variable sources to simple string values
      const variables: Record<string, { type: 'hardcoded', value: string }> = {};
      
      for (const [varName, source] of Object.entries(variableValues)) {
        let value = '';
        
        switch (source.type) {
          case 'text':
            value = source.value;
            break;
          case 'table-bookmark':
            // If data is already loaded, use it; otherwise fetch
            if (source.data) {
              value = source.data;
            } else {
              // Fetch data based on bookmark type
              value = await fetchTableData(source.bookmark);
            }
            break;
          case 'file':
            value = source.content || `[File: ${source.fileId}]`;
            break;
          case 'url':
            value = source.content || source.url;
            break;
        }
        
        variables[varName] = { type: 'hardcoded', value };
      }

      const executionResult = await execute({
        promptId,
        variables,
        userInput: userInput.trim() || undefined,
        onProgress: (progressUpdate) => {
          if (progressUpdate.streamedText) {
            setResult(progressUpdate.streamedText);
          }
        }
      });

      if (onResult && result) {
        onResult(result);
      }
      
      if (onExecutionComplete && executionResult) {
        onExecutionComplete(executionResult);
      }
    } catch (error) {
      toast.error('Execution failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const fetchTableData = async (bookmark: TableBookmark): Promise<string> => {
    
    try {
      switch (bookmark.type) {
        case 'full_table': {
          const { data, error } = await supabase
            .from('user_generated_tables_data')
            .select('*')
            .eq('table_id', bookmark.table_id);
          
          if (error) throw error;
          return JSON.stringify(data, null, 2);
        }
        
        case 'table_row': {
          const { data, error } = await supabase
            .from('user_generated_tables_data')
            .select('*')
            .eq('table_id', bookmark.table_id)
            .eq('id', bookmark.row_id)
            .single();
          
          if (error) throw error;
          return JSON.stringify(data, null, 2);
        }
        
        case 'table_column': {
          const { data, error } = await supabase
            .from('user_generated_tables_data')
            .select(bookmark.column_name)
            .eq('table_id', bookmark.table_id);
          
          if (error) throw error;
          return data.map(row => row[bookmark.column_name]).join('\n');
        }
        
        case 'table_cell': {
          const { data, error } = await supabase
            .from('user_generated_tables_data')
            .select(bookmark.column_name)
            .eq('table_id', bookmark.table_id)
            .eq('id', bookmark.row_id)
            .single();
          
          if (error) throw error;
          return String(data[bookmark.column_name] || '');
        }
        
        default:
          return '';
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
      return `[Error fetching ${bookmark.type}]`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setResult('');
    setUserInput('');
    setVariableValues({});
    setActiveTab('input');
    onClose();
  };

  const promptName = modalTitle || externalPromptName || promptData?.name || 'Execute Prompt';
  const visibleVariables = promptData?.variables.filter(varName => !hiddenVariables[varName]) || [];
  const hasVisibleVariables = visibleVariables.length > 0;
  const shouldShowUserInput = allowInitialMessage && !hideUserInput;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {promptName}
          </DialogTitle>
          <DialogDescription>
            {isLoadingPrompt ? 'Loading prompt...' : 
             hasVisibleVariables ? `${visibleVariables.length} variable(s)` : 'Ready to execute'}
          </DialogDescription>
        </DialogHeader>

        {isLoadingPrompt ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : promptData ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'input' | 'result')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="result" disabled={!result && !isExecuting}>
                Result
              </TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {/* Variable Inputs (only show non-hidden variables) */}
                  {hasVisibleVariables && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Variables
                      </h3>
                      {visibleVariables.map((varName) => (
                        <VariableInput
                          key={varName}
                          variableName={varName}
                          value={variableValues[varName]}
                          onChange={(source) => handleVariableChange(varName, source)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Optional User Input */}
                  {shouldShowUserInput && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Additional Input (Optional)
                      </Label>
                      <Textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Add any additional context or instructions..."
                        className="h-24 resize-none"
                        disabled={isExecuting}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="result" className="flex-1 overflow-hidden">
              <div className="h-[500px] relative">
                {isExecuting ? (
                  <ScrollArea className="h-full">
                    <div className="space-y-3 p-4">
                      {result ? (
                        <>
                          <div className="prose dark:prose-invert max-w-none">
                            <p className="text-sm whitespace-pre-wrap">{result}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Streaming response...</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Executing prompt...
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : result ? (
                  <>
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        <div className="prose dark:prose-invert max-w-none">
                          <p className="text-sm whitespace-pre-wrap">{result}</p>
                        </div>
                      </div>
                    </ScrollArea>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <p className="text-sm">No result yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Failed to load prompt</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isExecuting && (
              <span>Executing prompt...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isExecuting}
            >
              {result ? 'Close' : 'Cancel'}
            </Button>
            
            {activeTab === 'input' && (
              <Button
                onClick={handleExecute}
                disabled={isExecuting || !promptData}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Execute
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Variable Input Component
 * Handles different input types for variables
 */
function VariableInput({
  variableName,
  value,
  onChange
}: {
  variableName: string;
  value: VariableDataSource | undefined;
  onChange: (source: VariableDataSource) => void;
}) {
  const [inputType, setInputType] = useState<'text' | 'table' | 'file' | 'url'>('text');
  const [textValue, setTextValue] = useState('');

  useEffect(() => {
    if (value?.type === 'text') {
      setTextValue(value.value);
    }
  }, [value]);

  const handleTextChange = (newValue: string) => {
    setTextValue(newValue);
    onChange({ type: 'text', value: newValue });
  };

  const displayName = variableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {displayName}
        </Label>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-xs",
              inputType === 'text' && "bg-gray-100 dark:bg-gray-800"
            )}
            onClick={() => setInputType('text')}
            title="Text input"
          >
            <FileText className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-xs",
              inputType === 'table' && "bg-gray-100 dark:bg-gray-800"
            )}
            onClick={() => setInputType('table')}
            title="Table data"
          >
            <Database className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {inputType === 'text' ? (
        <Textarea
          value={textValue}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={`Enter ${displayName.toLowerCase()}...`}
          className="h-20 resize-none text-sm"
        />
      ) : inputType === 'table' ? (
        <div className="p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Table bookmark selector (coming soon)
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
            For now, paste table reference JSON or use text input
          </p>
        </div>
      ) : null}
    </div>
  );
}

