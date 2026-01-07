'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Rss, Loader2, Scale, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import MarkdownStream from '@/components/MarkdownStream';

export default function BalancedNewsAnalysis({
  onExecute,
  response,
  isExecuting,
  isStreaming,
  error,
  rateLimitInfo
}) {
  const [variables, setVariables] = useState({
    topic: ''
  });

  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const isFormValid = useMemo(() => {
    return variables.topic.trim().length > 0;
  }, [variables.topic]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isFormValid) {
      setIsFormCollapsed(true);
      await onExecute(variables);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && isFormValid) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 pb-12 space-y-6">
      {/* Header Section */}
      {!isFormCollapsed && (
        <div className="text-center space-y-2 pt-1">
          <div className="flex items-center justify-center gap-2">
            <Scale className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
              Balanced News Analysis
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Explore complex issues through multiple perspectives and make your own informed conclusions.
          </p>
        </div>
      )}

      {/* Rate Limit Warning */}
      {rateLimitInfo && rateLimitInfo.remaining <= 2 && rateLimitInfo.remaining > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            ⚠️ Only {rateLimitInfo.remaining} free analysis remaining.
            <a href="/sign-up" className="underline ml-1 font-semibold hover:text-amber-900 dark:hover:text-amber-100">
              Sign up
            </a> for unlimited access.
          </p>
        </div>
      )}

      {/* Input Form Card */}
      <Card className="bg-card border-border shadow-md">
        {isFormCollapsed ? (
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">News Analysis Topic:</p>
                <p className="text-sm text-foreground truncate">{variables.topic}</p>
              </div>
              <Button
                onClick={() => setIsFormCollapsed(false)}
                variant="outline"
                size="sm"
              >
                Change Topic
              </Button>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader className="bg-muted/50 border-b border-border">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Rss className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                Analysis Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-2">
              {/* Topic Input */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-base font-semibold">
                  News Topic or Current Event
                </Label>
                <Textarea
                  ref={textareaRef}
                  id="topic"
                  value={variables.topic}
                  onChange={(e) => setVariables({ ...variables, topic: e.target.value })}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter a news topic, current event, issue , or entire article to analyze..."
                  rows={4}
                  disabled={isExecuting || isStreaming}
                  className="resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={!isFormValid || isExecuting || isStreaming}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Scale className="w-4 h-4 mr-1" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-card border-destructive shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-destructive">{error.type}</p>
                <p className="text-sm text-destructive/80">{error.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Result */}
      {(response || isStreaming) && (
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="bg-muted/50 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Scale className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              Multi-Perspective Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 bg-textured">
            {response ? (
              <>
                <MarkdownStream content={response} />
                {isStreaming && (
                  <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-400" />
                    <span className="text-sm text-muted-foreground">
                      Analyzing perspectives and synthesizing insights...
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-slate-600 dark:text-slate-400" />
                <p className="text-sm text-muted-foreground">
                  Preparing balanced analysis...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information Footer */}
      {!response && !isStreaming && (
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-2">
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                Balanced & Unbiased Analysis
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="font-medium text-foreground">Progressive View</div>
                  <p className="text-muted-foreground">
                    Examines liberal and progressive perspectives, priorities, and proposed solutions
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-foreground">Conservative View</div>
                  <p className="text-muted-foreground">
                    Explores conservative and Republican viewpoints, values, and policy positions
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="font-medium text-foreground">Balanced Synthesis</div>
                  <p className="text-muted-foreground">
                    Identifies common ground, core disagreements, and factual evidence from all sides
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}