/**
 * Example: Text Analyzer with User Input
 * 
 * Demonstrates:
 * - Using usePromptExecution hook
 * - Dynamic variables from component state
 * - Plain text output with custom handling
 * - Progress tracking
 */

"use client";

import { useState } from 'react';
import { usePromptExecution, createHardcodedMap } from '@/features/prompts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

export function TextAnalyzerExample() {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState('');
  const { execute, isExecuting, streamingText } = usePromptExecution();

  const handleAnalyze = async () => {
    setAnalysis('');
    await execute({
      promptId: '176d3595-0d30-4e98-a73e-13de7654a408', // User's text analyzer prompt
      variables: {
        text: { type: 'hardcoded', value: text }
      }
    });
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Text Analyzer</CardTitle>
        <CardDescription>
          Analyze text for sentiment, tone, key themes, and more
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Text to Analyze</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter or paste text to analyze..."
            rows={6}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={isExecuting || !text.trim()}
          className="w-full"
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze Text
            </>
          )}
        </Button>

        {streamingText && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Analysis Result (Streaming)</label>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
              <p className="text-sm whitespace-pre-wrap">{streamingText}</p>
            </div>
          </div>
        )}

        {!isExecuting && analysis && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Analysis Result</label>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
              <p className="text-sm whitespace-pre-wrap">{analysis}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

