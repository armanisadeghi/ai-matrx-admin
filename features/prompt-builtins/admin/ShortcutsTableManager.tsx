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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Eye,
  EyeOff,
  RefreshCw,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Edit2,
  CheckCircle2,
  Lock,
  Link2,
  Loader2,
  Zap,
  FileText,
} from 'lucide-react';
import {
  ShortcutCategory,
  PromptBuiltin,
  PromptShortcut,
} from '../types';
import {
  fetchShortcutCategories,
  fetchPromptBuiltins,
  fetchShortcutsWithRelations,
  deletePromptShortcut,
  updatePromptShortcut,
} from '../services/admin-service';
import { PLACEMENT_TYPES, getPlacementTypeMeta } from '../constants';
import { RESULT_DISPLAY_META, ResultDisplay } from '../types/execution-modes';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';
import { PromptBuiltinEditDialog } from './PromptBuiltinEditDialog';
import { SelectPromptForBuiltinModal } from './SelectPromptForBuiltinModal';
import { SelectBuiltinForShortcutModal } from '../components/SelectBuiltinForShortcutModal';
import { PromptSettingsModal } from '@/features/prompts/components/PromptSettingsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUserFriendlyError } from '../utils/error-handler';

type SortField = 'label' | 'category' | 'status' | 'connection' | 'placement';
type SortDirection = 'asc' | 'desc';

interface ShortcutWithRelations extends PromptShortcut {
  category?: ShortcutCategory;
  builtin?: PromptBuiltin;
}

interface ShortcutsTableManagerProps {
  className?: string;
}

/**
 * Safely get result display metadata with proper fallback
 * Prevents crashes from invalid or legacy display values
 */
function getResultDisplayMeta(display: string | null | undefined) {
  const DEFAULT_DISPLAY: ResultDisplay = 'modal-full';
  
  // Handle null/undefined
  if (!display) {
    return RESULT_DISPLAY_META[DEFAULT_DISPLAY];
  }
  
  // Check if the display value exists in our metadata
  if (display in RESULT_DISPLAY_META) {
    return RESULT_DISPLAY_META[display as ResultDisplay];
  }
  
  // Fallback for invalid values
  console.warn(`Invalid result_display value: "${display}". Using default: "${DEFAULT_DISPLAY}"`);
  return RESULT_DISPLAY_META[DEFAULT_DISPLAY];
}

