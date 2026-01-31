// @ts-nocheck
/**
 * Example: Context Menu for Text Selection
 * 
 * Demonstrates:
 * - TextSelectionPromptMenu component
 * - Multiple prompt options in a menu
 * - Context-based variable resolution
 * - Grouped menu items
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Sparkles,
  Languages,
  ListChecks,
  Lightbulb,
  AlertCircle
} from 'lucide-react';

const sampleArticle = `
Artificial Intelligence is transforming how we interact with technology. 
Machine learning models can now understand context, generate human-like text, 
and solve complex problems. However, it's important to use these tools responsibly 
and understand their limitations. The future of AI development will likely focus 
on making these systems more transparent, reliable, and beneficial for everyone.
`;

export function ContextMenuExample() {
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Context Menu Prompts</CardTitle>
        <CardDescription>
          Select text below and right-click to see AI prompt options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-900 dark:text-blue-100">
              Try selecting some text and right-clicking to see available AI operations
            </span>
          </p>
        </div>

        <TextSelectionPromptMenu
          options={[
            {
              label: 'Summarize',
              icon: FileText,
              group: 'content',
              config: {
                promptId: 'summarize-text',
                variables: {
                  text: { type: 'context', path: 'selectedText' },
                  style: { type: 'hardcoded', value: 'concise' }
                },
                output: {
                  type: 'canvas',
                  options: { title: 'Summary' }
                }
              }
            },
            {
              label: 'Improve Writing',
              icon: Sparkles,
              group: 'content',
              config: {
                promptId: 'improve-writing',
                variables: {
                  text: { type: 'context', path: 'selectedText' }
                },
                output: { type: 'canvas' }
              }
            },
            {
              label: 'Extract Key Points',
              icon: ListChecks,
              group: 'content',
              config: {
                promptId: 'extract-key-points',
                variables: {
                  text: { type: 'context', path: 'selectedText' }
                },
                output: {
                  type: 'json',
                  onComplete: (data) => {
                    console.log('Key points:', data);
                  }
                }
              }
            },
            {
              label: 'Translate to Spanish',
              icon: Languages,
              group: 'translation',
              config: {
                promptId: 'translate-text',
                variables: {
                  text: { type: 'context', path: 'selectedText' },
                  targetLanguage: { type: 'hardcoded', value: 'Spanish' }
                }
              }
            },
            {
              label: 'Translate to French',
              icon: Languages,
              group: 'translation',
              config: {
                promptId: 'translate-text',
                variables: {
                  text: { type: 'context', path: 'selectedText' },
                  targetLanguage: { type: 'hardcoded', value: 'French' }
                }
              }
            },
            {
              label: 'Generate Ideas',
              icon: Lightbulb,
              group: 'creative',
              config: {
                promptId: 'generate-ideas',
                variables: {
                  topic: { type: 'context', path: 'selectedText' }
                },
                output: { type: 'canvas' }
              }
            }
          ]}
        >
          <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border-border">
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold mb-3">Sample Article</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line select-text">
                {sampleArticle}
              </p>
            </div>
          </div>
        </TextSelectionPromptMenu>
      </CardContent>
    </Card>
  );
}

