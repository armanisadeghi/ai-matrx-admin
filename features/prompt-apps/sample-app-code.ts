const sampleSimplePromptAppCode = `import React, { useState, useMemo } from 'react';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import MarkdownStream from '@/components/Markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface PromptAppComponentProps {
  onExecute: (variables: Record<string, any>) => Promise<void>;
  response: string;
  isStreaming: boolean;
  isExecuting: boolean;
  error: { type: string; message: string } | null;
  rateLimitInfo: {
    allowed: boolean;
    remaining: number;
    reset_at: string;
    is_blocked: boolean;
  } | null;
  appName: string;
  appTagline?: string;
  appCategory?: string;
}

export default function PromptAppComponent({
  onExecute,
  response,
  isStreaming,
  isExecuting,
  error,
  rateLimitInfo,
  appName,
  appTagline,
  appCategory,
}: PromptAppComponentProps) {
  const [variables, setVariables] = useState({
    topic: '',
    description: '',
    style: 'professional',
    length: 3,
  });

  // Form validation
  const isFormValid = useMemo(() => {
    return variables.topic.trim() !== '';
  }, [variables]);

  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid) return;
    await onExecute(variables);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pb-6 space-y-6">
      {/* Input Card */}
      <Card className="bg-card border-border">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Generate Content
          </CardTitle>
          {appTagline && (
            <p className="text-sm text-muted-foreground mt-1">{appTagline}</p>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Text Input */}
            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                value={variables.topic}
                onChange={(e) =>
                  setVariables({ ...variables, topic: e.target.value })
                }
                placeholder="Enter your topic..."
                disabled={isExecuting || isStreaming}
              />
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <Label htmlFor="description">Additional Details (Optional)</Label>
              <Textarea
                id="description"
                value={variables.description}
                onChange={(e) =>
                  setVariables({ ...variables, description: e.target.value })
                }
                placeholder="Provide any additional context or requirements..."
                rows={4}
                disabled={isExecuting || isStreaming}
              />
            </div>

            {/* Select Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select
                value={variables.style}
                onValueChange={(value) =>
                  setVariables({ ...variables, style: value })
                }
                disabled={isExecuting || isStreaming}
              >
                <SelectTrigger id="style">
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <Label>
                Length: {variables.length} {variables.length === 1 ? 'paragraph' : 'paragraphs'}
              </Label>
              <Slider
                value={[variables.length]}
                onValueChange={([value]) =>
                  setVariables({ ...variables, length: value })
                }
                min={1}
                max={10}
                step={1}
                disabled={isExecuting || isStreaming}
                className="w-full"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={!isFormValid || isExecuting || isStreaming}
              className="w-full"
            >
              {isExecuting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isExecuting ? 'Generating...' : 'Generate Content'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">{error.type}</p>
              <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Rate Limit Warning */}
      {rateLimitInfo &&
        rateLimitInfo.remaining <= 2 &&
        rateLimitInfo.remaining > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Only {rateLimitInfo.remaining} free{' '}
              {rateLimitInfo.remaining === 1 ? 'use' : 'uses'} remaining.
              <a
                href="/sign-up"
                className="underline ml-1 font-semibold hover:text-amber-900 dark:hover:text-amber-100"
              >
                Sign up
              </a>{' '}
              for unlimited access.
            </p>
          </div>
        )}

      {/* Response Card */}
      {response && (
        <Card className="bg-card border-border">
          <CardHeader className="bg-muted/50">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
              Generated Content
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <MarkdownStream content={response} />
            {isStreaming && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Generating content...
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}`;

const getSamplePromptAppCode = (appStyle: string) => {
  switch (appStyle) {
    case 'simple':
      return sampleSimplePromptAppCode;
    default:
      return sampleSimplePromptAppCode;
  }
};

export default getSamplePromptAppCode;