/**
 * ConvertToBuiltinModal
 * 
 * Step-based flow for converting/updating a prompt builtin and managing shortcuts.
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Plus,
  Link as LinkIcon,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast-service';
import { 
  getBuiltinsBySourcePromptId, 
  fetchShortcutCategories,
  fetchShortcutsWithRelations,
  createPromptShortcut,
  updatePromptShortcut,
  getPromptBuiltinById,
} from '@/features/prompt-builtins/services/admin-service';
import { 
  PromptBuiltin, 
  ShortcutCategory, 
  PromptShortcut,
  CreatePromptShortcutInput,
  ScopeMapping,
} from '@/features/prompt-builtins/types/core';
import type { PromptVariable } from '@/features/prompts/types/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getPlacementTypeMeta } from '@/features/prompt-builtins/constants';
import { ShortcutFormFields } from '@/features/prompt-builtins/components/ShortcutFormFields';
import { ScopeMappingEditor } from '@/features/prompt-builtins/components/ScopeMappingEditor';

interface ConvertToBuiltinModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  promptName: string;
  onSuccess?: () => void;
}

type FlowStep = 
  | 'checking'                    // Checking for existing builtins
  | 'builtin-choice'              // Choose: create new or update existing
  | 'variable-comparison'         // Show variable changes (if updating)
  | 'processing-builtin'          // Creating/updating the builtin
  | 'shortcut-choice'             // Choose: create new, link existing, or skip
  | 'shortcut-form'               // Create/edit shortcut
  | 'processing-shortcut'         // Saving shortcut
  | 'complete';                   // Done!

interface ShortcutWithRelations extends PromptShortcut {
  category: ShortcutCategory | null;
  builtin: PromptBuiltin | null;
}

const DEFAULT_AVAILABLE_SCOPES = ['selection', 'content', 'context'];

// Helper to compare variables
function compareVariables(
  oldVars: PromptVariable[] | undefined, 
  newVars: PromptVariable[] | undefined
): { added: PromptVariable[]; removed: PromptVariable[]; changed: Array<{ old: PromptVariable; new: PromptVariable }> } {
  const oldMap = new Map((oldVars || []).map(v => [v.name, v]));
  const newMap = new Map((newVars || []).map(v => [v.name, v]));

  const added: PromptVariable[] = [];
  const removed: PromptVariable[] = [];
  const changed: Array<{ old: PromptVariable; new: PromptVariable }> = [];

  // Find added and changed
  for (const [name, newVar] of newMap) {
    const oldVar = oldMap.get(name);
    if (!oldVar) {
      added.push(newVar);
    } else if (JSON.stringify(oldVar) !== JSON.stringify(newVar)) {
      changed.push({ old: oldVar, new: newVar });
    }
  }

  // Find removed
  for (const [name, oldVar] of oldMap) {
    if (!newMap.has(name)) {
      removed.push(oldVar);
    }
  }

  return { added, removed, changed };
}

export function ConvertToBuiltinModal({
  isOpen,
  onClose,
  promptId,
  promptName,
  onSuccess,
}: ConvertToBuiltinModalProps) {
  const router = useRouter();
  
  // Flow state
  const [step, setStep] = useState<FlowStep>('checking');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Step 1: Builtin management
  const [existingBuiltins, setExistingBuiltins] = useState<PromptBuiltin[]>([]);
  const [selectedBuiltin, setSelectedBuiltin] = useState<PromptBuiltin | null>(null);
  const [builtinAction, setBuiltinAction] = useState<'update' | 'create-new'>('update');
  const [createdBuiltin, setCreatedBuiltin] = useState<PromptBuiltin | null>(null);
  const [variableComparison, setVariableComparison] = useState<ReturnType<typeof compareVariables> | null>(null);
  const [promptVariables, setPromptVariables] = useState<PromptVariable[]>([]);
  
  // Step 2: Shortcut management
  const [shortcuts, setShortcuts] = useState<ShortcutWithRelations[]>([]);
  const [categories, setCategories] = useState<ShortcutCategory[]>([]);
  const [shortcutAction, setShortcutAction] = useState<'create' | 'link' | 'skip'>('create');
  const [selectedShortcut, setSelectedShortcut] = useState<PromptShortcut | null>(null);
  const [loadingShortcuts, setLoadingShortcuts] = useState(false);
  
  // New shortcut form data
  const [newShortcutData, setNewShortcutData] = useState<Partial<CreatePromptShortcutInput>>({
    label: promptName,
    description: '',
    icon_name: 'Sparkles',
    category_id: '',
    scope_mappings: null,
    is_active: true,
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('checking');
      setError('');
      setCreatedBuiltin(null);
      setSelectedBuiltin(null);
      setVariableComparison(null);
      checkForExistingBuiltins();
    } else {
      // Reset all state
      setExistingBuiltins([]);
      setSelectedBuiltin(null);
      setBuiltinAction('update');
      setCreatedBuiltin(null);
      setShortcuts([]);
      setCategories([]);
      setShortcutAction('create');
      setSelectedShortcut(null);
      setNewShortcutData({
        label: promptName,
        description: '',
        icon_name: 'Sparkles',
        category_id: '',
        scope_mappings: null,
        is_active: true,
      });
    }
  }, [isOpen, promptId, promptName]);

  // Fetch prompt data to get variables
  const fetchPromptData = async () => {
    try {
      const response = await fetch(`/api/prompts/${promptId}`);
      if (!response.ok) throw new Error('Failed to fetch prompt data');
      
      const data = await response.json();
      const variables = data.variable_defaults || [];
      console.log('📊 Fetched prompt variables:', variables);
      setPromptVariables(variables);
    } catch (err: any) {
      console.error('Error fetching prompt data:', err);
      setPromptVariables([]);
    }
  };

  // Check for existing builtins
  const checkForExistingBuiltins = async () => {
    try {
      // Fetch prompt variables first
      await fetchPromptData();
      
      const builtins = await getBuiltinsBySourcePromptId(promptId);
      setExistingBuiltins(builtins);
      
      if (builtins.length > 0) {
        setSelectedBuiltin(builtins[0]);
        setBuiltinAction('update');
        setStep('builtin-choice');
      } else {
        setBuiltinAction('create-new');
        // Skip straight to processing if no existing builtins
        handleBuiltinAction();
      }
    } catch (err: any) {
      console.error('Error checking for existing builtins:', err);
      setError(err.message || 'Failed to check for existing builtins');
      setBuiltinAction('create-new');
      setStep('builtin-choice');
    }
  };

  // Handle builtin creation/update
  const handleBuiltinAction = async () => {
    if (builtinAction === 'update' && !selectedBuiltin) return;

    // If updating, check variables first
    if (builtinAction === 'update' && selectedBuiltin && step === 'builtin-choice') {
      const currentVars = (selectedBuiltin.variableDefaults as PromptVariable[] | undefined) || [];
      console.log('🔍 Comparing variables:');
      console.log('  Current builtin variables:', currentVars);
      console.log('  Updated prompt variables:', promptVariables);
      
      const comparison = compareVariables(currentVars, promptVariables);
      console.log('  Comparison result:', comparison);
      
      if (comparison.added.length > 0 || comparison.removed.length > 0 || comparison.changed.length > 0) {
        setVariableComparison(comparison);
        setStep('variable-comparison');
        return;
      }
    }

    setIsProcessing(true);
    setError('');
    setStep('processing-builtin');

    try {
      const response = await fetch(`/api/admin/prompt-builtins/convert-from-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: promptId,
          builtin_id: builtinAction === 'update' ? selectedBuiltin?.id : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Operation failed (${response.status})`);
      }

      const data = await response.json();
      
      // Fetch the full builtin data
      const builtin = await getPromptBuiltinById(data.builtin_id);
      if (!builtin) throw new Error('Failed to fetch builtin data');
      
      setCreatedBuiltin(builtin);
      
      toast.success(data.is_update ? 'Builtin updated successfully!' : 'Builtin created successfully!');
      
      // Load shortcuts for next step
      await loadShortcutsAndCategories(data.builtin_id);
      setStep('shortcut-choice');
      
    } catch (err: any) {
      console.error('Builtin operation error:', err);
      setError(err.message || 'An unexpected error occurred');
      setStep('builtin-choice');
    } finally {
      setIsProcessing(false);
    }
  };

  // Load shortcuts and categories
  const loadShortcutsAndCategories = async (builtinId: string) => {
    setLoadingShortcuts(true);
    try {
      const [categoriesData, shortcutsData] = await Promise.all([
        fetchShortcutCategories({ is_active: true }),
        fetchShortcutsWithRelations({ is_active: true }),
      ]);

      setCategories(categoriesData);
      
      // Store ALL shortcuts so user can link to any of them
      setShortcuts(shortcutsData);
      
      // Find shortcuts linked to this builtin
      const linkedShortcuts = shortcutsData.filter(s => s.prompt_builtin_id === builtinId);
      
      console.log('📋 Loaded shortcuts:', {
        total: shortcutsData.length,
        linkedToThisBuiltin: linkedShortcuts.length,
        unlinked: shortcutsData.filter(s => !s.prompt_builtin_id).length,
        linkedToOther: shortcutsData.filter(s => s.prompt_builtin_id && s.prompt_builtin_id !== builtinId).length,
      });
      
      // If there are linked shortcuts, default to updating them
      if (linkedShortcuts.length > 0) {
        setSelectedShortcut(linkedShortcuts[0]);
        setShortcutAction('link');
      } else if (shortcutsData.length > 0) {
        // If there are any shortcuts at all, default to link option
        setShortcutAction('link');
      } else {
        setShortcutAction('create');
      }
    } catch (err: any) {
      console.error('Error loading shortcuts:', err);
      setError(err.message || 'Failed to load shortcuts');
    } finally {
      setLoadingShortcuts(false);
    }
  };

  // Handle shortcut creation/linking
  const handleShortcutAction = async () => {
    if (!createdBuiltin) return;

    if (shortcutAction === 'skip') {
      setStep('complete');
      return;
    }

    setIsProcessing(true);
    setError('');
    setStep('processing-shortcut');

    try {
      if (shortcutAction === 'create') {
        // Create new shortcut
        const shortcutInput: CreatePromptShortcutInput = {
          label: newShortcutData.label || promptName,
          description: newShortcutData.description || '',
          icon_name: newShortcutData.icon_name || 'Sparkles',
          category_id: newShortcutData.category_id || '',
          prompt_builtin_id: createdBuiltin.id,
          scope_mappings: newShortcutData.scope_mappings,
          is_active: newShortcutData.is_active,
        };

        await createPromptShortcut(shortcutInput);
        toast.success('Shortcut created successfully!');
      } else if (shortcutAction === 'link' && selectedShortcut) {
        // Link existing shortcut
        await updatePromptShortcut({
          id: selectedShortcut.id,
          prompt_builtin_id: createdBuiltin.id,
        });
        toast.success('Shortcut linked successfully!');
      }

      setStep('complete');
    } catch (err: any) {
      console.error('Shortcut operation error:', err);
      setError(err.message || 'An unexpected error occurred');
      setStep('shortcut-choice');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = () => {
    onSuccess?.();
    onClose();
  };

  const handleResetAndClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  // Render content based on step
  const renderContent = () => {
    switch (step) {
      case 'checking':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Checking for existing builtins...</p>
          </div>
        );

      case 'builtin-choice':
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Step 1: Builtin Management</h3>
            </div>

            {existingBuiltins.length > 0 && (
              <>
                <RadioGroup value={builtinAction} onValueChange={(v) => setBuiltinAction(v as 'update' | 'create-new')}>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                      <RadioGroupItem value="update" id="update" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="update" className="font-medium cursor-pointer">Update Existing Builtin</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Overwrite the existing builtin with the current prompt data.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                      <RadioGroupItem value="create-new" id="create-new" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="create-new" className="font-medium cursor-pointer">Create New Builtin</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Create a separate builtin, keeping the existing one.
                        </p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>

                {builtinAction === 'update' && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <Label className="text-sm font-medium">Select Builtin to Update</Label>
                    <Select 
                      value={selectedBuiltin?.id} 
                      onValueChange={(id) => setSelectedBuiltin(existingBuiltins.find(b => b.id === id) || null)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {existingBuiltins.map(builtin => (
                          <SelectItem key={builtin.id} value={builtin.id}>
                            {builtin.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'variable-comparison':
        const currentVars = (selectedBuiltin?.variableDefaults as PromptVariable[] | undefined) || [];
        const updatedVars = promptVariables || [];
        
        return (
          <div className="space-y-4">
            <Alert variant="default" className="border-warning bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-foreground">
                <strong>Variable Changes Detected</strong>
                <p className="mt-1">
                  The prompt&apos;s variables have changed. <strong>Review carefully before updating</strong> as this may affect existing shortcuts.
                </p>
              </AlertDescription>
            </Alert>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Current Variables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Current Variables</h4>
                  <Badge variant="secondary" className="text-xs">
                    {currentVars.length} variable{currentVars.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg p-3 bg-muted/30">
                  {currentVars.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No variables in current builtin
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentVars.map((v) => {
                        const isRemoved = variableComparison?.removed.some(rv => rv.name === v.name);
                        const isChanged = variableComparison?.changed.some(cv => cv.old.name === v.name);
                        
                        return (
                          <div 
                            key={v.name} 
                            className={`p-2 rounded border text-sm ${
                              isRemoved 
                                ? 'bg-destructive/10 border-destructive/30' 
                                : isChanged 
                                  ? 'bg-warning/10 border-warning/30'
                                  : 'bg-background border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <code className="font-mono font-semibold">{v.name}</code>
                              {isRemoved && (
                                <Badge variant="destructive" className="text-xs">REMOVED</Badge>
                              )}
                              {isChanged && (
                                <Badge variant="outline" className="text-xs bg-warning/20 border-warning">CHANGED</Badge>
                              )}
                            </div>
                            {v.defaultValue && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Default: <span className="font-mono">{v.defaultValue}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Updated Variables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Updated Variables</h4>
                  <Badge variant="secondary" className="text-xs">
                    {updatedVars.length} variable{updatedVars.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg p-3 bg-muted/30">
                  {updatedVars.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No variables in updated prompt
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {updatedVars.map((v) => {
                        const isAdded = variableComparison?.added.some(av => av.name === v.name);
                        const isChanged = variableComparison?.changed.some(cv => cv.new.name === v.name);
                        
                        return (
                          <div 
                            key={v.name} 
                            className={`p-2 rounded border text-sm ${
                              isAdded 
                                ? 'bg-success/10 border-success/30' 
                                : isChanged 
                                  ? 'bg-warning/10 border-warning/30'
                                  : 'bg-background border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <code className="font-mono font-semibold">{v.name}</code>
                              {isAdded && (
                                <Badge variant="outline" className="text-xs bg-success/20 border-success">NEW</Badge>
                              )}
                              {isChanged && (
                                <Badge variant="outline" className="text-xs bg-warning/20 border-warning">CHANGED</Badge>
                              )}
                            </div>
                            {v.defaultValue && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Default: <span className="font-mono">{v.defaultValue}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            {/* Summary of changes */}
            {variableComparison && (variableComparison.added.length > 0 || variableComparison.removed.length > 0 || variableComparison.changed.length > 0) && (
              <div className="p-3 bg-muted rounded-lg border">
                <h4 className="font-semibold text-sm mb-2">Change Summary</h4>
                <div className="flex flex-wrap gap-3 text-sm">
                  {variableComparison.added.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span><strong>{variableComparison.added.length}</strong> added</span>
                    </div>
                  )}
                  {variableComparison.removed.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-destructive" />
                      <span><strong>{variableComparison.removed.length}</strong> removed</span>
                    </div>
                  )}
                  {variableComparison.changed.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-warning" />
                      <span><strong>{variableComparison.changed.length}</strong> modified</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'processing-builtin':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              {builtinAction === 'update' ? 'Updating builtin...' : 'Creating builtin...'}
            </p>
          </div>
        );

      case 'shortcut-choice':
        const linkedShortcuts = shortcuts.filter(s => s.prompt_builtin_id === createdBuiltin?.id);
        const unlinkedShortcuts = shortcuts.filter(s => !s.prompt_builtin_id);
        const otherLinkedShortcuts = shortcuts.filter(s => s.prompt_builtin_id && s.prompt_builtin_id !== createdBuiltin?.id);
        const hasAnyShortcuts = shortcuts.length > 0;

        return (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Step 2: Shortcut Management</h3>
            </div>

            <RadioGroup value={shortcutAction} onValueChange={(v) => setShortcutAction(v as 'create' | 'link' | 'skip')}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                  <RadioGroupItem value="create" id="create" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="create" className="font-medium cursor-pointer">Create New Shortcut</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create a fresh shortcut that links to this builtin.
                    </p>
                  </div>
                </div>

                {hasAnyShortcuts && (
                  <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                    <RadioGroupItem value="link" id="link" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="link" className="font-medium cursor-pointer">Link Existing Shortcut</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {linkedShortcuts.length > 0 
                          ? `Update a shortcut already linked to this builtin (${linkedShortcuts.length} available).`
                          : unlinkedShortcuts.length > 0
                            ? `Connect an unlinked shortcut to this builtin (${unlinkedShortcuts.length} available).`
                            : `Reassign a shortcut from another builtin (${otherLinkedShortcuts.length} available).`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                  <RadioGroupItem value="skip" id="skip" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="skip" className="font-medium cursor-pointer">Skip for Now</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Don't create or link a shortcut at this time.
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>

            {shortcutAction === 'link' && hasAnyShortcuts && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                <Label className="text-sm font-medium">Select Shortcut</Label>
                
                {loadingShortcuts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {/* Already linked to THIS builtin */}
                      {linkedShortcuts.length > 0 && (
                        <>
                          <div className="text-xs font-semibold text-success uppercase tracking-wide mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-success" />
                            Already Linked to This Builtin
                          </div>
                          {linkedShortcuts.map(shortcut => (
                            <div
                              key={shortcut.id}
                              onClick={() => setSelectedShortcut(shortcut)}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedShortcut?.id === shortcut.id
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-primary/50 hover:bg-accent/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-medium">{shortcut.label}</div>
                                <Badge variant="outline" className="text-xs bg-success/10 border-success">
                                  Current
                                </Badge>
                              </div>
                              {shortcut.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                  {shortcut.description}
                                </div>
                              )}
                              {shortcut.category && (
                                <Badge variant="secondary" className="mt-2 text-xs">
                                  {shortcut.category.label}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {/* Unlinked shortcuts */}
                      {unlinkedShortcuts.length > 0 && (
                        <>
                          {linkedShortcuts.length > 0 && <Separator className="my-3" />}
                          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            Available (No Builtin)
                          </div>
                          {unlinkedShortcuts.map(shortcut => (
                            <div
                              key={shortcut.id}
                              onClick={() => setSelectedShortcut(shortcut)}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedShortcut?.id === shortcut.id
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-primary/50 hover:bg-accent/50'
                              }`}
                            >
                              <div className="font-medium">{shortcut.label}</div>
                              {shortcut.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                  {shortcut.description}
                                </div>
                              )}
                              {shortcut.category && (
                                <Badge variant="secondary" className="mt-2 text-xs">
                                  {shortcut.category.label}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {/* Linked to OTHER builtins */}
                      {otherLinkedShortcuts.length > 0 && (
                        <>
                          {(linkedShortcuts.length > 0 || unlinkedShortcuts.length > 0) && <Separator className="my-3" />}
                          <div className="text-xs font-semibold text-warning uppercase tracking-wide mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-warning" />
                            Linked to Other Builtins
                          </div>
                          {otherLinkedShortcuts.map(shortcut => (
                            <div
                              key={shortcut.id}
                              onClick={() => setSelectedShortcut(shortcut)}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedShortcut?.id === shortcut.id
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-primary/50 hover:bg-accent/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-medium">{shortcut.label}</div>
                                <Badge variant="outline" className="text-xs bg-warning/10 border-warning">
                                  Will Reassign
                                </Badge>
                              </div>
                              {shortcut.description && (
                                <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                  {shortcut.description}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {shortcut.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {shortcut.category.label}
                                  </Badge>
                                )}
                                {shortcut.builtin && (
                                  <Badge variant="outline" className="text-xs">
                                    Currently: {shortcut.builtin.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'shortcut-form':
        return (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Step 2: Create Shortcut</h3>
            </div>

            {createdBuiltin && (
              <ShortcutFormFields
                formData={newShortcutData as CreatePromptShortcutInput}
                onChange={(updates) => setNewShortcutData(prev => ({ ...prev, ...updates }))}
                categories={categories}
                builtinVariables={createdBuiltin.variableDefaults || []}
                compact
                excludedPlacementTypes={['user', 'organization', 'quick-actions', 'content-blocks']}
              />
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'processing-shortcut':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              {shortcutAction === 'create' ? 'Creating shortcut...' : 'Linking shortcut...'}
            </p>
          </div>
        );

      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-success/10 rounded-full p-4 mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-2">All Done!</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {builtinAction === 'update' ? 'Builtin updated' : 'Builtin created'}
              {shortcutAction !== 'skip' && (shortcutAction === 'create' ? ' and shortcut created' : ' and shortcut linked')} successfully!
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // Render action buttons
  const renderActions = () => {
    switch (step) {
      case 'checking':
        return null;

      case 'builtin-choice':
        return (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleResetAndClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleBuiltinAction()} 
              disabled={isProcessing || (builtinAction === 'update' && !selectedBuiltin)}
            >
              {builtinAction === 'update' ? 'Update Builtin' : 'Create Builtin'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 'variable-comparison':
        return (
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('builtin-choice')} disabled={isProcessing}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetAndClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={() => handleBuiltinAction()} disabled={isProcessing}>
                Confirm Update
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'processing-builtin':
        return null;

      case 'shortcut-choice':
        return (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleResetAndClose} disabled={isProcessing}>
              Cancel
            </Button>
            {shortcutAction === 'create' ? (
              <Button 
                onClick={() => setStep('shortcut-form')} 
                disabled={isProcessing}
              >
                Configure Shortcut
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={() => handleShortcutAction()} 
                disabled={isProcessing || (shortcutAction === 'link' && !selectedShortcut)}
              >
                {shortcutAction === 'skip' ? 'Finish' : 'Link Shortcut'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        );

      case 'shortcut-form':
        return (
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('shortcut-choice')} disabled={isProcessing}>
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetAndClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleShortcutAction()} 
                disabled={isProcessing || !newShortcutData.category_id}
              >
                Create Shortcut
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'processing-shortcut':
        return null;

      case 'complete':
        return (
          <div className="flex justify-end gap-2">
            <Button onClick={handleComplete}>
              Close
            </Button>
            {createdBuiltin && (
              <Button 
                variant="outline"
                onClick={() => router.push('/administration/prompt-builtins')}
              >
                View Builtins
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Get step description
  const getStepDescription = () => {
    switch (step) {
      case 'checking':
        return 'Checking for existing builtins...';
      case 'builtin-choice':
        return 'Choose how to save the builtin';
      case 'variable-comparison':
        return 'Review variable changes';
      case 'processing-builtin':
        return builtinAction === 'update' ? 'Updating builtin...' : 'Creating builtin...';
      case 'shortcut-choice':
        return 'Choose shortcut action';
      case 'shortcut-form':
        return 'Configure shortcut details';
      case 'processing-shortcut':
        return shortcutAction === 'create' ? 'Creating shortcut...' : 'Linking shortcut...';
      case 'complete':
        return 'Successfully completed!';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleResetAndClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col p-0"
        onPointerDownOutside={(e) => isProcessing && e.preventDefault()}
      >
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle>Convert to Builtin</DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {renderContent()}
        </div>

        <div className="px-4 pb-4 pt-3 border-t">
          {renderActions()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
