"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  TextAnalyzerExample,
  PromptModalExample,
  ContextMenuExample
} from "@/features/prompts/examples";
import { PromptImporter } from "@/features/prompts";
import { MatrxActionsDemo } from "@/features/matrx-actions/examples/MatrxActionsDemo";
import { Code2, Sparkles, FileText, Upload, Zap } from "lucide-react";
import DEMO_PROMPTS from "@/features/prompts/DEMO_PROMPTS.json";

export default function PromptExecutionDemoPage() {
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  
  const handleOpenImporter = () => {
    setIsImporterOpen(true);
  };
  
  return (
    <div className="h-page flex flex-col overflow-hidden bg-textured">
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
                <Code2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Prompt Execution System Demo
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Live examples of the programmatic prompt execution system
                </p>
              </div>
            </div>
            <Button
              onClick={handleOpenImporter}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Demo Prompts
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Setup Instructions */}
          <Card className="p-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Setup Required
            </h2>
            <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
              <p>
                These demos require specific prompts to be created in the database. 
                Create the following prompts in the AI Prompts section:
              </p>
              
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-white dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="font-mono text-xs text-blue-600 dark:text-blue-300 mb-2">
                    Prompt ID: text-analyzer
                  </div>
                  <div className="font-semibold mb-2">Text Analyzer</div>
                  <div className="space-y-1 text-xs">
                    <div><span className="font-semibold">Variables:</span> text</div>
                    <div><span className="font-semibold">Purpose:</span> Analyze text for sentiment, tone, and themes</div>
                    <div className="pt-2 italic text-blue-700 dark:text-blue-300">
                      System Message: "You are an expert text analyst. Analyze the provided text 
                      for sentiment, tone, key themes, and important insights. Be concise but thorough."
                    </div>
                    <div className="pt-2 italic text-blue-700 dark:text-blue-300">
                      User Message: "Analyze this text:\n\n{'{'}{'{'} text {'}'}{'}'}'"
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="font-mono text-xs text-blue-600 dark:text-blue-300 mb-2">
                    Prompt ID: demo-prompt
                  </div>
                  <div className="font-semibold mb-2">Demo Prompt (Multi-Variable)</div>
                  <div className="space-y-1 text-xs">
                    <div><span className="font-semibold">Variables:</span> topic, style, detail_level</div>
                    <div><span className="font-semibold">Purpose:</span> Flexible demo prompt for testing the modal</div>
                    <div className="pt-2 italic text-blue-700 dark:text-blue-300">
                      System Message: "You are a helpful AI assistant. Generate content based on 
                      the user's specifications. Match the requested style and detail level."
                    </div>
                    <div className="pt-2 italic text-blue-700 dark:text-blue-300">
                      User Message: "Create content about: {'{'}{'{'} topic {'}'}{'}'}
                      {'\n'}Style: {'{'}{'{'} style {'}'}{'}'}
                      {'\n'}Detail level: {'{'}{'{'} detail_level {'}'}{'}'}'"
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 text-xs">
                <strong>Note:</strong> The System Prompt Optimizer already works with prompt ID 
                <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded mx-1">
                  6e4e6335-dc04-4946-9435-561352db5b26
                </code>
              </div>
            </div>
          </Card>

          {/* Demo Tabs */}
          <Tabs defaultValue="matrx-actions" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-3xl">
              <TabsTrigger value="matrx-actions" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Matrx Actions
              </TabsTrigger>
              <TabsTrigger value="text-analyzer" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Text Analyzer
              </TabsTrigger>
              <TabsTrigger value="modal" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Modal Demo
              </TabsTrigger>
              <TabsTrigger value="context-menu" className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Context Menu
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matrx-actions" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Matrx Actions System (New!)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Demonstrating the new hierarchical action system with separation of concerns. 
                    Actions are defined separately from where they appear in menus.
                  </p>
                </div>
                <MatrxActionsDemo />
              </div>
            </TabsContent>

            <TabsContent value="text-analyzer" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Text Analyzer Hook Demo</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Demonstrates using <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      usePromptExecution
                    </code> hook with streaming responses
                  </p>
                </div>
                <TextAnalyzerExample />
              </div>
            </TabsContent>

            <TabsContent value="modal" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Universal Modal Demo</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Demonstrates <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      PromptExecutionModal
                    </code> with automatic variable detection
                  </p>
                </div>
                <PromptModalExample />
              </div>
            </TabsContent>

            <TabsContent value="context-menu" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Context Menu Demo</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Right-click on text to see AI prompt options. Demonstrates <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      TextSelectionPromptMenu
                    </code> with multiple grouped actions
                  </p>
                </div>
                <ContextMenuExample />
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-8" />

          {/* Coming Soon / Disabled Examples */}
          <Card className="p-6 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Additional Examples (Coming Soon)
            </h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Content Generator - Hardcoded variables demo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Context Menu - Right-click text selection demo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Chained Prompts - Sequential execution workflow</span>
              </div>
              <p className="text-xs mt-4 italic">
                These require additional prompts to be created. Enable them as needed by adding 
                the required prompts and uncommenting the examples in this file.
              </p>
            </div>
          </Card>

          {/* Technical Info */}
          <Card className="p-6 border-purple-200 dark:border-purple-800">
            <h2 className="text-lg font-semibold mb-3">How It Works</h2>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    Core Components
                  </div>
                  <ul className="space-y-1 text-xs">
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">usePromptExecution</code> - Hook for execution</li>
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">PromptExecutionButton</code> - Button component</li>
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">PromptExecutionModal</code> - Universal modal</li>
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">usePromptModal</code> - Modal state hook</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    Key Features
                  </div>
                  <ul className="space-y-1 text-xs">
                    <li>• Socket.IO streaming (same as PromptRunner)</li>
                    <li>• Automatic variable detection & replacement</li>
                    <li>• Redux integration for state management</li>
                    <li>• Flexible variable sources (hardcoded, context, etc.)</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Prompt Importer Modal */}
      <PromptImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={(promptId) => {
          console.log('Imported prompt:', promptId);
        }}
      />
    </div>
  );
}
