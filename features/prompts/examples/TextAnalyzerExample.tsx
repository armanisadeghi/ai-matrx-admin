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
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function TextAnalyzerExample() {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState('');
  const { execute, isExecuting, progress } = usePromptExecution();

  const handleAnalyze = async () => {
    setAnalysis('');
    
    const result = await execute({
      promptId: 'text-analysis',
      variables: {
        text: { type: 'hardcoded', value: text },
        analysisType: { type: 'hardcoded', value: 'comprehensive' }
      },
      output: {
        type: 'plain-text',
        onComplete: (result) => {
          setAnalysis(result);
        }
      }
    });
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;
    switch (progress.status) {
      case 'initializing': return 10;
      case 'resolving-variables': return 25;
      case 'executing': return 40;
      case 'streaming': return 75;
      case 'processing-output': return 90;
      case 'complete': return 100;
      default: return 0;
    }
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

        {isExecuting && progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {progress.message || progress.status}
              </span>
              <Badge variant="outline">{getProgressPercentage()}%</Badge>
            </div>
            <Progress value={getProgressPercentage()} />
          </div>
        )}

        {analysis && (
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

