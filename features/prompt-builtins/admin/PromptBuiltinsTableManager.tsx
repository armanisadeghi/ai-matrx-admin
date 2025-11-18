'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
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
  Edit2,
  FileText,
  Link2,
  Loader2,
  AlertCircle,
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
import { PromptSettingsModal } from '@/features/prompts/components/PromptSettingsModal';
import { LinkBuiltinToShortcutModal } from '../components/LinkBuiltinToShortcutModal';
import { getUserFriendlyError } from '../utils/error-handler';

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

  const handleUpdateBuiltin = async (id: string, data: {
    name: string;
    description?: string;
    variableDefaults: any[];
    messages?: any[];
    settings?: Record<string, any>;
  }) => {
    try {
      const response = await fetch(`/api/admin/prompt-builtins/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          messages: data.messages,
          variable_defaults: data.variableDefaults,
          settings: data.settings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update builtin');
      }

      toast({ title: 'Success', description: 'Prompt builtin updated successfully' });
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
      
      if (!confirm(
        `This builtin is used by ${usageCount} shortcut(s): ${shortcutNames}\n\n` +
        `Deleting it will disconnect these shortcuts. Continue?`
      )) {
        return;
      }
    } else if (!confirm(`Delete prompt builtin "${builtinName}"?`)) {
      return;
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

                  return (
                    <TableRow
                      key={builtin.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setEditingBuiltinId(builtin.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="font-medium">{builtin.name}</div>
                            {builtin.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {builtin.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {variableCount > 0 ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="secondary">{variableCount}</Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-semibold">Variables:</p>
                                {builtin.variableDefaults?.map((v: any) => (
                                  <p key={v.name} className="text-xs">{v.name}</p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {usageCount > 0 ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="default" className="bg-green-600">
                                {usageCount} shortcut{usageCount !== 1 ? 's' : ''}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-semibold">Used by:</p>
                                {shortcuts
                                  .filter(s => s.prompt_builtin_id === builtin.id)
                                  .map(s => (
                                    <p key={s.id} className="text-xs">{s.label}</p>
                                  ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Unused
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {builtin.source_prompt_id ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="gap-1">
                                <Link2 className="h-3 w-3" />
                                Converted
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              From user prompt
                            </TooltipContent>
                          </Tooltip>
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

          return (
            <PromptSettingsModal
              isOpen={true}
              onClose={() => setEditingBuiltinId(null)}
              promptId={builtin.id}
              promptName={builtin.name}
              promptDescription={builtin.description || ''}
              variableDefaults={builtin.variableDefaults || []}
              messages={builtin.messages || []}
              settings={builtin.settings || {}}
              models={models}
              availableTools={availableTools}
              onUpdate={handleUpdateBuiltin}
              onLocalStateUpdate={() => {}}
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
      </div>
    </TooltipProvider>
  );
}