export function ShortcutsTableManager({ className }: ShortcutsTableManagerProps) {
  const [categories, setCategories] = useState<ShortcutCategory[]>([]);
  const [shortcuts, setShortcuts] = useState<ShortcutWithRelations[]>([]);
  const [builtins, setBuiltins] = useState<PromptBuiltin[]>([]);
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<any[]>([]);
  const [availableTools, setAvailableTools] = useState<any[]>([]);

  // Filters
  const [sortField, setSortField] = useState<SortField>('label');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'unconnected'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [placementFilter, setPlacementFilter] = useState<string>('all');

  // Modals
  const [editingShortcut, setEditingShortcut] = useState<ShortcutWithRelations | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectingPromptFor, setSelectingPromptFor] = useState<ShortcutWithRelations | null>(null);
  const [selectingBuiltinFor, setSelectingBuiltinFor] = useState<ShortcutWithRelations | null>(null);
  const [viewingBuiltinId, setViewingBuiltinId] = useState<string | null>(null);

  const { toast } = useToast();

  // Load all data
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesData, shortcutsData, builtinsData, modelsResponse, toolsResponse] = await Promise.all([
        fetchShortcutCategories(),
        fetchShortcutsWithRelations(),
        fetchPromptBuiltins({ is_active: true }),
        fetch('/api/ai-models').then(r => r.json()).catch(() => ({ models: [] })),
        fetch('/api/tools').then(r => r.json()).catch(() => ({ tools: [] })),
      ]);

      setCategories(categoriesData);
      setShortcuts(shortcutsData);
      setBuiltins(builtinsData);
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

  // Filter and sort shortcuts
  const filteredAndSorted = useMemo(() => {
    let filtered = [...shortcuts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.label.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.keyboard_shortcut?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => s.category_id === categoryFilter);
    }

    // Placement filter
    if (placementFilter !== 'all') {
      filtered = filtered.filter(s => s.category?.placement_type === placementFilter);
    }

    // Status filter (connected/unconnected)
    if (statusFilter === 'connected') {
      filtered = filtered.filter(s => s.prompt_builtin_id && s.builtin);
    } else if (statusFilter === 'unconnected') {
      filtered = filtered.filter(s => !s.prompt_builtin_id || !s.builtin);
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter(s => s.is_active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(s => !s.is_active);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'label':
          aVal = a.label.toLowerCase();
          bVal = b.label.toLowerCase();
          break;
        case 'category':
          aVal = a.category?.label || '';
          bVal = b.category?.label || '';
          break;
        case 'status':
          aVal = a.is_active ? 1 : 0;
          bVal = b.is_active ? 1 : 0;
          break;
        case 'connection':
          aVal = (a.prompt_builtin_id && a.builtin) ? 1 : 0;
          bVal = (b.prompt_builtin_id && b.builtin) ? 1 : 0;
          break;
        case 'placement':
          aVal = a.category?.placement_type || '';
          bVal = b.category?.placement_type || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [shortcuts, searchQuery, categoryFilter, placementFilter, statusFilter, activeFilter, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => {
    const total = shortcuts.length;
    const connected = shortcuts.filter(s => s.prompt_builtin_id && s.builtin).length;
    const active = shortcuts.filter(s => s.is_active).length;

    return { total, connected, unconnected: total - connected, active };
  }, [shortcuts]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (shortcut: ShortcutWithRelations) => {
    setEditingShortcut(shortcut);
    setIsEditDialogOpen(true);
  };

  const handleToggleActive = async (shortcutId: string, currentState: boolean) => {
    try {
      await updatePromptShortcut({
        id: shortcutId,
        is_active: !currentState,
      });

      toast({ title: 'Success', description: `Shortcut ${!currentState ? 'activated' : 'deactivated'}` });
      await loadData();
    } catch (error) {
      const errorMessage = getUserFriendlyError(error);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleDelete = async (shortcutId: string, shortcutLabel: string) => {
    if (!confirm(`Are you sure you want to delete "${shortcutLabel}"?`)) return;

    try {
      await deletePromptShortcut(shortcutId);
      toast({ title: 'Success', description: 'Shortcut deleted' });
      await loadData();
    } catch (error) {
      const errorMessage = getUserFriendlyError(error);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
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

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setPlacementFilter('all');
    setStatusFilter('all');
    setActiveFilter('all');
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || placementFilter !== 'all' || statusFilter !== 'all' || activeFilter !== 'all';

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
            <h2 className="text-2xl font-bold">Shortcuts Manager</h2>
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
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Shortcut
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
                <div className="text-xl font-bold text-green-600">{stats.connected}</div>
                <div className="text-xs text-muted-foreground">Connected</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-xl font-bold text-orange-600">{stats.unconnected}</div>
                <div className="text-xs text-muted-foreground">Unconnected</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-xl font-bold text-blue-600">{stats.active}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={placementFilter} onValueChange={setPlacementFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Placements</SelectItem>
                  {Object.entries(PLACEMENT_TYPES).map(([key, value]) => (
                    <SelectItem key={value} value={value}>
                      {getPlacementTypeMeta(value).label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="unconnected">Unconnected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead className="min-w-[200px]" onClick={() => handleSort('label')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Label</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="label" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[130px]" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Category</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="category" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[120px]" onClick={() => handleSort('placement')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Placement</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="placement" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[100px]">Display</TableHead>
                  <TableHead className="w-[70px] text-center">Auto</TableHead>
                  <TableHead className="w-[70px] text-center">Chat</TableHead>
                  <TableHead className="w-[70px] text-center">Show Vars</TableHead>
                  <TableHead className="w-[70px] text-center">Apply Vars</TableHead>
                  <TableHead className="min-w-[120px]">Keyboard</TableHead>
                  <TableHead className="min-w-[140px]" onClick={() => handleSort('connection')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">AI Prompt</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="connection" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[80px]" onClick={() => handleSort('status')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Active</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="status" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map((shortcut) => {
                  const isConnected = shortcut.prompt_builtin_id && shortcut.builtin;

                  return (
                    <TableRow
                      key={shortcut.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(shortcut)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isConnected ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </TooltipTrigger>
                            <TooltipContent>Connected to AI prompt</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger>
                              <Lock className="h-4 w-4 text-orange-600" />
                            </TooltipTrigger>
                            <TooltipContent>No AI prompt connected</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="font-medium">{shortcut.label}</div>
                            {shortcut.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {shortcut.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {shortcut.category && (
                          <Badge variant="outline">{shortcut.category.label}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {shortcut.category?.placement_type && (
                          <Badge variant="secondary" className="text-xs">
                            {getPlacementTypeMeta(shortcut.category.placement_type).label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              {getResultDisplayMeta(shortcut.result_display).label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{getResultDisplayMeta(shortcut.result_display).description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        {shortcut.auto_run ?? true ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {shortcut.allow_chat ?? true ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {shortcut.show_variables ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {shortcut.apply_variables ?? true ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>
                        {shortcut.keyboard_shortcut && (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {shortcut.keyboard_shortcut}
                          </code>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isConnected ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1 text-sm">
                                <Link2 className="h-3 w-3 text-green-600" />
                                <span className="font-medium line-clamp-1">
                                  {shortcut.builtin?.name || 'Connected'}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-semibold">AI Prompt:</p>
                                <p className="text-xs">{shortcut.builtin?.name}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                Connect
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectingPromptFor(shortcut)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Select Prompt
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectingBuiltinFor(shortcut)}>
                                <Zap className="h-4 w-4 mr-2" />
                                Browse Builtins
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Badge variant={shortcut.is_active ? 'default' : 'secondary'}>
                          {shortcut.is_active ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRowClick(shortcut)}
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
                                onClick={() => handleToggleActive(shortcut.id, shortcut.is_active)}
                              >
                                {shortcut.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {shortcut.is_active ? 'Deactivate' : 'Activate'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(shortcut.id, shortcut.label)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
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
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No shortcuts found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Edit Dialog */}
        {editingShortcut && (
          <PromptBuiltinEditDialog
            shortcut={editingShortcut}
            categories={categories}
            builtins={builtins}
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setEditingShortcut(null);
            }}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              setEditingShortcut(null);
              loadData();
            }}
            onOpenPromptModal={() => setSelectingPromptFor(editingShortcut)}
            onOpenBuiltinEditor={(id) => setViewingBuiltinId(id)}
          />
        )}

        {/* Create Dialog */}
        <PromptBuiltinEditDialog
          shortcut={null}
          categories={categories}
          builtins={builtins}
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSuccess={() => {
            setIsCreateDialogOpen(false);
            loadData();
          }}
          onOpenPromptModal={() => {}}
          onOpenBuiltinEditor={() => {}}
        />

        {/* Select/Connect Prompt Modal */}
        {selectingPromptFor && (
          <SelectPromptForBuiltinModal
            isOpen={true}
            onClose={() => setSelectingPromptFor(null)}
            shortcutId={selectingPromptFor.id}
            shortcutData={{
              label: selectingPromptFor.label || '',
              available_scopes: selectingPromptFor.available_scopes || []
            }}
            onSuccess={async () => {
              setSelectingPromptFor(null);
              await loadData();
            }}
          />
        )}

        {/* Select Existing Builtin Modal */}
        {selectingBuiltinFor && (
          <SelectBuiltinForShortcutModal
            isOpen={true}
            onClose={() => setSelectingBuiltinFor(null)}
            shortcut={selectingBuiltinFor}
            onSuccess={async () => {
              setSelectingBuiltinFor(null);
              await loadData();
            }}
          />
        )}

        {/* View/Edit Builtin Modal */}
        {viewingBuiltinId && (() => {
          const builtin = builtins.find(b => b.id === viewingBuiltinId);
          if (!builtin) return null;

          return (
            <PromptSettingsModal
              isOpen={true}
              onClose={() => setViewingBuiltinId(null)}
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
      </div>
    </TooltipProvider>
  );
}

