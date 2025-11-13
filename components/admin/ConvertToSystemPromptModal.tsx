/**
 * ConvertToSystemPromptModal
 * 
 * 3-Step Wizard for converting a regular prompt to a system prompt:
 * 1. Select Functionality (e.g., "Content Expander Card")
 * 2. Configure Placement (type, category, settings)
 * 3. Confirm and Create
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
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { SYSTEM_FUNCTIONALITIES, validatePromptForFunctionality } from '@/types/system-prompt-functionalities';
import type { PromptSnapshot } from '@/types/system-prompts-db';
import { cn } from '@/utils';

interface ConvertToSystemPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  promptName: string;
  promptDescription?: string;
  promptVariables: string[];
  onSuccess?: () => void;
}

type WizardStep = 'functionality' | 'placement' | 'confirm';

interface FunctionalityValidation {
  valid: boolean;
  missing: string[];
  extra: string[];
}

export function ConvertToSystemPromptModal({
  isOpen,
  onClose,
  promptId,
  promptName,
  promptDescription,
  promptVariables,
  onSuccess,
}: ConvertToSystemPromptModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('functionality');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Functionality
  const [selectedFunctionalityId, setSelectedFunctionalityId] = useState<string>('');
  const [functionalityValidation, setFunctionalityValidation] = useState<FunctionalityValidation | null>(null);

  // Step 2: Placement
  const [systemPromptId, setSystemPromptId] = useState('');
  const [name, setName] = useState(promptName);
  const [description, setDescription] = useState(promptDescription || '');
  const [placementType, setPlacementType] = useState<'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action'>('card');
  const [category, setCategory] = useState('general');
  const [subcategory, setSubcategory] = useState('');
  const [requiresSelection, setRequiresSelection] = useState(false);
  const [allowChat, setAllowChat] = useState(true);
  const [allowInitialMessage, setAllowInitialMessage] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('functionality');
      setSelectedFunctionalityId('');
      setFunctionalityValidation(null);
      setName(promptName);
      setDescription(promptDescription || '');
      setSystemPromptId('');
      setPlacementType('card');
      setCategory('general');
      setSubcategory('');
      setRequiresSelection(false);
      setAllowChat(true);
      setAllowInitialMessage(false);
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, promptName, promptDescription]);

  // Generate system_prompt_id when name changes
  useEffect(() => {
    if (name) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSystemPromptId(generated);
    }
  }, [name]);

  // Calculate compatibility for all functionalities
  const functionalityCompatibility = useMemo(() => {
    const promptVars = new Set(promptVariables);
    const compatible: Array<{ id: string; functionality: any; validation: FunctionalityValidation }> = [];
    const incompatible: Array<{ id: string; functionality: any; validation: FunctionalityValidation }> = [];

    Object.values(SYSTEM_FUNCTIONALITIES).forEach((func) => {
      const required = new Set(func.requiredVariables);
      const optional = new Set(func.optionalVariables || []);

      const missing = Array.from(required).filter((v) => !promptVars.has(v));
      const extra = Array.from(promptVars).filter(
        (v) => !required.has(v) && !optional.has(v)
      );

      const validation: FunctionalityValidation = {
        valid: missing.length === 0,
        missing,
        extra,
      };

      const item = { id: func.id, functionality: func, validation };

      if (validation.valid) {
        compatible.push(item);
      } else {
        incompatible.push(item);
      }
    });

    return { compatible, incompatible };
  }, [promptVariables]);

  // Validate functionality when selected
  useEffect(() => {
    if (selectedFunctionalityId) {
      const functionality = SYSTEM_FUNCTIONALITIES[selectedFunctionalityId];
      if (functionality) {
        // Find validation from compatibility check
        const compatibleItem = functionalityCompatibility.compatible.find(
          (item) => item.id === selectedFunctionalityId
        );
        const incompatibleItem = functionalityCompatibility.incompatible.find(
          (item) => item.id === selectedFunctionalityId
        );

        const validationItem = compatibleItem || incompatibleItem;
        if (validationItem) {
          setFunctionalityValidation(validationItem.validation);
        }

        // Auto-set placement type if only one option
        if (functionality.placementTypes.length === 1) {
          setPlacementType(functionality.placementTypes[0] as any);
        }
      }
    }
  }, [selectedFunctionalityId, functionalityCompatibility]);

  const handleNext = () => {
    if (currentStep === 'functionality') {
      if (!selectedFunctionalityId) {
        setError('Please select a functionality');
        return;
      }
      if (functionalityValidation && !functionalityValidation.valid) {
        setError(`Your prompt is missing required variables: ${functionalityValidation.missing.join(', ')}`);
        return;
      }
      setError('');
      setCurrentStep('placement');
    } else if (currentStep === 'placement') {
      if (!systemPromptId.trim()) {
        setError('System Prompt ID is required');
        return;
      }
      if (!name.trim()) {
        setError('Name is required');
        return;
      }
      setError('');
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep === 'confirm') {
      setCurrentStep('placement');
    } else if (currentStep === 'placement') {
      setCurrentStep('functionality');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      console.log('Submitting system prompt conversion:', {
        system_prompt_id: systemPromptId,
        functionality_id: selectedFunctionalityId,
        placement_type: placementType,
        category,
      });

      const response = await fetch(`/api/prompts/${promptId}/convert-to-system-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt_id: systemPromptId,
          name: name || promptName,
          description: description || promptDescription,
          functionality_id: selectedFunctionalityId,
          placement_type: placementType,
          category,
          subcategory: subcategory || undefined,
          placement_settings: {
            requiresSelection,
            allowChat,
            allowInitialMessage,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Conversion failed:', errorData);
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}` 
          : errorData.error || `Failed to convert (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('System prompt created successfully:', data);

      // Success
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedFunctionality = selectedFunctionalityId
    ? SYSTEM_FUNCTIONALITIES[selectedFunctionalityId]
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Convert to System Prompt</DialogTitle>
            <DialogDescription>
              Step {currentStep === 'functionality' ? '1' : currentStep === 'placement' ? '2' : '3'} of 3
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Functionality */}
          {currentStep === 'functionality' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Select Functionality</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the functionality this prompt will power. The variables in your prompt must 
                  match the functionality's requirements.
                </p>
              </div>

              {/* Prompt Info */}
              <Card className="p-4 bg-muted/50">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Prompt:</span>
                    <span className="text-sm ml-2">{promptName}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Variables:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {promptVariables.length > 0 ? (
                        promptVariables.map((v) => (
                          <Badge key={v} variant="outline" className="text-xs">
                            {v}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Functionality Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Functionality</Label>
                  <Badge variant="outline" className="text-xs">
                    {functionalityCompatibility.compatible.length} compatible
                  </Badge>
                </div>

                {/* Compatible Functionalities */}
                {functionalityCompatibility.compatible.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      ✅ These functionalities match your prompt's variables
                    </p>
                    {functionalityCompatibility.compatible.map((item) => (
                      <Card
                        key={item.id}
                        className={cn(
                          'p-3 cursor-pointer transition-all',
                          selectedFunctionalityId === item.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        )}
                        onClick={() => setSelectedFunctionalityId(item.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{item.functionality.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.functionality.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.functionality.requiredVariables.map((v) => (
                                <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {v}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-semibold">No compatible functionalities found</p>
                      <p className="text-sm mt-1">
                        Your prompt's variables don't match any existing functionality requirements.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Incompatible Functionalities (Collapsible) */}
                {functionalityCompatibility.incompatible.length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <span>Show incompatible functionalities ({functionalityCompatibility.incompatible.length})</span>
                    </summary>
                    <div className="space-y-2 mt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        ❌ These functionalities require variables your prompt doesn't have
                      </p>
                      {functionalityCompatibility.incompatible.map((item) => (
                        <Card
                          key={item.id}
                          className="p-3 opacity-60 border-dashed"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm">{item.functionality.name}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.functionality.description}
                              </p>
                              
                              {/* Missing Variables */}
                              {item.validation.missing.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-red-600">Missing variables:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.validation.missing.map((v) => (
                                      <Badge key={v} variant="destructive" className="text-[10px] px-1.5 py-0">
                                        {v}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Required Variables */}
                              <div className="mt-2">
                                <p className="text-xs font-medium">Requires:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.functionality.requiredVariables.map((v) => (
                                    <Badge key={v} variant="outline" className="text-[10px] px-1.5 py-0">
                                      {v}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              {/* Functionality Details & Validation */}
              {selectedFunctionality && (
                <Card className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold">{selectedFunctionality.name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedFunctionality.description}</p>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Required Variables:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedFunctionality.requiredVariables.map((v) => (
                          <Badge
                            key={v}
                            variant={functionalityValidation?.missing.includes(v) ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {selectedFunctionality.optionalVariables && selectedFunctionality.optionalVariables.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Optional Variables:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedFunctionality.optionalVariables.map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-sm font-medium">Placement Types:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedFunctionality.placementTypes.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Validation Status */}
                    {functionalityValidation && (
                      <Alert variant={functionalityValidation.valid ? 'default' : 'destructive'}>
                        {functionalityValidation.valid ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription>
                              ✅ Your prompt variables match this functionality!
                            </AlertDescription>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                <p className="font-semibold">Variable mismatch:</p>
                                {functionalityValidation.missing.length > 0 && (
                                  <p className="text-sm">
                                    Missing Required: <code>{functionalityValidation.missing.join(', ')}</code>
                                  </p>
                                )}
                                {functionalityValidation.extra.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Additional variables (OK if they have defaults): <code>{functionalityValidation.extra.join(', ')}</code>
                                  </p>
                                )}
                              </div>
                            </AlertDescription>
                          </>
                        )}
                      </Alert>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Step 2: Placement */}
          {currentStep === 'placement' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Configure Placement</h3>
                <p className="text-sm text-muted-foreground">
                  Define where and how this system prompt will appear in the application.
                </p>
              </div>

              {/* System Prompt ID */}
              <div className="space-y-2">
                <Label htmlFor="system-prompt-id">System Prompt ID*</Label>
                <Input
                  id="system-prompt-id"
                  value={systemPromptId}
                  onChange={(e) => setSystemPromptId(e.target.value)}
                  placeholder="e.g., content-expander-educational"
                />
                <p className="text-xs text-muted-foreground">
                  A unique identifier. Use kebab-case (lowercase with dashes).
                </p>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Display Name*</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Content Expander"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what this system prompt does..."
                  rows={3}
                />
              </div>

              {/* Placement Type */}
              <div className="space-y-2">
                <Label htmlFor="placement-type">Placement Type*</Label>
                <Select
                  value={placementType}
                  onValueChange={(value: any) => setPlacementType(value)}
                >
                  <SelectTrigger id="placement-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFunctionality?.placementTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category*</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="text-tools">Text Tools</SelectItem>
                    <SelectItem value="code-helpers">Code Helpers</SelectItem>
                    <SelectItem value="content-generation">Content Generation</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                    <SelectItem value="translation">Translation</SelectItem>
                    <SelectItem value="formatting">Formatting</SelectItem>
                    <SelectItem value="custom">Custom/Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used to organize and filter system prompts in the admin interface
                </p>
              </div>

              {/* Subcategory */}
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory (Optional)</Label>
                <Input
                  id="subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g., vocabulary, grammar"
                />
              </div>

              {/* Placement Settings */}
              <Card className="p-4">
                <h4 className="font-medium mb-3">Placement Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requires-selection"
                      checked={requiresSelection}
                      onCheckedChange={(checked) => setRequiresSelection(checked as boolean)}
                    />
                    <Label
                      htmlFor="requires-selection"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Requires Text Selection (for context menus)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow-chat"
                      checked={allowChat}
                      onCheckedChange={(checked) => setAllowChat(checked as boolean)}
                    />
                    <Label
                      htmlFor="allow-chat"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Allow Chat Mode (conversational responses)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow-initial-message"
                      checked={allowInitialMessage}
                      onCheckedChange={(checked) => setAllowInitialMessage(checked as boolean)}
                    />
                    <Label
                      htmlFor="allow-initial-message"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Allow Initial User Message (prompt user before executing)
                    </Label>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Step 3: Confirm */}
          {currentStep === 'confirm' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Confirm & Create</h3>
                <p className="text-sm text-muted-foreground">
                  Review your configuration before creating the system prompt.
                </p>
              </div>

              <Card className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="font-medium">System Prompt ID:</span>
                    <span className="text-muted-foreground">{systemPromptId}</span>

                    <span className="font-medium">Name:</span>
                    <span className="text-muted-foreground">{name}</span>

                    <span className="font-medium">Functionality:</span>
                    <span className="text-muted-foreground">{selectedFunctionality?.name}</span>

                    <span className="font-medium">Placement Type:</span>
                    <span className="text-muted-foreground capitalize">{placementType.replace('-', ' ')}</span>

                    <span className="font-medium">Category:</span>
                    <span className="text-muted-foreground">{category}</span>

                    {subcategory && (
                      <>
                        <span className="font-medium">Subcategory:</span>
                        <span className="text-muted-foreground">{subcategory}</span>
                      </>
                    )}
                  </div>

                  {description && (
                    <div>
                      <span className="font-medium block mb-1">Description:</span>
                      <p className="text-muted-foreground">{description}</p>
                    </div>
                  )}

                  <div>
                    <span className="font-medium block mb-1">Settings:</span>
                    <div className="flex flex-wrap gap-2">
                      {requiresSelection && <Badge variant="secondary">Requires Selection</Badge>}
                      {allowChat && <Badge variant="secondary">Chat Mode</Badge>}
                      {allowInitialMessage && <Badge variant="secondary">Prompt User</Badge>}
                    </div>
                  </div>
                </div>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The system prompt will be created in <strong>DRAFT</strong> mode. 
                  You can activate it later from the System Prompts Manager.
                </AlertDescription>
              </Alert>
            </div>
          )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={currentStep === 'functionality' ? onClose : handleBack}
            disabled={isSubmitting}
          >
            {currentStep === 'functionality' ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </>
            )}
          </Button>

          {currentStep === 'confirm' ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create System Prompt'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 'functionality' && (!selectedFunctionalityId || (functionalityValidation && !functionalityValidation.valid))) ||
                (currentStep === 'placement' && (!systemPromptId.trim() || !name.trim()))
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
