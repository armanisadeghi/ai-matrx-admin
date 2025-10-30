/**
 * PromptImporter Component
 * 
 * UI for importing prompts from JSON format
 */

"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea, CopyTextarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy, 
  Download,
  FileJson,
  AlertCircle
} from 'lucide-react';
import { importPrompt, importPromptBatch } from '../services/prompt-import-service';
import type { PromptJSON, PromptBatchJSON, PromptImportResult } from '../types/prompt-json';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface PromptImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (promptId: string) => void;
}

export function PromptImporter({ isOpen, onClose, onImportSuccess }: PromptImporterProps) {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<PromptImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast.error('Please paste JSON to import');
      return;
    }

    setIsImporting(true);
    setResults([]);
    setShowResults(false);

    try {
      const parsed = JSON.parse(jsonInput);

      // Check if it's a batch import or single prompt
      if (parsed.prompts && Array.isArray(parsed.prompts)) {
        // Batch import
        const batchResult = await importPromptBatch(parsed as PromptBatchJSON);
        setResults(batchResult.results);
        
        if (batchResult.success) {
          toast.success(`Successfully imported ${batchResult.totalImported} prompt(s)`);
        } else {
          toast.warning(`Imported ${batchResult.totalImported} prompt(s), ${batchResult.totalFailed} failed`);
        }
      } else {
        // Single prompt import
        const result = await importPrompt(parsed as PromptJSON);
        setResults([result]);
        
        if (result.success) {
          toast.success(`Prompt "${result.promptName}" imported successfully`);
          onImportSuccess?.(result.promptId);
        } else {
          toast.error(`Failed to import: ${result.error}`);
        }
      }

      setShowResults(true);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Invalid JSON format');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setJsonInput('');
    setResults([]);
    setShowResults(false);
    onClose();
  };

  const handleViewPrompt = (promptId: string) => {
    router.push(`/ai/prompts/edit/${promptId}`);
    handleClose();
  };

  const exampleJSON: PromptJSON = {
    name: "Example Prompt",
    description: "This is an example prompt",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: "Please help me with {{task}}."
      }
    ],
    variables: [
      {
        name: "task",
        defaultValue: "writing code"
      }
    ],
    settings: {
      temperature: 0.7,
      max_tokens: 1000
    }
  };

  const handleCopyExample = () => {
    navigator.clipboard.writeText(JSON.stringify(exampleJSON, null, 2));
    toast.success('Example copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Import Prompts from JSON
          </DialogTitle>
          <DialogDescription>
            Paste JSON to create or update prompts programmatically
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
            {/* Example/Help Card */}
            <div className="flex-shrink-0 flex items-center justify-between gap-3 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  Format: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{ prompts: [...] }'}</code>
                  • Variables: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{variable}}'}</code>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyExample}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex-shrink-0 h-7 px-2"
              >
                <Copy className="h-3 w-3 mr-1" />
                Example
              </Button>
            </div>

            {/* JSON Input - Takes up most of the space */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <label className="text-sm font-medium mb-1.5 flex-shrink-0">Prompt JSON</label>
              <CopyTextarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={JSON.stringify(exampleJSON, null, 2)}
                className="flex-1 font-mono text-xs resize-none min-h-0 h-full"
                style={{ minHeight: '400px' }}
                disabled={isImporting}
              />
            </div>

            {/* Import Button */}
            <div className="flex-shrink-0 flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {jsonInput.trim() && (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Ready to import
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting || !jsonInput.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <Card
                  key={index}
                  className={result.success
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
                    : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {result.promptName}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {result.message || result.error}
                          </div>
                          {result.success && result.promptId && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                              ID: {result.promptId}
                            </div>
                          )}
                        </div>
                      </div>
                      {result.success && result.promptId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPrompt(result.promptId)}
                          className="flex-shrink-0"
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {results.filter(r => r.success).length} succeeded, {results.filter(r => !r.success).length} failed
              </div>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

