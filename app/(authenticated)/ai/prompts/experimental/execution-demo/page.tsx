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
import { PromptExecutionCard } from "@/features/prompts";
import { MatrxActionsDemo } from "@/features/matrx-actions/examples/MatrxActionsDemo";
import { DynamicContextMenu, DynamicCards, DynamicButtons } from "@/components/dynamic";
import { Code2, Sparkles, FileText, Upload, Zap, Grid3x3, Menu, AlertCircle } from "lucide-react";
import DEMO_PROMPTS from "@/features/prompts/DEMO_PROMPTS.json";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useSystemPrompts } from '@/hooks/useSystemPrompts';

export default function PromptExecutionDemoPage() {
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const { systemPrompts, loading: isLoadingSystemPrompts } = useSystemPrompts({
    is_active: true,
    status: 'published'
  });
  
  const handleOpenImporter = () => {
    setIsImporterOpen(true);
  };

  // Example context data for demonstration
  const exampleCodeContext = `function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`;

  const exampleTextContext = `The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet at least once. It's commonly used for testing fonts and keyboards.`;

  const sampleContent = `
Artificial Intelligence and Machine Learning

Artificial Intelligence (AI) has transformed the way we interact with technology. 
From voice assistants to autonomous vehicles, AI systems are becoming increasingly 
sophisticated and integrated into our daily lives.

Machine learning, a subset of AI, enables computers to learn from data without being 
explicitly programmed. These systems can identify patterns, make decisions, and improve 
their performance over time.

Key Benefits:
• Automation of repetitive tasks
• Enhanced decision-making with data analysis
• Personalized user experiences
• Improved efficiency and productivity

Try selecting some text and right-clicking to see available actions!
  `;
  
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
          {/* System Prompts Overview */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  System Prompts Manager
                </h2>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                  Admins can convert any prompt into a global system prompt that can be triggered throughout the application 
                  via execution cards, context menus, buttons, and other UI components.
                </p>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/50">
                    {systemPrompts.length} System Prompts Active
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('/administration/system-prompts', '_blank')}
                    className="border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:hover:bg-purple-900/50"
                  >
                    Manage System Prompts
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Demo Tabs */}
          <Tabs defaultValue="system-prompts" className="w-full">
            <TabsList className="grid w-full grid-cols-5 max-w-4xl">
              <TabsTrigger value="system-prompts" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                System Prompts
              </TabsTrigger>
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
                <Menu className="h-4 w-4" />
                Context Menu
              </TabsTrigger>
            </TabsList>

            {/* System Prompts Tab */}
            <TabsContent value="system-prompts" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">System Prompt Execution Cards</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    These cards demonstrate the new system prompts feature. Admins can create these prompts from the 
                    admin interface and configure them to appear as cards, in context menus, or as buttons throughout the app.
                  </p>
                </div>

                {isLoadingSystemPrompts ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-6 h-48 animate-pulse bg-muted/50" />
                    ))}
                  </div>
                ) : systemPrompts.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {systemPrompts
                      .filter((sp) => sp.placement_config?.card?.enabled)
                      .map((systemPrompt) => (
                        <PromptExecutionCard
                          key={systemPrompt.id}
                          systemPrompt={systemPrompt}
                          title={systemPrompt.display_config?.label || systemPrompt.name}
                          description={systemPrompt.description || ''}
                          context={exampleCodeContext}
                        />
                      ))}
                  </div>
                ) : (
                  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 dark:text-blue-100">
                      <div className="space-y-3">
                        <p>No active system prompts configured for cards yet.</p>
                        <div className="text-sm">
                          <p className="font-semibold mb-2">To create system prompt cards:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Go to AI Prompts and create a prompt with variables</li>
                            <li>Click the admin menu (three dots) on the prompt card</li>
                            <li>Select "Convert to System Prompt"</li>
                            <li>Configure the prompt in the System Prompts Manager</li>
                            <li>Enable "Card" placement and set it as active</li>
                          </ol>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => window.open('/ai/prompts', '_blank')}
                          className="mt-2"
                        >
                          Go to AI Prompts
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {/* Example Cards with Hardcoded Data */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Example: Manual Execution Cards</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    These are example cards showing how developers can create custom execution cards 
                    programmatically by providing a system prompt configuration.
                  </p>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="p-6 space-y-3 hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600">
                          <Code2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">Code Analyzer</h4>
                          <p className="text-xs text-muted-foreground">
                            Analyze code for best practices, potential bugs, and improvements
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Example - Not Active</Badge>
                    </Card>

                    <Card className="p-6 space-y-3 hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">Content Generator</h4>
                          <p className="text-xs text-muted-foreground">
                            Generate high-quality content based on your specifications
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Example - Not Active</Badge>
                    </Card>

                    <Card className="p-6 space-y-3 hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-red-600">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">Quick Refactor</h4>
                          <p className="text-xs text-muted-foreground">
                            Refactor and optimize your code with AI assistance
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">Example - Not Active</Badge>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Matrx Actions Tab */}
            <TabsContent value="matrx-actions" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Database-Driven Context Menus</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    All menu items now load from the database. Right-click on the text below to see 
                    all available actions. Items marked "Coming Soon" are placeholders waiting for prompts.
                  </p>
                </div>
                
                {/* Database-driven context menu */}
                <Card className="p-6">
                  <DynamicContextMenu
                    uiContext={{
                      selection: '',
                      editorContent: exampleCodeContext,
                      currentCode: exampleCodeContext,
                    }}
                  >
                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[300px]">
                      <div className="prose dark:prose-invert max-w-none">
                        <h4 className="text-lg font-semibold mb-4">Try it: Right-click anywhere!</h4>
                        <div className="whitespace-pre-line text-sm leading-relaxed select-text">
                          {sampleContent}
                        </div>
                      </div>
                    </div>
                  </DynamicContextMenu>
                </Card>

                {/* Old demo for comparison */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Show old hardcoded demo (for comparison)
                  </summary>
                  <div className="mt-4">
                    <MatrxActionsDemo />
                  </div>
                </details>
              </div>
            </TabsContent>

            {/* Text Analyzer Tab */}
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

            {/* Modal Demo Tab */}
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

            {/* Context Menu Tab */}
            <TabsContent value="context-menu" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Context Menu Demo</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Right-click on text to see AI prompt options. System prompts configured for context menus 
                    will appear dynamically in the menu. Demonstrates <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      TextSelectionPromptMenu
                    </code> with multiple grouped actions
                  </p>
                </div>
                <ContextMenuExample />
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-8" />

          {/* Technical Info */}
          <Card className="p-6 border-purple-200 dark:border-purple-800">
            <h2 className="text-lg font-semibold mb-3">How System Prompts Work</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    Core Components
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">SystemPromptsManager</code> - Admin management UI</li>
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">PromptExecutionCard</code> - Clickable card component</li>
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">PromptContextMenu</code> - Dynamic context menu</li>
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">useSystemPrompts</code> - Data fetching hook</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    Key Features
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li>• Admin-managed global system prompts</li>
                    <li>• Dynamic placement configuration (cards, menus, buttons)</li>
                    <li>• Variable mapping and context passing</li>
                    <li>• Versioning and update tracking</li>
                    <li>• Category-based organization</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="font-semibold text-purple-600 dark:text-purple-400">
                  Admin Workflow
                </div>
                <ol className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge className="flex-none mt-0.5">1</Badge>
                    <span>Create a prompt in AI Prompts with variables (e.g., <code>{'{{text}}'}</code>, <code>{'{{code}}'}</code>)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="flex-none mt-0.5">2</Badge>
                    <span>Convert to System Prompt via the admin menu</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="flex-none mt-0.5">3</Badge>
                    <span>Configure display settings (icon, label, tooltip)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="flex-none mt-0.5">4</Badge>
                    <span>Enable placement options (cards, context menus, buttons)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="flex-none mt-0.5">5</Badge>
                    <span>Set as active and published to make it available</span>
                  </li>
                </ol>
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
