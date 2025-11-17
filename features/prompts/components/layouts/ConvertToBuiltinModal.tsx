/**
 * ConvertToBuiltinModal
 * 
 * Enhanced modal for converting a user prompt to a prompt builtin with full shortcut management.
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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast-service';
import { 
  getBuiltinsBySourcePromptId, 
  fetchShortcutCategories,
  fetchShortcutsWithRelations,
  createPromptShortcut,
  updatePromptShortcut,
} from '@/features/prompt-builtins/services/admin-service';
import { 
  PromptBuiltin, 
  ShortcutCategory, 
  PromptShortcut,
  CreatePromptShortcutInput,
  ScopeMapping,
} from '@/features/prompt-builtins/types/core';
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
import { HierarchicalCategorySelector } from '@/features/prompt-builtins/components/HierarchicalCategorySelector';
import { ScopeMappingEditor } from '@/features/prompt-builtins/components/ScopeMappingEditor';

interface ConvertToBuiltinModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  promptName: string;
  onSuccess?: () => void;
}

type FlowStep = 'checking' | 'existing-detected' | 'converting' | 'shortcut-selection' | 'creating-shortcut' | 'complete';

interface ShortcutWithRelations extends PromptShortcut {
  category: ShortcutCategory | null;
  builtin: PromptBuiltin | null;
}

const DEFAULT_AVAILABLE_SCOPES = ['selection', 'content', 'context'];

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
  
  // Builtin state
  const [existingBuiltins, setExistingBuiltins] = useState<PromptBuiltin[]>([]);
  const [selectedBuiltin, setSelectedBuiltin] = useState<PromptBuiltin | null>(null);
  const [builtinAction, setBuiltinAction] = useState<'update' | 'create-new'>('update');
  const [createdBuiltinId, setCreatedBuiltinId] = useState<string | null>(null);
  const [createdBuiltin, setCreatedBuiltin] = useState<PromptBuiltin | null>(null);
  
  // Shortcut state
  const [categories, setCategories] = useState<ShortcutCategory[]>([]);
  const [shortcuts, setShortcuts] = useState<ShortcutWithRelations[]>([]);
  const [loadingShortcuts, setLoadingShortcuts] = useState(false);
  const [shortcutAction, setShortcutAction] = useState<'link-existing' | 'create-new' | 'skip'>('link-existing');
  const [selectedShortcutId, setSelectedShortcutId] = useState<string | null>(null);
  const [showOnlyUnlinked, setShowOnlyUnlinked] = useState(true);
  
  // Scope mapping for existing shortcut
  const [existingShortcutScopes, setExistingShortcutScopes] = useState<string[]>(DEFAULT_AVAILABLE_SCOPES);
  const [existingShortcutMappings, setExistingShortcutMappings] = useState<ScopeMapping>({});
  
  // Create shortcut form state
  const [newShortcutData, setNewShortcutData] = useState<CreatePromptShortcutInput>({
    label: '',
    category_id: '',
    description: null,
    icon_name: null,
    result_display: 'modal-full',
    auto_run: true,
    allow_chat: true,
    show_variables: false,
    apply_variables: true,
    available_scopes: DEFAULT_AVAILABLE_SCOPES,
    scope_mappings: {},
  });
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Check for existing builtins on mount
  useEffect(() => {
    if (isOpen && step === 'checking') {
      checkForExistingBuiltins();
    }
  }, [isOpen, step]);

  // Load builtin data when created
  useEffect(() => {
    if (createdBuiltinId && !createdBuiltin) {
      loadCreatedBuiltin();
    }
  }, [createdBuiltinId, createdBuiltin]);

  const loadCreatedBuiltin = async () => {
    if (!createdBuiltinId) return;
    
    try {
      const response = await fetch(`/api/admin/prompt-builtins/${createdBuiltinId}`);
      if (response.ok) {
        const data = await response.json();
        setCreatedBuiltin(data.builtin);
        
        // Pre-fill shortcut label with builtin name
        if (data.builtin?.name && !newShortcutData.label) {
          setNewShortcutData(prev => ({
            ...prev,
            label: data.builtin.name,
          }));
        }
      }
    } catch (err) {
      console.error('Error loading created builtin:', err);
    }
  };

  const checkForExistingBuiltins = async () => {
    try {
      setError('');
      const builtins = await getBuiltinsBySourcePromptId(promptId);
      
      if (builtins.length > 0) {
        setExistingBuiltins(builtins);
        setSelectedBuiltin(builtins[0]); // Default to most recent
        setStep('existing-detected');
      } else {
        // No existing builtin, proceed to convert
        setStep('converting');
        await handleConvert();
      }
    } catch (err: any) {
      console.error('Error checking for existing builtins:', err);
      setError('Failed to check for existing builtins');
      setStep('existing-detected');
    }
  };

  const handleConvert = async (forceNew: boolean = false) => {
    setIsProcessing(true);
    setError('');
    setStep('converting');

    try {
      const response = await fetch(`/api/admin/prompt-builtins/convert-from-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: promptId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Conversion failed (${response.status})`);
      }

      const data = await response.json();
      setCreatedBuiltinId(data.builtin_id);
      
      toast.success(`"${promptName}" converted to builtin successfully!`);
      
      // Load shortcuts for next step
      await loadShortcutsAndCategories();
      setStep('shortcut-selection');
      
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || 'An unexpected error occurred');
      setStep('existing-detected');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateExisting = async () => {
    if (!selectedBuiltin) return;

    setIsProcessing(true);
    setError('');
    setStep('converting');

    try {
      const response = await fetch(`/api/admin/prompt-builtins/convert-from-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: promptId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Update failed (${response.status})`);
      }

      const data = await response.json();
      setCreatedBuiltinId(data.builtin_id);
      
      toast.success('Builtin updated successfully!');
      
      await loadShortcutsAndCategories();
      setStep('shortcut-selection');
      
    } catch (err: any) {
      console.error('Update error:', err);
      setError(err.message || 'An unexpected error occurred');
      setStep('existing-detected');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadShortcutsAndCategories = async () => {
    setLoadingShortcuts(true);
    try {
      const [categoriesData, shortcutsData] = await Promise.all([
        fetchShortcutCategories({ is_active: true }),
        fetchShortcutsWithRelations({ is_active: true }),
      ]);
      
      setCategories(categoriesData);
      setShortcuts(shortcutsData as ShortcutWithRelations[]);
      
      // Auto-select first category if available
      if (categoriesData.length > 0 && !newShortcutData.category_id) {
        setNewShortcutData(prev => ({
          ...prev,
          category_id: categoriesData[0].id,
        }));
      }
    } catch (err) {
      console.error('Error loading shortcuts:', err);
      toast.error('Failed to load shortcuts data');
    } finally {
      setLoadingShortcuts(false);
    }
  };

  const handleLinkToExistingShortcut = async () => {
    if (!selectedShortcutId || !createdBuiltinId) return;

    setIsProcessing(true);
    setError('');

    try {
      await updatePromptShortcut({
        id: selectedShortcutId,
        prompt_builtin_id: createdBuiltinId,
        available_scopes: existingShortcutScopes,
        scope_mappings: existingShortcutMappings,
      });

      toast.success('Shortcut linked successfully!');
      setStep('complete');
    } catch (err: any) {
      console.error('Error linking shortcut:', err);
      setError(err.message || 'Failed to link shortcut');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNewShortcut = async () => {
    if (!newShortcutData.label || !newShortcutData.category_id || !createdBuiltinId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsProcessing(true);
    setError('');
    setStep('creating-shortcut');

    try {
      await createPromptShortcut({
        ...newShortcutData,
        prompt_builtin_id: createdBuiltinId,
      });

      toast.success('Shortcut created and linked successfully!');
      setStep('complete');
    } catch (err: any) {
      console.error('Error creating shortcut:', err);
      setError(err.message || 'Failed to create shortcut');
      setStep('shortcut-selection');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipShortcut = () => {
    setStep('complete');
  };

  const handleComplete = () => {
    onSuccess?.();
    onClose();
  };

  const handleOpenInAdmin = () => {
    onSuccess?.();
    onClose();
    router.push(`/administration/prompt-builtins?tab=builtins&highlight=${createdBuiltinId}`);
  };

  const handleOpenInNewTab = () => {
    window.open(`/administration/prompt-builtins?tab=builtins&highlight=${createdBuiltinId}`, '_blank');
  };

  const handleResetAndClose = () => {
    setStep('checking');
    setError('');
    setExistingBuiltins([]);
    setSelectedBuiltin(null);
    setCreatedBuiltinId(null);
    setCreatedBuiltin(null);
    setShortcutAction('link-existing');
    setSelectedShortcutId(null);
    setExistingShortcutScopes(DEFAULT_AVAILABLE_SCOPES);
    setExistingShortcutMappings({});
    setNewShortcutData({
      label: '',
      category_id: '',
      description: null,
      icon_name: null,
      result_display: 'modal-full',
      auto_run: true,
      allow_chat: true,
      show_variables: false,
      apply_variables: true,
      available_scopes: DEFAULT_AVAILABLE_SCOPES,
      scope_mappings: {},
    });
    onClose();
  };

  // Update existing shortcut scope mappings when selection changes
  useEffect(() => {
    if (selectedShortcutId) {
      const shortcut = shortcuts.find(s => s.id === selectedShortcutId);
      if (shortcut) {
        setExistingShortcutScopes(shortcut.available_scopes || DEFAULT_AVAILABLE_SCOPES);
        setExistingShortcutMappings(shortcut.scope_mappings || {});
      }
    }
  }, [selectedShortcutId, shortcuts]);

  // Filter shortcuts based on selection
  const filteredShortcuts = useMemo(() => {
    if (showOnlyUnlinked) {
      return shortcuts.filter(s => !s.prompt_builtin_id);
    }
    return shortcuts;
  }, [shortcuts, showOnlyUnlinked]);

  // Render different steps
  const renderContent = () => {
    switch (step) {
      case 'checking':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking for existing builtins...</p>
          </div>
        );

      case 'existing-detected':
        return (
          <div className="space-y-4 py-4">
            {existingBuiltins.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label>Existing Builtins ({existingBuiltins.length})</Label>
                  <RadioGroup value={selectedBuiltin?.id} onValueChange={(value) => {
                    const builtin = existingBuiltins.find(b => b.id === value);
                    setSelectedBuiltin(builtin || null);
                  }}>
                    <ScrollArea className="max-h-[200px]">
                      {existingBuiltins.map((builtin) => (
                        <div key={builtin.id} className="flex items-start space-x-2 p-3 border rounded-md mb-2 hover:bg-muted/50">
                          <RadioGroupItem value={builtin.id} id={builtin.id} className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor={builtin.id} className="cursor-pointer">
                              <div className="font-medium">{builtin.name}</div>
                              {builtin.description && (
                                <div className="text-sm text-muted-foreground">{builtin.description}</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(builtin.created_at).toLocaleDateString()}
                              </div>
                            </Label>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <RadioGroup value={builtinAction} onValueChange={(value: any) => setBuiltinAction(value)}>
                    <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50">
                      <RadioGroupItem value="update" id="update" />
                      <Label htmlFor="update" className="flex-1 cursor-pointer font-medium">
                        Update Selected Builtin
                      </Label>
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50">
                      <RadioGroupItem value="create-new" id="create-new" />
                      <Label htmlFor="create-new" className="flex-1 cursor-pointer font-medium">
                        Create New Builtin
                      </Label>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </RadioGroup>
                </div>
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

      case 'converting':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {builtinAction === 'update' ? 'Updating builtin...' : 'Converting to builtin...'}
            </p>
          </div>
        );

      case 'shortcut-selection':
        return (
          <div className="space-y-4 py-4">
            <Tabs value={shortcutAction} onValueChange={(value: any) => setShortcutAction(value)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="link-existing">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Existing
                </TabsTrigger>
                <TabsTrigger value="create-new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </TabsTrigger>
                <TabsTrigger value="skip">Skip</TabsTrigger>
              </TabsList>

              <TabsContent value="link-existing" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <Label>Select Shortcut</Label>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="unlinked-filter" className="text-sm font-normal">
                      Unlinked only
                    </Label>
                    <Switch
                      id="unlinked-filter"
                      checked={showOnlyUnlinked}
                      onCheckedChange={setShowOnlyUnlinked}
                    />
                  </div>
                </div>

                {loadingShortcuts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredShortcuts.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {showOnlyUnlinked 
                        ? 'No unlinked shortcuts available'
                        : 'No shortcuts available'}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[250px] border rounded-md p-2">
                    <div className="space-y-2">
                      {filteredShortcuts.map((shortcut) => {
                        const category = shortcut.category;
                        const placementMeta = category ? getPlacementTypeMeta(category.placement_type) : null;
                        
                        return (
                          <div
                            key={shortcut.id}
                            onClick={() => setSelectedShortcutId(shortcut.id)}
                            className={`p-3 border rounded-md cursor-pointer transition-colors ${
                              selectedShortcutId === shortcut.id
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{shortcut.label}</div>
                                {shortcut.description && (
                                  <div className="text-sm text-muted-foreground mt-1">{shortcut.description}</div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {category && (
                                    <Badge variant="outline" className="text-xs">
                                      {category.label}
                                    </Badge>
                                  )}
                                  {placementMeta && (
                                    <Badge variant="secondary" className="text-xs">
                                      {placementMeta.label}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {selectedShortcutId === shortcut.id && (
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}

                {selectedShortcutId && createdBuiltin && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Scope Mappings</Label>
                      <ScopeMappingEditor
                        availableScopes={existingShortcutScopes}
                        scopeMappings={existingShortcutMappings}
                        variableDefaults={createdBuiltin.variableDefaults}
                        onMappingChange={(scopeKey, variableName) => {
                          setExistingShortcutMappings(prev => ({
                            ...prev,
                            [scopeKey]: variableName,
                          }));
                        }}
                        compact
                      />
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="create-new" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shortcut-label">Label *</Label>
                    <Input
                      id="shortcut-label"
                      value={newShortcutData.label}
                      onChange={(e) => setNewShortcutData({ ...newShortcutData, label: e.target.value })}
                      placeholder="Shortcut name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shortcut-category">Category *</Label>
                    <HierarchicalCategorySelector
                      categories={categories}
                      value={newShortcutData.category_id}
                      onValueChange={(value) => setNewShortcutData({ ...newShortcutData, category_id: value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortcut-description">Description</Label>
                  <Textarea
                    id="shortcut-description"
                    value={newShortcutData.description || ''}
                    onChange={(e) => setNewShortcutData({ ...newShortcutData, description: e.target.value || null })}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Scope Mappings</Label>
                  {createdBuiltin && (
                    <ScopeMappingEditor
                      availableScopes={newShortcutData.available_scopes || DEFAULT_AVAILABLE_SCOPES}
                      scopeMappings={newShortcutData.scope_mappings || {}}
                      variableDefaults={createdBuiltin.variableDefaults}
                      onMappingChange={(scopeKey, variableName) => {
                        setNewShortcutData(prev => ({
                          ...prev,
                          scope_mappings: {
                            ...prev.scope_mappings,
                            [scopeKey]: variableName,
                          },
                        }));
                      }}
                    />
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shortcut-icon">Icon Name</Label>
                    <Input
                      id="shortcut-icon"
                      value={newShortcutData.icon_name || ''}
                      onChange={(e) => setNewShortcutData({ ...newShortcutData, icon_name: e.target.value || null })}
                      placeholder="e.g., Sparkles"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="result-display">Result Display</Label>
                    <Select
                      value={newShortcutData.result_display}
                      onValueChange={(value: any) => setNewShortcutData({ ...newShortcutData, result_display: value })}
                    >
                      <SelectTrigger id="result-display">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modal-full">Full Modal</SelectItem>
                        <SelectItem value="modal-compact">Compact Modal</SelectItem>
                        <SelectItem value="inline">Inline</SelectItem>
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                        <SelectItem value="flexible-panel">Flexible Panel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <Label htmlFor="auto-run" className="text-sm font-normal cursor-pointer">Auto Run</Label>
                      <Switch
                        id="auto-run"
                        checked={newShortcutData.auto_run}
                        onCheckedChange={(checked) => setNewShortcutData({ ...newShortcutData, auto_run: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <Label htmlFor="allow-chat" className="text-sm font-normal cursor-pointer">Allow Chat</Label>
                      <Switch
                        id="allow-chat"
                        checked={newShortcutData.allow_chat}
                        onCheckedChange={(checked) => setNewShortcutData({ ...newShortcutData, allow_chat: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <Label htmlFor="show-variables" className="text-sm font-normal cursor-pointer">Show Variables</Label>
                      <Switch
                        id="show-variables"
                        checked={newShortcutData.show_variables}
                        onCheckedChange={(checked) => setNewShortcutData({ ...newShortcutData, show_variables: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <Label htmlFor="apply-variables" className="text-sm font-normal cursor-pointer">Apply Variables</Label>
                      <Switch
                        id="apply-variables"
                        checked={newShortcutData.apply_variables}
                        onCheckedChange={(checked) => setNewShortcutData({ ...newShortcutData, apply_variables: checked })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="skip" className="mt-4">
                <div className="text-sm text-muted-foreground p-4 border rounded-md">
                  Builtin will be created without a shortcut. Link it later from the admin panel.
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 'creating-shortcut':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Creating shortcut...</p>
          </div>
        );

      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Complete</h3>
              <p className="text-sm text-muted-foreground">
                {shortcutAction !== 'skip' ? 'Builtin created and linked to shortcut' : 'Builtin created'}
              </p>
            </div>
            
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button onClick={handleOpenInAdmin} variant="default" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Admin Panel
              </Button>
              <Button onClick={handleOpenInNewTab} variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button onClick={handleComplete} variant="ghost" className="w-full">
                Done
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderActions = () => {
    switch (step) {
      case 'checking':
      case 'converting':
      case 'creating-shortcut':
      case 'complete':
        return null;

      case 'existing-detected':
        return (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetAndClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (builtinAction === 'update') {
                  handleUpdateExisting();
                } else {
                  handleConvert(true);
                }
              }} 
              disabled={isProcessing || !selectedBuiltin}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        );

      case 'shortcut-selection':
        return (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetAndClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (shortcutAction === 'link-existing') {
                  handleLinkToExistingShortcut();
                } else if (shortcutAction === 'create-new') {
                  handleCreateNewShortcut();
                } else {
                  handleSkipShortcut();
                }
              }}
              disabled={
                isProcessing || 
                (shortcutAction === 'link-existing' && !selectedShortcutId) ||
                (shortcutAction === 'create-new' && (!newShortcutData.label || !newShortcutData.category_id))
              }
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {shortcutAction === 'skip' ? 'Complete' : 'Complete'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleResetAndClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Convert to Builtin</DialogTitle>
          <DialogDescription>
            {step === 'checking' && 'Checking for existing builtins...'}
            {step === 'existing-detected' && 'Choose how to proceed'}
            {step === 'converting' && 'Converting your prompt...'}
            {step === 'shortcut-selection' && 'Link builtin to shortcut'}
            {step === 'creating-shortcut' && 'Creating shortcut...'}
            {step === 'complete' && 'Successfully created'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>

        {renderActions()}
      </DialogContent>
    </Dialog>
  );
}
