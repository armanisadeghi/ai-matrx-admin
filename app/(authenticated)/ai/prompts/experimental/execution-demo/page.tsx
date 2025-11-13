"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { PromptImporter } from "@/features/prompts";
import { DynamicContextMenu, DynamicCards, DynamicButtons } from "@/components/dynamic";
import { Code2, Sparkles, FileText, Upload, Zap, Grid3x3, Menu, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useSystemPrompts } from '@/hooks/useSystemPrompts';

export default function PromptExecutionDemoPage() {
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const { systemPrompts, loading: isLoadingSystemPrompts } = useSystemPrompts({
    is_active: true,
  });
  
  const handleOpenImporter = () => {
    setIsImporterOpen(true);
  };

  // Example context data for demonstration
  const exampleCodeContext = `function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`;

  const sampleContent = `Artificial Intelligence and Machine Learning

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

Try selecting some text and right-clicking to see available actions!`;
  
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
                  System Prompts Demo
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  100% database-driven AI prompt system
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
          {/* System Overview */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Database-Driven System Prompts
                </h2>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                  All AI interactions on this page are powered by system prompts stored in the database. 
                  Admins can create, manage, and assign prompts without touching code.
                </p>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/50">
                    {systemPrompts.length} System Prompts Configured
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
          <Tabs defaultValue="cards" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl">
              <TabsTrigger value="cards" className="flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" />
                Execution Cards
              </TabsTrigger>
              <TabsTrigger value="context-menu" className="flex items-center gap-2">
                <Menu className="h-4 w-4" />
                Context Menu
              </TabsTrigger>
              <TabsTrigger value="buttons" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Action Buttons
              </TabsTrigger>
            </TabsList>

            {/* Cards Tab - 100% Database Driven */}
            <TabsContent value="cards" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Dynamic Execution Cards</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    All cards below are loaded from the database. Placeholders show "Coming Soon" until a prompt is assigned.
                  </p>
                </div>

                <DynamicCards
                  context={sampleContent}
                  category="general"
                />

                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 mt-6">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <div className="space-y-2">
                      <p className="font-semibold">How to add new cards:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2 text-sm">
                        <li>Create a prompt with variables like <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{title}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{description}}'}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{context}}'}</code></li>
                        <li>Click "Convert to System Prompt" from the prompt's admin menu</li>
                        <li>Choose functionality: "Content Expander Card"</li>
                        <li>Set placement type: "card"</li>
                        <li>Activate it in the System Prompts Manager</li>
                      </ol>
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
              </div>
            </TabsContent>

            {/* Context Menu Tab - 100% Database Driven */}
            <TabsContent value="context-menu" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Dynamic Context Menu</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <strong>Try it:</strong> Select any text below and right-click. All menu options are loaded from the database.
                    Items marked "Coming Soon" are placeholders waiting for prompts.
                  </p>
                </div>
                
                {/* Database-driven context menu with text selection */}
                <Card className="p-6">
                  <DynamicContextMenu
                    uiContext={{
                      editorContent: sampleContent,
                      currentCode: exampleCodeContext,
                    }}
                  >
                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 min-h-[400px]">
                      <div className="prose dark:prose-invert max-w-none">
                        <h4 className="text-lg font-semibold mb-4">Interactive Demo Content</h4>
                        <div className="whitespace-pre-line text-sm leading-relaxed select-text">
                          {sampleContent}
                        </div>
                        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded font-mono text-xs">
                          <div className="text-muted-foreground mb-2">// Example code block</div>
                          {exampleCodeContext}
                        </div>
                      </div>
                    </div>
                  </DynamicContextMenu>
                </Card>

                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <div className="space-y-2">
                      <p className="font-semibold">Selected text is automatically passed as variables:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                        <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">{'{{selection}}'}</code> - The highlighted text</li>
                        <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">{'{{text}}'}</code> - Alias for selection</li>
                        <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">{'{{content}}'}</code> - Alias for selection</li>
                        <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">{'{{editorContent}}'}</code> - Full page content</li>
                        <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">{'{{currentCode}}'}</code> - Code context</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Buttons Tab - 100% Database Driven */}
            <TabsContent value="buttons" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Dynamic Action Buttons</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Buttons loaded from system prompts configured with placement type "button".
                  </p>
                </div>

                <Card className="p-6">
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                      Dynamic buttons configured for "button" placement type:
                    </p>
                    <DynamicButtons
                      uiContext={{
                        pageContent: sampleContent,
                        currentCode: exampleCodeContext,
                      }}
                      category="general"
                      className="flex flex-wrap gap-3"
                    />
                  </div>
                </Card>

                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/30">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-900 dark:text-orange-100">
                    <div className="space-y-2">
                      <p className="font-semibold">How to add action buttons:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2 text-sm">
                        <li>Create a prompt with the variables your button needs</li>
                        <li>Convert to system prompt and select appropriate functionality</li>
                        <li>Set placement type to "button"</li>
                        <li>Configure button style and category</li>
                        <li>Activate in System Prompts Manager</li>
                      </ol>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-8" />

          {/* Technical Architecture */}
          <Card className="p-6 border-purple-200 dark:border-purple-800">
            <h2 className="text-lg font-semibold mb-3">System Architecture</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    🎯 Core Concepts
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Functionality</strong>: What the prompt does (defined in code)</li>
                    <li>• <strong>Placement</strong>: Where it appears (cards, menus, buttons)</li>
                    <li>• <strong>Variables</strong>: Dynamic data injected at runtime</li>
                    <li>• <strong>Context Resolution</strong>: Smart mapping of UI state to variables</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold text-purple-600 dark:text-purple-400">
                    ⚡ Key Components
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">DynamicCards</code> - Renders card placements</li>
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">DynamicContextMenu</code> - Renders context menus</li>
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">DynamicButtons</code> - Renders button placements</li>
                    <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">PromptContextResolver</code> - Resolves variables</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="font-semibold text-purple-600 dark:text-purple-400">
                  📋 Admin Workflow
                </div>
                <div className="grid gap-3 md:grid-cols-5 text-xs">
                  <div className="flex items-start gap-2">
                    <Badge className="flex-none">1</Badge>
                    <span>Create prompt with <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{'{{variables}}'}</code></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="flex-none">2</Badge>
                    <span>Convert to system prompt via admin menu</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="flex-none">3</Badge>
                    <span>Select functionality (validates variables)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="flex-none">4</Badge>
                    <span>Choose placement type & category</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge className="flex-none">5</Badge>
                    <span>Activate in manager - done! 🎉</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="font-semibold text-purple-600 dark:text-purple-400">
                  🔄 Two-Way System
                </div>
                <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded">
                    <div className="font-semibold mb-1">From Prompts → System</div>
                    <p className="text-xs">Convert existing prompts into system prompts via the "Convert to System Prompt" button on any prompt card.</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded">
                    <div className="font-semibold mb-1">From System → Prompts</div>
                    <p className="text-xs">Assign prompts to placeholders via the System Prompts Manager by clicking the link icon on any placeholder row.</p>
                  </div>
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
