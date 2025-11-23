'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TailwindColorPicker } from '@/components/ui/TailwindColorPicker';
import { 
  MessageSquare, 
  FileText, 
  Box, 
  Sparkles, 
  Code2,
  Zap,
  Clock,
  Palette,
  ChevronRight,
  Check,
  Layers,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTitleCase } from '@/utils/text/text-case-converter';

interface AutoCreatePromptAppFormProps {
  prompt?: any;
  prompts: any[];
  categories: any[];
  onSuccess?: () => void;
}

type FormatType = 'chat' | 'form' | 'box';
type DisplayMode = 'ai-stream' | 'custom';
type ResponseMode = 'stream' | 'loader';

export function AutoCreatePromptAppForm({ prompt, prompts, categories, onSuccess }: AutoCreatePromptAppFormProps) {
  const [format, setFormat] = useState<FormatType | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode | null>(null);
  const [responseMode, setResponseMode] = useState<ResponseMode | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('blue');
  const [secondaryColor, setSecondaryColor] = useState<string>('gray');
  const [accentColor, setAccentColor] = useState<string>('zinc');
  const [additionalComments, setAdditionalComments] = useState('');

  const handleSubmit = () => {
    console.log('Auto Create Submission:', {
      prompt,
      format,
      displayMode,
      responseMode,
      colors: {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
      },
      additionalComments,
    });
  };

  const isValid = format && displayMode && responseMode;

  // Extract variables from prompt
  const promptVariables = prompt?.variable_defaults || [];
  const hasVariables = promptVariables.length > 0;
  const promptName = prompt?.name || 'Prompt';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Heading with Prompt Name */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">
          Your Custom <span className="text-primary">{promptName}</span> App
        </h2>
      </div>

      {/* Step 1: Input Fields */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
            1
          </div>
          <Label className="text-lg font-semibold">Input Fields We'll Create</Label>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {promptVariables.map((variable: any, index: number) => (
                  <div
                    key={index}
                    className="group relative overflow-hidden rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full text-primary flex-shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-sm text-foreground">
                        {formatTitleCase(variable.name)}
                      </span>
                    </div>
                  </div>
                ))}
                {/* User Instructions - Always included */}
                <div className="group relative overflow-hidden rounded-lg border bg-card p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full text-primary flex-shrink-0">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">
                      User Instructions
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Check className="w-3.5 h-3.5 text-success" />
                <span>All input fields will be automatically generated with appropriate UI components</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 2: Format */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
            2
          </div>
          <Label className="text-lg font-semibold">Choose Your App Format</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chat Format */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]',
              format === 'chat' && 'ring-2 ring-primary shadow-lg scale-[1.02]'
            )}
            onClick={() => setFormat('chat')}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-blue-500/10">
                  <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                {format === 'chat' && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Chat Style</h3>
                <p className="text-sm text-muted-foreground">
                  Like ChatGPT - conversation flows with input at bottom. Perfect for interactive AI experiences.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Form Format */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]',
              format === 'form' && 'ring-2 ring-primary shadow-lg scale-[1.02]'
            )}
            onClick={() => setFormat('form')}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-green-500/10">
                  <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                {format === 'form' && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Form Layout</h3>
                <p className="text-sm text-muted-foreground">
                  Traditional top-to-bottom flow. Input at top, results fill down. Clean and familiar.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Box Format */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]',
              format === 'box' && 'ring-2 ring-primary shadow-lg scale-[1.02]'
            )}
            onClick={() => setFormat('box')}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-purple-500/10">
                  <Box className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                {format === 'box' && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Widget Style</h3>
                <p className="text-sm text-muted-foreground">
                  Confined widget perfect for embedding. Input → Loading → Result in same space.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step 3: Display Mode */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
            3
          </div>
          <Label className="text-lg font-semibold">How Should Results Display?</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Stream Mode */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]',
              displayMode === 'ai-stream' && 'ring-2 ring-primary shadow-lg scale-[1.02]'
            )}
            onClick={() => setDisplayMode('ai-stream')}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                {displayMode === 'ai-stream' && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Matrx Custom Formatted Display</h3>
                <p className="text-sm text-muted-foreground">
                  Full AI Matrx experience with rich formatting, flashcards, code blocks, and all custom UIs you're familiar with.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Custom Mode */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]',
              displayMode === 'custom' && 'ring-2 ring-primary shadow-lg scale-[1.02]'
            )}
            onClick={() => setDisplayMode('custom')}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-orange-500/10">
                  <Code2 className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                {displayMode === 'custom' && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Custom Display</h3>
                <p className="text-sm text-muted-foreground">
                  Fully customized UI designed specifically for your output structure. Complete control, but requires a highly reliable prompt output.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step 4: Response Mode */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
            4
          </div>
          <Label className="text-lg font-semibold">Response Delivery Style</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stream Mode */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]',
              responseMode === 'stream' && 'ring-2 ring-primary shadow-lg scale-[1.02]'
            )}
            onClick={() => setResponseMode('stream')}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-green-500/10">
                  <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                {responseMode === 'stream' && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Real-time Streaming</h3>
                <p className="text-sm text-muted-foreground">
                  Content appears as it's generated. Feels responsive and clearly AI-powered.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Loader Mode */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]',
              responseMode === 'loader' && 'ring-2 ring-primary shadow-lg scale-[1.02]'
            )}
            onClick={() => setResponseMode('loader')}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-blue-500/10">
                  <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                {responseMode === 'loader' && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Show All at Once</h3>
                <p className="text-sm text-muted-foreground">
                  Loading screen, then complete result. Feels like a traditional app, less "AI-like".
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step 5: Color Preferences */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
            5
          </div>
          <Label className="text-lg font-semibold">Choose Your Color Palette</Label>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Primary Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4 text-primary" />
                    Primary Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <TailwindColorPicker
                      selectedColor={primaryColor}
                      onColorChange={setPrimaryColor}
                      size="md"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Main brand color:<br />
                        - Buttons<br />
                        - Key Elements<br />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4 text-secondary" />
                    Secondary Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <TailwindColorPicker
                      selectedColor={secondaryColor}
                      onColorChange={setSecondaryColor}
                      size="md"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Supporting color:<br />
                        - Headers<br />
                        - Highlights<br />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    Accent Color
                  </Label>
                  <div className="flex items-center gap-3">
                    <TailwindColorPicker
                      selectedColor={accentColor}
                      onColorChange={setAccentColor}
                      size="md"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        Pop of color:<br />
                        - Special elements<br />
                        - Effects<br />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 6: Additional Comments */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold text-sm">
            6
          </div>
          <Label className="text-lg font-semibold">
            Additional Requirements <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
        </div>
        
        <Textarea
          value={additionalComments}
          onChange={(e) => setAdditionalComments(e.target.value)}
          placeholder="Any specific UI features, styling preferences, or special functionality? For example: 'Add a copy button for the result' or 'Show a character counter' or 'Use a dark theme by default'..."
          rows={6}
          className="resize-none"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          size="lg"
          className="min-w-[200px] gap-2"
        >
          {!isValid ? (
            'Complete All Steps'
          ) : (
            <>
              Generate My App
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>

      {/* Progress Indicator */}
      {!isValid && (
        <div className="text-center text-sm text-muted-foreground">
          {!format && 'Please select an app format to continue'}
          {format && !displayMode && 'Please choose how results should display'}
          {format && displayMode && !responseMode && 'Please select a response delivery style'}
        </div>
      )}
    </div>
  );
}

