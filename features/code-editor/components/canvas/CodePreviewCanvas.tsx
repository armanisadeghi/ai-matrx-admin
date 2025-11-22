'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  X,
  Sparkles,
  GitCompare,
  File,
  FileCode,
  Eye,
  Edit3,
} from 'lucide-react';
import CodeBlock from '@/features/code-editor/components/code-block/CodeBlock';
import { DiffView } from '@/features/code-editor/components/DiffView';
import { getDiffStats } from '@/features/code-editor/utils/generateDiff';
import type { CodeEdit } from '@/features/code-editor/utils/parseCodeEdits';

export interface CodePreviewCanvasProps {
  originalCode: string;
  modifiedCode: string;
  language: string;
  edits: CodeEdit[];
  explanation?: string;
  onApply: () => void;
  onDiscard: () => void;
  onCloseModal?: () => void;
}

/**
 * CodePreviewCanvas - Shows code preview with diff in the canvas panel
 * 
 * Displays:
 * - Diff view (default)
 * - Original code
 * - Modified code preview
 * - Apply/Discard actions
 */
export function CodePreviewCanvas({
  originalCode,
  modifiedCode,
  language,
  edits,
  explanation,
  onApply,
  onDiscard,
  onCloseModal,
}: CodePreviewCanvasProps) {
  const [activeTab, setActiveTab] = useState('diff');
  const [isApplied, setIsApplied] = useState(false);

  const diffStats = getDiffStats(originalCode, modifiedCode);

  const handleApply = () => {
    onApply();
    setIsApplied(true);
  };

  const handleCloseAndView = () => {
    if (onCloseModal) {
      onCloseModal();
    }
  };

  const handleContinueEditing = () => {
    setIsApplied(false);
  };

  // Success state after applying changes
  if (isApplied) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">Changes Applied Successfully!</h3>
          
          <p className="text-muted-foreground mb-6 max-w-md">
            Your code has been updated. Close the modal to see the changes, or continue editing to make more modifications.
          </p>

          {/* Change Summary */}
          {diffStats && (
            <div className="flex items-center gap-3 mb-6">
              <Badge variant="outline" className="text-sm h-7 px-3 text-green-600 border-green-600 bg-green-50 dark:bg-green-950/30">
                +{diffStats.additions} {diffStats.additions === 1 ? 'addition' : 'additions'}
              </Badge>
              <Badge variant="outline" className="text-sm h-7 px-3 text-red-600 border-red-600 bg-red-50 dark:bg-red-950/30">
                -{diffStats.deletions} {diffStats.deletions === 1 ? 'deletion' : 'deletions'}
              </Badge>
            </div>
          )}

          {explanation && (
            <Alert className="mb-6 max-w-md text-left">
              <Sparkles className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {explanation}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <Button
              size="lg"
              onClick={handleCloseAndView}
              className="flex-1 gap-2"
              disabled={!onCloseModal}
            >
              <Eye className="w-4 h-4" />
              Close & View Changes
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleContinueEditing}
              className="flex-1 gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Continue Editing
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            You can make unlimited edits in a single session
          </p>
        </div>
      </div>
    );
  }

  // Preview state (before applying)
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tabs - VSCode style with minimal padding */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto shrink-0 gap-0">
          <TabsTrigger
            value="diff"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground hover:bg-muted/50 px-3 py-1 text-xs gap-1.5 h-7 font-normal"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Diff
          </TabsTrigger>
          <TabsTrigger
            value="original"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground hover:bg-muted/50 px-3 py-1 text-xs gap-1.5 h-7 font-normal"
          >
            <File className="w-3.5 h-3.5" />
            Original
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground hover:bg-muted/50 px-3 py-1 text-xs gap-1.5 h-7 font-normal"
          >
            <FileCode className="w-3.5 h-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Content - No padding, edge-to-edge */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="diff" className="h-full m-0 p-0 overflow-hidden">
            <DiffView
              originalCode={originalCode}
              modifiedCode={modifiedCode}
              language={language}
              showLineNumbers={true}
            />
          </TabsContent>

          <TabsContent value="original" className="h-full m-0 p-0 overflow-hidden">
            <div className="h-full overflow-auto">
              <CodeBlock
                code={originalCode}
                language={language}
                showLineNumbers={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="preview" className="h-full m-0 p-0 overflow-hidden">
            <div className="h-full overflow-auto">
              <CodeBlock
                code={modifiedCode}
                language={language}
                showLineNumbers={true}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer Actions */}
      <div className="px-4 py-2.5 border-t bg-muted/20 shrink-0">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscard}
            className="gap-1.5 h-8"
          >
            <X className="w-3.5 h-3.5" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Apply Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

