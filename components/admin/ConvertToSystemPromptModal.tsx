/**
 * ConvertToSystemPromptModal (NEW SCHEMA)
 * 
 * Simplified 2-Step Wizard for converting a regular prompt to a system prompt:
 * 1. Select Category (determines placement_type)
 * 2. Configure & Confirm (prompt_id, label, icon)
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useSystemPromptCategories } from '@/hooks/useSystemPromptCategories';
import { cn } from '@/utils';
import { toast } from 'sonner';

interface ConvertToSystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  promptName: string;
  promptDescription?: string;
  promptVariables: string[];
  onSuccess?: () => void;
}

type WizardStep = 'category' | 'configure';

export function ConvertToSystemPromptModal({
  isOpen,
  onClose,
  promptId,
  promptName,
  promptDescription,
  promptVariables,
  onSuccess,
}: ConvertToSystemPromptModalProps) {
  const { categories, isLoading: categoriesLoading } = useSystemPromptCategories({ activeOnly: false });
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('category');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Category Selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Step 2: Configuration
  const [systemPromptId, setSystemPromptId] = useState('');
  const [label, setLabel] = useState(promptName);
  const [description, setDescription] = useState(promptDescription || '');
  const [iconName, setIconName] = useState('Sparkles');

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('category');
      setSelectedCategoryId('');
      setLabel(promptName);
      setDescription(promptDescription || '');
      setSystemPromptId('');
      setIconName('Sparkles');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, promptName, promptDescription]);

  // Auto-generate prompt_id when label changes
  useEffect(() => {
    if (label) {
      const generated = label
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSystemPromptId(generated);
    }
  }, [label]);

  // Group categories by placement_type
  const categoriesByPlacement = useMemo(() => {
    const grouped: Record<string, typeof categories> = {};
    categories.forEach((cat) => {
      const placement = cat.placement_type || 'other';
      if (!grouped[placement]) {
        grouped[placement] = [];
      }
      grouped[placement].push(cat);
    });
    return grouped;
  }, [categories]);

  const selectedCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCategoryId);
  }, [categories, selectedCategoryId]);

  const handleNext = () => {
    if (currentStep === 'category') {
      if (!selectedCategoryId) {
        setError('Please select a category');
        return;
      }
      setError('');
      setCurrentStep('configure');
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep('category');
  };

  const handleSubmit = async () => {
    if (!systemPromptId.trim()) {
      setError('Prompt ID is required');
      return;
    }
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    if (!selectedCategoryId) {
      setError('Category is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/prompts/${promptId}/convert-to-system-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: systemPromptId,
          category_id: selectedCategoryId,
          label,
          description,
          icon_name: iconName,
          tags: [],
          metadata: {
            original_prompt_variables: promptVariables,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to convert prompt');
      }

      toast.success('System prompt created successfully!', {
        description: 'The prompt has been added as a draft. Enable it in the admin interface.',
      });

      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create system prompt');
      toast.error('Failed to convert prompt', {
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (name?: string) => {
    if (!name) return Sparkles;
    const Icon = (LucideIcons as any)[name];
    return Icon || Sparkles;
  };

  const Icon = getIcon(iconName);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Convert to System Prompt</DialogTitle>
          <DialogDescription>
            Step {currentStep === 'category' ? '1' : '2'} of 2: {currentStep === 'category' ? 'Select Category' : 'Configure Details'}
          </DialogDescription>
        </DialogHeader>

        {categoriesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 flex-1 rounded",
                currentStep === 'category' ? 'bg-primary' : 'bg-primary'
              )} />
              <div className={cn(
                "h-2 flex-1 rounded",
                currentStep === 'configure' ? 'bg-primary' : 'bg-muted'
              )} />
            </div>

            {/* Step 1: Category Selection */}
            {currentStep === 'category' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Category</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose where this system prompt will appear
                  </p>
                </div>

                {Object.entries(categoriesByPlacement).map(([placementType, cats]) => (
                  <div key={placementType} className="space-y-2">
                    <Label className="text-sm font-semibold capitalize">
                      {placementType.replace('-', ' ')}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {cats.map((category) => {
                        const CategoryIcon = getIcon(category.icon_name);
                        const isSelected = selectedCategoryId === category.id;
                        
                        return (
                          <Card
                            key={category.id}
                            className={cn(
                              "cursor-pointer transition-all hover:border-primary",
                              isSelected && "border-primary bg-primary/5"
                            )}
                            onClick={() => setSelectedCategoryId(category.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <CategoryIcon className={cn("h-5 w-5 flex-shrink-0", category.color)} />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{category.label}</div>
                                  {category.description && (
                                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                      {category.description}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {categories.length === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No categories available. Please create categories first.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 2: Configure Details */}
            {currentStep === 'configure' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Configure System Prompt</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize the details for your system prompt
                  </p>
                </div>

                {selectedCategory && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center gap-2">
                        <span>Category:</span>
                        <Badge variant="outline">{selectedCategory.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          ({selectedCategory.placement_type})
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="label">Label *</Label>
                    <Input
                      id="label"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="Display name for this prompt"
                    />
                  </div>

                  <div>
                    <Label htmlFor="prompt-id">Prompt ID *</Label>
                    <Input
                      id="prompt-id"
                      value={systemPromptId}
                      onChange={(e) => setSystemPromptId(e.target.value)}
                      placeholder="unique-identifier"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-generated from label. Must be unique.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What does this system prompt do?"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <div className="flex gap-2">
                      <Select value={iconName} onValueChange={setIconName}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sparkles">Sparkles</SelectItem>
                          <SelectItem value="Wand2">Wand</SelectItem>
                          <SelectItem value="Code2">Code</SelectItem>
                          <SelectItem value="FileText">FileText</SelectItem>
                          <SelectItem value="Pencil">Pencil</SelectItem>
                          <SelectItem value="Zap">Zap</SelectItem>
                          <SelectItem value="MessageSquare">MessageSquare</SelectItem>
                          <SelectItem value="Lightbulb">Lightbulb</SelectItem>
                          <SelectItem value="Bug">Bug</SelectItem>
                          <SelectItem value="CheckCircle2">CheckCircle</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center justify-center w-10 h-10 border rounded">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {promptVariables.length > 0 && (
                    <div>
                      <Label>Detected Variables</Label>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {promptVariables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {'{{'}{variable}{'}}'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 'category' ? onClose : handleBack}
                disabled={isSubmitting}
              >
                {currentStep === 'category' ? (
                  'Cancel'
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </>
                )}
              </Button>

              {currentStep === 'category' ? (
                <Button onClick={handleNext} disabled={!selectedCategoryId}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting || !systemPromptId || !label}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Create System Prompt
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Draft Mode Notice */}
            {currentStep === 'configure' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  The system prompt will be created in <strong>DRAFT</strong> mode and <strong>INACTIVE</strong>. 
                  You can activate it later from the System Prompts Manager.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
