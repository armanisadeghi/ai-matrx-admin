/**
 * Example: Universal Prompt Execution Modal
 * 
 * Demonstrates using the PromptExecutionModal for various use cases
 */

"use client";

import { useState } from 'react';
import { PromptExecutionModal, usePromptModal } from '@/features/prompts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Database, FileText, Link as LinkIcon } from 'lucide-react';

export function PromptModalExample() {
  const [result, setResult] = useState('');

  // Example 1: Simple text analysis
  const textAnalysisModal = usePromptModal({
    promptId: 'text-analyzer',
    promptName: 'Text Analyzer',
    onResult: (text) => {
      setResult(text);
      console.log('Analysis complete:', text);
    }
  });

  // Example 2: With default values (uses demo-prompt)
  const demoModal = usePromptModal({
    promptId: 'demo-prompt',
    promptName: 'Demo Multi-Variable',
    defaultValues: {
      topic: 'Artificial Intelligence',
      style: 'professional',
      detail_level: 'comprehensive'
    },
    onResult: (text) => {
      setResult(text);
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Universal Prompt Execution Modal</CardTitle>
          <CardDescription>
            Execute any prompt with automatic variable detection and input forms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Example Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={textAnalysisModal.open} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Text Analyzer
            </Button>

            <Button onClick={demoModal.open} variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Demo (with defaults)
            </Button>
          </div>

          {/* Result Display */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
              <h3 className="text-sm font-semibold mb-2">Latest Result:</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {result}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <PromptExecutionModal {...textAnalysisModal.modalProps} />
      <PromptExecutionModal {...demoModal.modalProps} />
    </div>
  );
}

/**
 * Example: In a Table Context
 */
export function TableContextExample() {
  const modal = usePromptModal({
    promptId: 'analyze-row',
    promptName: 'Analyze Row',
    onResult: (analysis) => {
      console.log('Row analysis:', analysis);
    }
  });

  const handleAnalyzeRow = (rowId: string, rowData: any) => {
    // You could pass row data as default values
    modal.open();
  };

  return (
    <div>
      {/* Your table */}
      <Button onClick={() => handleAnalyzeRow('row-1', {})}>
        Analyze Row
      </Button>
      
      <PromptExecutionModal {...modal.modalProps} />
    </div>
  );
}

/**
 * Example: Context Menu Integration
 */
export function ContextMenuWithModalExample() {
  const [selectedText, setSelectedText] = useState('');
  
  const modal = usePromptModal({
    promptId: 'improve-text',
    promptName: 'Improve Text',
    defaultValues: {
      text: selectedText
    },
    onResult: (improved) => {
      console.log('Improved:', improved);
    }
  });

  return (
    <div>
      {/* Your content with selection */}
      <div onMouseUp={() => {
        const selection = window.getSelection()?.toString();
        if (selection) {
          setSelectedText(selection);
          modal.open();
        }
      }}>
        Select text to improve...
      </div>

      <PromptExecutionModal {...modal.modalProps} />
    </div>
  );
}

