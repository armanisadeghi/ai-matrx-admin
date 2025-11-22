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
}: CodePreviewCanvasProps) {
  const [activeTab, setActiveTab] = useState('diff');

  const diffStats = getDiffStats(originalCode, modifiedCode);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">Code Preview</h3>
            <span className="text-xs text-muted-foreground">
              {edits.length} edit{edits.length !== 1 ? 's' : ''}
            </span>
          </div>
          {diffStats && (
            <div className="flex gap-1.5">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-green-600 border-green-600 bg-green-50 dark:bg-green-950/30">
                +{diffStats.additions}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-red-600 border-red-600 bg-red-50 dark:bg-red-950/30">
                -{diffStats.deletions}
              </Badge>
            </div>
          )}
        </div>

        {explanation && (
          <Alert className="py-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <AlertDescription className="text-xs">{explanation}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto shrink-0 gap-0 mx-4 mt-2">
          <TabsTrigger
            value="diff"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground hover:bg-muted/50 px-3 py-1.5 text-xs gap-1.5 h-8 font-normal"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Diff
          </TabsTrigger>
          <TabsTrigger
            value="original"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground hover:bg-muted/50 px-3 py-1.5 text-xs gap-1.5 h-8 font-normal"
          >
            <File className="w-3.5 h-3.5" />
            Original
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground hover:bg-muted/50 px-3 py-1.5 text-xs gap-1.5 h-8 font-normal"
          >
            <FileCode className="w-3.5 h-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 mt-2 min-h-0 mx-4 mb-4 border rounded overflow-hidden bg-background">
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
      <div className="px-4 py-3 border-t bg-muted/20 shrink-0">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDiscard}
            className="gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Discard
          </Button>
          <Button
            size="sm"
            onClick={onApply}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Apply Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

