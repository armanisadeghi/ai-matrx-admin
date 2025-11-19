'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  Trash2,
  RefreshCw,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Edit2,
  FileText,
  Link2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type {
  PromptBuiltin,
  PromptShortcut,
  ShortcutCategory,
} from '../types';
import {
  fetchPromptBuiltins,
  fetchPromptShortcuts,
  fetchShortcutCategories,
} from '../services/admin-service';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';
import { SelectPromptForBuiltinModal } from './SelectPromptForBuiltinModal';
import { LinkBuiltinToShortcutModal } from '../components/LinkBuiltinToShortcutModal';
import { ScopeMappingEditor } from '../components/ScopeMappingEditor';
import { getUserFriendlyError } from '../utils/error-handler';
import { UniversalPromptEditor, normalizePromptData, UniversalPromptData } from '@/features/prompts/components/universal-editor';
import { updatePromptShortcut } from '../services/admin-service';
import type { ScopeMapping } from '../types/core';

type SortField = 'name' | 'variables' | 'usage' | 'source';
type SortDirection = 'asc' | 'desc';

interface PromptBuiltinsTableManagerProps {
  className?: string;
}

export function PromptBuiltinsTableManager({ className }: PromptBuiltinsTableManagerProps) {
  const [builtins, setBuiltins] = useState<PromptBuiltin[]>([]);
  const [shortcuts, setShortcuts] = useState<PromptShortcut[]>([]);
  const [categories, setCategories] = useState<ShortcutCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<any[]>([]);
  const [availableTools, setAvailableTools] = useState<any[]>([]);

  // Filters
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'converted' | 'generated'>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBuiltinId, setEditingBuiltinId] = useState<string | null>(null);
  const [linkingShortcutForBuiltinId, setLinkingShortcutForBuiltinId] = useState<string | null>(null);
  const [usageModalBuiltinId, setUsageModalBuiltinId] = useState<string | null>(null);
  
  // Table state
  const [expandedBuiltinIds, setExpandedBuiltinIds] = useState<Set<string>>(new Set());
  const [sourcePromptNames, setSourcePromptNames] = useState<Record<string, string>>({});
  
  // Confirmation dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const { toast } = useToast();

  // Load all data
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [builtinsData, shortcutsData, categoriesData, modelsResponse, toolsResponse] = await Promise.all([
        fetchPromptBuiltins({ is_active: true }),
        fetchPromptShortcuts(),
        fetchShortcutCategories(),
        fetch('/api/ai-models').then(r => r.json()).catch(() => ({ models: [] })),
        fetch('/api/tools').then(r => r.json()).catch(() => ({ tools: [] })),
      ]);

      setBuiltins(builtinsData);
      setShortcuts(shortcutsData);
      setCategories(categoriesData);
      setModels(modelsResponse?.models || []);
      setAvailableTools(toolsResponse?.tools || []);
      
      // Fetch source prompt names for builtins with source_prompt_id
      const sourcePromptIds = builtinsData
        .filter(b => b.source_prompt_id)
        .map(b => b.source_prompt_id as string);
      
      if (sourcePromptIds.length > 0) {
        const promptNames: Record<string, string> = {};
        await Promise.all(
          sourcePromptIds.map(async (promptId) => {
            try {
              const response = await fetch(`/api/prompts/${promptId}`);
              if (response.ok) {
                const prompt = await response.json();
                promptNames[promptId] = prompt.name;
              }
            } catch (err) {
              console.error(`Failed to fetch prompt ${promptId}:`, err);
            }
          })
        );
        setSourcePromptNames(promptNames);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Get usage count for each builtin
  const getUsageCount = (builtinId: string) => {
    return shortcuts.filter(s => s.prompt_builtin_id === builtinId).length;
  };

  // Get shortcuts using a builtin
  const getBuiltinShortcuts = (builtinId: string) => {
    return shortcuts.filter(s => s.prompt_builtin_id === builtinId);
  };

  // Toggle expansion
  const toggleExpansion = (builtinId: string) => {
    setExpandedBuiltinIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(builtinId)) {
        newSet.delete(builtinId);
      } else {
        newSet.add(builtinId);
      }
      return newSet;
    });
  };

  // Refresh builtin from source
  const handleRefreshFromSource = async (builtin: PromptBuiltin) => {
    if (!builtin.source_prompt_id) return;

    try {
      // Fetch source prompt
      const response = await fetch(`/api/prompts/${builtin.source_prompt_id}`);
      if (!response.ok) throw new Error('Failed to fetch source prompt');
      
      const sourcePrompt = await response.json();
      
      // Compare variables
      const currentVars = builtin.variableDefaults || [];
      const newVars = sourcePrompt.variable_defaults || [];
      
      const currentVarNames = currentVars.map((v: any) => v.name).sort();
      const newVarNames = newVars.map((v: any) => v.name).sort();
      
      const hasChanges = JSON.stringify(currentVarNames) !== JSON.stringify(newVarNames);
      
      if (hasChanges) {
        const added = newVarNames.filter((n: string) => !currentVarNames.includes(n));
        const removed = currentVarNames.filter((n: string) => !newVarNames.includes(n));
        
        let message = 'Variables will be updated:\n\n';
        if (added.length) message += `Added: ${added.join(', ')}\n`;
        if (removed.length) message += `Removed: ${removed.join(', ')}\n`;
        
        await new Promise<void>((resolve) => {
          setConfirmDialog({
            open: true,
            title: 'Update Builtin from Source',
            description: message,
            onConfirm: resolve,
          });
        });
      } else {
        await new Promise<void>((resolve) => {
          setConfirmDialog({
            open: true,
            title: 'Update Builtin',
            description: 'Update builtin with latest prompt content?',
            onConfirm: resolve,
          });
        });
      }
      
      // Update builtin
      const updateResponse = await fetch(`/api/admin/prompt-builtins/convert-from-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_id: builtin.source_prompt_id,
          builtin_id: builtin.id,
        }),
      });
      
      if (!updateResponse.ok) throw new Error('Failed to refresh builtin');
      
      toast({ title: 'Success', description: 'Builtin refreshed from source' });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getUserFriendlyError(error),
        variant: 'destructive'
      });
    }
  };

  // Update shortcut scope mappings
  const handleUpdateScopeMappings = async (
    shortcutId: string,
    availableScopes: string[],
    scopeMappings: ScopeMapping
  ) => {
    try {
      await updatePromptShortcut({
        id: shortcutId,
        available_scopes: availableScopes,
        scope_mappings: scopeMappings,
      });
      
      toast({ title: 'Success', description: 'Scope mappings updated' });
      await loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getUserFriendlyError(error),
        variant: 'destructive'
      });
    }
  };

  // Filter and sort builtins
  const filteredAndSorted = useMemo(() => {
    let filtered = [...builtins];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query)
      );
    }

    // Source filter
    if (filterSource === 'converted') {
      filtered = filtered.filter(b => b.source_prompt_id);
    } else if (filterSource === 'generated') {
      filtered = filtered.filter(b => !b.source_prompt_id);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'variables':
          aVal = (a.variableDefaults || []).length;
          bVal = (b.variableDefaults || []).length;
          break;
        case 'usage':
          aVal = getUsageCount(a.id);
          bVal = getUsageCount(b.id);
          break;
        case 'source':
          aVal = a.source_prompt_id ? 1 : 0;
          bVal = b.source_prompt_id ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [builtins, searchQuery, filterSource, sortField, sortDirection, shortcuts]);

  // Stats
  const stats = useMemo(() => {
    const total = builtins.length;
    const converted = builtins.filter(b => b.source_prompt_id).length;
    const generated = total - converted;
    const inUse = builtins.filter(b => getUsageCount(b.id) > 0).length;

    return { total, converted, generated, inUse };
  }, [builtins, shortcuts]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleUpdateBuiltin = async (updated: UniversalPromptData) => {
    try {
      const response = await fetch(`/api/admin/prompt-builtins/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updated.name,
          description: updated.description,
          messages: updated.messages,
          variable_defaults: updated.variable_defaults,
          settings: updated.settings,
          is_active: updated.is_active,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update builtin');
      }

      toast({ title: 'Success', description: 'Prompt builtin updated successfully' });
      setEditingBuiltinId(null);
      await loadData();
    } catch (error: any) {
      const errorMessage = getUserFriendlyError(error);
      toast({
        title: 'Failed to Update Builtin',
        description: errorMessage,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleDelete = async (builtinId: string, builtinName: string) => {
    const usageCount = getUsageCount(builtinId);
    
    if (usageCount > 0) {
      const shortcutsUsing = shortcuts.filter(s => s.prompt_builtin_id === builtinId);
      const shortcutNames = shortcutsUsing.map(s => s.label).join(', ');
      
      await new Promise<void>((resolve, reject) => {
        setConfirmDialog({
          open: true,
          title: 'Delete Builtin',
          description: `This builtin is used by ${usageCount} shortcut(s): ${shortcutNames}\n\nDeleting it will disconnect these shortcuts. Continue?`,
          onConfirm: resolve,
        });
      }).catch(() => {
        return;
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        setConfirmDialog({
          open: true,
          title: 'Delete Builtin',
          description: `Delete prompt builtin "${builtinName}"?`,
          onConfirm: resolve,
        });
      }).catch(() => {
        return;
      });
    }

    try {
      const response = await fetch(`/api/admin/prompt-builtins/${builtinId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete builtin');
      }

      toast({ title: 'Success', description: 'Prompt builtin deleted' });
      await loadData();
    } catch (error: any) {
      const errorMessage = getUserFriendlyError(error);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterSource('all');
  };

  const hasActiveFilters = searchQuery || filterSource !== 'all';

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <MatrxMiniLoader />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`flex flex-col h-full ${className}`}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Prompt Builtins Manager</h2>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
              <Button onClick={() => loadData()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Builtin
              </Button>
            </div>
          </div>

          {/* Compact Stats */}
          <div className="grid grid-cols-4 gap-2">
            <Card>
              <CardContent className="p-2">
                <div className="text-xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-xl font-bold text-blue-600">{stats.converted}</div>
                <div className="text-xs text-muted-foreground">Converted</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-xl font-bold text-purple-600">{stats.generated}</div>
                <div className="text-xs text-muted-foreground">Generated</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-xl font-bold text-green-600">{stats.inUse}</div>
                <div className="text-xs text-muted-foreground">In Use</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search prompt builtins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />

            <div className="flex gap-2">
              <Button
                variant={filterSource === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSource('all')}
              >
                All
              </Button>
              <Button
                variant={filterSource === 'converted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSource('converted')}
              >
                Converted
              </Button>
              <Button
                variant={filterSource === 'generated' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSource('generated')}
              >
                Generated
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="min-w-[250px]" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Name</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[100px]" onClick={() => handleSort('variables')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Variables</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="variables" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[100px]" onClick={() => handleSort('usage')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Usage</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="usage" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[120px]" onClick={() => handleSort('source')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Source</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="source" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map((builtin) => {
                  const usageCount = getUsageCount(builtin.id);
                  const variableCount = (builtin.variableDefaults || []).length;

                  const isExpanded = expandedBuiltinIds.has(builtin.id);
                  const linkedShortcuts = getBuiltinShortcuts(builtin.id);

                  return (
                    <React.Fragment key={builtin.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setEditingBuiltinId(builtin.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {linkedShortcuts.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpansion(builtin.id);
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <div className="w-6" />
                            )}
                            <FileText className="h-4 w-4 text-blue-500" />
                            <div className="font-medium">{builtin.name}</div>
                          </div>
                        </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {variableCount > 0 ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="secondary" className="cursor-help">
                                {variableCount} var{variableCount !== 1 ? 's' : ''}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <div className="space-y-2">
                                <p className="font-semibold text-sm border-b pb-1">Variables:</p>
                                <div className="grid gap-1">
                                  {builtin.variableDefaults?.map((v: any) => (
                                    <div key={v.name} className="flex items-start gap-2 text-xs">
                                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono">
                                        {v.name}
                                      </code>
                                      {v.default_value && (
                                        <span className="text-muted-foreground">
                                          = {v.default_value}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {usageCount > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-2"
                            onClick={() => setUsageModalBuiltinId(builtin.id)}
                          >
                            <Badge variant="default" className="bg-green-600">
                              {usageCount}
                            </Badge>
                            <span className="text-xs">shortcut{usageCount !== 1 ? 's' : ''}</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-2"
                            onClick={() => setLinkingShortcutForBuiltinId(builtin.id)}
                          >
                            <Badge variant="outline" className="text-muted-foreground">
                              Unused
                            </Badge>
                            <Link2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {builtin.source_prompt_id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-2 px-2"
                              onClick={() => {
                                window.open(`/ai/prompts/edit/${builtin.source_prompt_id}`, '_blank');
                              }}
                            >
                              <Link2 className="h-3 w-3 text-blue-500" />
                              <span className="text-xs">
                                {sourcePromptNames[builtin.source_prompt_id] || 'Source Prompt'}
                              </span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleRefreshFromSource(builtin)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Refresh from source</TooltipContent>
                            </Tooltip>
                          </div>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <FileText className="h-3 w-3" />
                            Generated
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLinkingShortcutForBuiltinId(builtin.id)}
                              >
                                <Link2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Link Shortcut</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingBuiltinId(builtin.id)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(builtin.id, builtin.name)}
                                disabled={usageCount > 0}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {usageCount > 0 ? 'In use - cannot delete' : 'Delete'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Nested Rows for Linked Shortcuts */}
                    {isExpanded && linkedShortcuts.map((shortcut) => {
                      const category = categories.find(c => c.id === shortcut.category_id);
                      
                      return (
                        <TableRow key={`${builtin.id}-${shortcut.id}`} className="bg-muted/30">
                          <TableCell colSpan={5} className="py-4 pr-4">
                            <div className="ml-10 mr-4 space-y-3">
                              {/* Shortcut Header */}
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <Badge variant="outline" className="gap-1">
                                    <Link2 className="h-3 w-3" />
                                    Shortcut
                                  </Badge>
                                  <span className="font-medium">{shortcut.label}</span>
                                  {category && (
                                    <Badge variant="secondary" className="text-xs">
                                      {category.label}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {shortcut.result_display}
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-shrink-0"
                                  onClick={async () => {
                                    await new Promise<void>((resolve, reject) => {
                                      setConfirmDialog({
                                        open: true,
                                        title: 'Detach Shortcut',
                                        description: `Detach "${shortcut.label}" from this builtin?`,
                                        onConfirm: async () => {
                                          try {
                                            await updatePromptShortcut({
                                              id: shortcut.id,
                                              prompt_builtin_id: null,
                                            });
                                            toast({ 
                                              title: 'Success', 
                                              description: 'Shortcut detached from builtin' 
                                            });
                                            await loadData();
                                            resolve();
                                          } catch (error) {
                                            reject(error);
                                          }
                                        },
                                      });
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Detach
                                </Button>
                              </div>

                              {/* Scope Mappings Editor */}
                              <div className="bg-card border rounded-lg p-4">
                                <ScopeMappingEditor
                                  availableScopes={shortcut.available_scopes || []}
                                  scopeMappings={shortcut.scope_mappings || {}}
                                  variableDefaults={builtin.variableDefaults || []}
                                  onScopesChange={(scopes, mappings) => {
                                    handleUpdateScopeMappings(shortcut.id, scopes, mappings);
                                  }}
                                  compact
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>

            {filteredAndSorted.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No prompt builtins found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Create Modal */}
        {isCreateModalOpen && (
          <SelectPromptForBuiltinModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            shortcutId={null as any}
            shortcutData={{
              label: 'New Prompt Builtin',
              available_scopes: []
            }}
            onSuccess={async () => {
              setIsCreateModalOpen(false);
              await loadData();
            }}
          />
        )}

        {/* Edit Builtin Modal */}
        {editingBuiltinId && (() => {
          const builtin = builtins.find(b => b.id === editingBuiltinId);
          if (!builtin) return null;

          // Convert builtin to universal format
          const promptData = normalizePromptData({
            id: builtin.id,
            name: builtin.name,
            description: builtin.description,
            messages: builtin.messages,
            variable_defaults: builtin.variableDefaults,
            settings: builtin.settings,
            is_active: builtin.is_active,
            source_prompt_id: builtin.source_prompt_id,
          }, 'builtin');

          return (
            <UniversalPromptEditor
              isOpen={true}
              onClose={() => setEditingBuiltinId(null)}
              promptData={promptData}
              models={models}
              availableTools={availableTools}
              onSave={handleUpdateBuiltin}
            />
          );
        })()}

        {/* Link Shortcut Modal */}
        {linkingShortcutForBuiltinId && (() => {
          const builtin = builtins.find(b => b.id === linkingShortcutForBuiltinId);
          if (!builtin) return null;

          return (
            <LinkBuiltinToShortcutModal
              isOpen={true}
              onClose={() => setLinkingShortcutForBuiltinId(null)}
              builtin={builtin}
              onSuccess={async () => {
                setLinkingShortcutForBuiltinId(null);
                await loadData();
              }}
            />
          );
        })()}

        {/* Usage Modal */}
        <Dialog open={!!usageModalBuiltinId} onOpenChange={() => setUsageModalBuiltinId(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Shortcut Usage</DialogTitle>
              <DialogDescription>
                Shortcuts using this builtin
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {usageModalBuiltinId && (() => {
                const builtin = builtins.find(b => b.id === usageModalBuiltinId);
                const usedByShortcuts = shortcuts.filter(s => s.prompt_builtin_id === usageModalBuiltinId);

                if (!builtin || usedByShortcuts.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No shortcuts found
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      <strong>{builtin.name}</strong> is used by {usedByShortcuts.length} shortcut{usedByShortcuts.length !== 1 ? 's' : ''}
                    </div>
                    {usedByShortcuts.map((shortcut) => {
                      const category = categories.find(c => c.id === shortcut.category_id);
                      
                      return (
                        <Card key={shortcut.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{shortcut.label}</span>
                                  {category && (
                                    <Badge variant="secondary" className="text-xs">
                                      {category.label}
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant={shortcut.is_active ? "default" : "outline"}
                                    className="text-xs"
                                  >
                                    {shortcut.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                                {shortcut.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {shortcut.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>Display: {shortcut.result_display}</span>
                                  {shortcut.keyboard_shortcut && (
                                    <span>Key: {shortcut.keyboard_shortcut}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={async () => {
                                        await new Promise<void>((resolve, reject) => {
                                          setConfirmDialog({
                                            open: true,
                                            title: 'Detach Shortcut',
                                            description: `Detach "${shortcut.label}" from this builtin?`,
                                            onConfirm: async () => {
                                              try {
                                                await updatePromptShortcut({
                                                  id: shortcut.id,
                                                  prompt_builtin_id: null,
                                                });
                                                toast({ 
                                                  title: 'Success', 
                                                  description: 'Shortcut detached' 
                                                });
                                                await loadData();
                                                resolve();
                                              } catch (error) {
                                                reject(error);
                                              }
                                            },
                                          });
                                        });
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Detach from builtin</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              })()}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <AlertDialog
          open={confirmDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setConfirmDialog({ ...confirmDialog, open: false });
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription className="whitespace-pre-line">
                {confirmDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setConfirmDialog({ ...confirmDialog, open: false });
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, open: false });
                }}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

