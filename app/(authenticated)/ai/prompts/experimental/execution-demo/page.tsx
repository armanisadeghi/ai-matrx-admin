"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromptImporter } from "@/features/prompts";
import { DynamicContextMenu, DynamicCards, DynamicButtons } from "@/features/prompts/components/dynamic";
import { FileText, Zap, Grid3x3, Menu } from "lucide-react";
import { Badge } from '@/components/ui/badge';

export default function PromptExecutionDemoPage() {
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [textareaContent, setTextareaContent] = useState(`Artificial Intelligence and Machine Learning

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

Try selecting some text and right-clicking to see available actions!`);

  const sampleContent = `# The Persian Empire

## Essential Vocabulary

**Achaemenid Empire** - The first Persian Empire, founded by Cyrus the Great, known for its vast size and efficient administration.

**Cyrus the Great** - Founder of the Persian Empire, famous for his military conquests and policy of tolerance.

**Darius I** - Persian ruler who expanded the empire and organized it into satrapies.

**Satrap** - A provincial governor in the Persian Empire who ruled a satrapy.

**Royal Road** - A major road built by the Persians to facilitate communication and trade across the empire.

**Zoroastrianism** - The main religion of the Persian Empire, emphasizing the struggle between good and evil.

## Historical Significance

The Persian Empire was one of the largest empires in the ancient world, demonstrating early examples of imperial governance over diverse peoples.`;

  const exampleCode = `function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}`;

  return (
    <div className="h-page flex flex-col overflow-hidden bg-textured">
      {/* Header */}
      <div className="flex-none border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">System Prompts Demo</h1>
              <p className="text-sm text-muted-foreground">
                100% database-driven AI actions
              </p>
            </div>
            <Button onClick={() => setIsImporterOpen(true)} variant="outline">
              Import Prompts
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Tabs defaultValue="context-menu" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-3xl">
              <TabsTrigger value="context-menu">
                <Menu className="h-4 w-4 mr-2" />
                Context Menu
              </TabsTrigger>
              <TabsTrigger value="text-editor">
                <FileText className="h-4 w-4 mr-2" />
                Text Editor
              </TabsTrigger>
              <TabsTrigger value="cards">
                <Grid3x3 className="h-4 w-4 mr-2" />
                Cards
              </TabsTrigger>
              <TabsTrigger value="buttons">
                <Zap className="h-4 w-4 mr-2" />
                Buttons
              </TabsTrigger>
            </TabsList>

            {/* Context Menu Demo */}
            <TabsContent value="context-menu" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Right-Click Context Menu</h3>
                  <p className="text-sm text-muted-foreground">
                    Select text below and right-click
                  </p>
                </div>
                <Badge>
                  Database: system_prompts WHERE placement_type='context-menu'
                </Badge>
              </div>

              <DynamicContextMenu
                uiContext={{
                  fullContent: sampleContent,
                  context: sampleContent,
                  editorContent: sampleContent,
                  currentCode: exampleCode,
                }}
              >
                <Card className="p-6 min-h-[400px] cursor-text select-text hover:border-primary/50 transition-colors">
                  <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                    {sampleContent}
                  </div>
                  <div className="mt-6 p-4 bg-muted rounded-lg font-mono text-sm">
                    <div className="text-xs text-muted-foreground mb-2">// Code example:</div>
                    {exampleCode}
                  </div>
                </Card>
              </DynamicContextMenu>
            </TabsContent>

            {/* Text Editor Demo */}
            <TabsContent value="text-editor" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Editable Text Area</h3>
                  <p className="text-sm text-muted-foreground">
                    Select text and right-click for AI actions
                  </p>
                </div>
                <Badge>
                  With Replace/Insert Options (Coming Soon)
                </Badge>
              </div>

              <DynamicContextMenu
                uiContext={{
                  fullContent: textareaContent,
                  context: textareaContent,
                  editable: true,
                }}
              >
                <Card className="p-0 overflow-hidden">
                  <textarea
                    className="w-full p-6 bg-card min-h-[500px] resize-y font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
                    value={textareaContent}
                    onChange={(e) => setTextareaContent(e.target.value)}
                    placeholder="Start typing or paste content here..."
                  />
                </Card>
              </DynamicContextMenu>
            </TabsContent>

            {/* Cards Demo */}
            <TabsContent value="cards" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Execution Cards</h3>
                  <p className="text-sm text-muted-foreground">
                    Click any card to execute its AI action
                  </p>
                </div>
                <Badge>
                  Database: system_prompts WHERE placement_type='card'
                </Badge>
              </div>

              <DynamicCards
                context={sampleContent}
              />

              <Card className="p-4 bg-muted/50">
                <p className="text-sm">
                  <strong>Not seeing cards?</strong> Check: <code className="bg-background px-1 py-0.5 rounded">SELECT * FROM system_prompts WHERE placement_type='card' AND is_active=true</code>
                </p>
              </Card>
            </TabsContent>

            {/* Buttons Demo */}
            <TabsContent value="buttons" className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Action Buttons</h3>
                  <p className="text-sm text-muted-foreground">
                    Click any button to trigger its action
                  </p>
                </div>
                <Badge>
                  Database: system_prompts WHERE placement_type='button'
                </Badge>
              </div>

              <Card className="p-6">
                <DynamicButtons
                  context={{
                    pageContent: sampleContent,
                    currentCode: exampleCode,
                  }}
                  renderAs="inline"
                />
              </Card>

              <Card className="p-4 bg-muted/50">
                <p className="text-sm">
                  <strong>Not seeing buttons?</strong> Check: <code className="bg-background px-1 py-0.5 rounded">SELECT * FROM system_prompts WHERE placement_type='button' AND is_active=true</code>
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PromptImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={(promptId) => console.log('Imported:', promptId)}
      />
    </div>
  );
}
