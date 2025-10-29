/**
 * Example: Chained Prompts
 * 
 * Demonstrates:
 * - Sequential prompt execution
 * - Using results from previous prompts
 * - Complex workflows
 * - Progress tracking across multiple steps
 */

"use client";

import { useState } from 'react';
import { usePromptExecution } from '@/features/prompts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  promptId: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  result?: string;
}

export function ChainedPromptsExample() {
  const [inputText, setInputText] = useState('');
  const [steps, setSteps] = useState<Step[]>([
    { id: 'summary', label: 'Summarize', promptId: 'summarize-text', status: 'pending' },
    { id: 'analyze', label: 'Analyze Summary', promptId: 'analyze-content', status: 'pending' },
    { id: 'recommendations', label: 'Generate Recommendations', promptId: 'generate-recommendations', status: 'pending' }
  ]);
  const { execute } = usePromptExecution();
  const [isRunning, setIsRunning] = useState(false);

  const updateStepStatus = (stepId: string, status: Step['status'], result?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, result } : step
    ));
  };

  const runChainedAnalysis = async () => {
    if (!inputText.trim()) return;
    
    setIsRunning(true);
    
    try {
      // Step 1: Summarize
      updateStepStatus('summary', 'running');
      const summaryResult = await execute({
        promptId: steps[0].promptId,
        variables: {
          text: { type: 'hardcoded', value: inputText }
        }
      });
      
      if (!summaryResult.success) {
        updateStepStatus('summary', 'error');
        return;
      }
      
      updateStepStatus('summary', 'complete', summaryResult.text);

      // Step 2: Analyze the summary
      updateStepStatus('analyze', 'running');
      const analysisResult = await execute({
        promptId: steps[1].promptId,
        variables: {
          content: { type: 'hardcoded', value: summaryResult.text }
        }
      });
      
      if (!analysisResult.success) {
        updateStepStatus('analyze', 'error');
        return;
      }
      
      updateStepStatus('analyze', 'complete', analysisResult.text);

      // Step 3: Generate recommendations based on analysis
      updateStepStatus('recommendations', 'running');
      const recommendationsResult = await execute({
        promptId: steps[2].promptId,
        variables: {
          analysis: { type: 'hardcoded', value: analysisResult.text }
        },
        output: {
          type: 'canvas',
          options: { title: 'Recommendations' }
        }
      });
      
      if (!recommendationsResult.success) {
        updateStepStatus('recommendations', 'error');
        return;
      }
      
      updateStepStatus('recommendations', 'complete', recommendationsResult.text);

    } finally {
      setIsRunning(false);
    }
  };

  const resetWorkflow = () => {
    setSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending',
      result: undefined
    })));
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Chained Prompt Workflow</CardTitle>
        <CardDescription>
          Execute multiple prompts in sequence, each using the previous result
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Input Text</label>
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to analyze..."
            rows={4}
            disabled={isRunning}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Workflow Steps</label>
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0 mt-0.5">
                {step.status === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : step.status === 'running' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                ) : step.status === 'error' ? (
                  <Circle className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{step.label}</span>
                  <Badge
                    variant={
                      step.status === 'complete' ? 'default' :
                      step.status === 'running' ? 'secondary' :
                      step.status === 'error' ? 'destructive' :
                      'outline'
                    }
                  >
                    {step.status}
                  </Badge>
                </div>
                
                {step.result && (
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                    <p className="line-clamp-2">{step.result}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={runChainedAnalysis}
            disabled={isRunning || !inputText.trim()}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Workflow...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Run Workflow
              </>
            )}
          </Button>
          
          <Button
            onClick={resetWorkflow}
            disabled={isRunning}
            variant="outline"
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

