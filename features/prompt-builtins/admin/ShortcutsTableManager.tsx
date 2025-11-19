'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
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
  Copy,
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
import { ShortcutEditModal } from '../components/ShortcutEditModal';
import { CategorySelector } from '../components/CategorySelector';
import { SelectPromptForBuiltinModal } from './SelectPromptForBuiltinModal';
import { SelectBuiltinForShortcutModal } from '../components/SelectBuiltinForShortcutModal';
import { PromptSettingsModal } from '@/features/prompts/components/PromptSettingsModal';
import { DuplicateShortcutModal } from '../components/DuplicateShortcutModal';
import { getIconComponent } from '@/components/official/IconResolver';
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
  const [duplicatingShortcut, setDuplicatingShortcut] = useState<ShortcutWithRelations | null>(null);
  
  // Confirmation dialog states
  const [deleteConfirmShortcut, setDeleteConfirmShortcut] = useState<{ id: string; label: string } | null>(null);

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

  // Calculate available filters from actual data
  const availablePlacements = useMemo(() => {
    const placements = new Set<string>();
    shortcuts.forEach(s => {
      if (s.category?.placement_type) {
        placements.add(s.category.placement_type);
      }
    });
    return Array.from(placements);
  }, [shortcuts]);

  const availableCategories = useMemo(() => {
    // If placement filter is active, only show categories for that placement
    if (placementFilter !== 'all') {
      return categories.filter(cat => 
        cat.placement_type === placementFilter &&
        shortcuts.some(s => s.category_id === cat.id)
      );
    }
    // Otherwise, only show categories that have shortcuts
    return categories.filter(cat => 
      shortcuts.some(s => s.category_id === cat.id)
    );
  }, [categories, shortcuts, placementFilter]);

  // Reset category filter when placement changes and category is no longer valid
  React.useEffect(() => {
    if (categoryFilter !== 'all') {
      const categoryExists = availableCategories.some(cat => cat.id === categoryFilter);
      if (!categoryExists) {
        setCategoryFilter('all');
      }
    }
  }, [placementFilter, categoryFilter, availableCategories]);

  // Optimistic update helper
  const optimisticUpdate = React.useCallback(async (
    shortcutId: string,
    updates: Partial<PromptShortcut>,
    successMessage: string
  ) => {
    // Optimistically update local state
    setShortcuts(prev => prev.map(s => 
      s.id === shortcutId ? { ...s, ...updates } : s
    ));

    try {
      await updatePromptShortcut({
        id: shortcutId,
        ...updates,
      });
      toast({ title: 'Success', description: successMessage });
    } catch (error: any) {
      // Revert on error
      toast({
        title: 'Failed',
        description: getUserFriendlyError(error),
        variant: 'destructive'
      });
      loadData(); // Reload to get correct state
    }
  }, [toast, loadData]);

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

  const handleDelete = (shortcutId: string, shortcutLabel: string) => {
    setDeleteConfirmShortcut({ id: shortcutId, label: shortcutLabel });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmShortcut) return;

    try {
      await deletePromptShortcut(deleteConfirmShortcut.id);
      toast({ title: 'Success', description: 'Shortcut deleted' });
      setDeleteConfirmShortcut(null);
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

            <Select value={placementFilter} onValueChange={setPlacementFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Placements</SelectItem>
                {availablePlacements.map((placement) => {
                  const meta = getPlacementTypeMeta(placement);
                  const IconComponent = getIconComponent(meta.icon as any);
                  return (
                    <SelectItem key={placement} value={placement}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-3.5 w-3.5" />
                        {meta.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {placementFilter === 'all' ? 'All Categories' : 'All in Placement'}
                </SelectItem>
                {availableCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
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
                  <TableHead className="min-w-[120px]" onClick={() => handleSort('placement')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Placement</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="placement" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[130px]" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Category</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="category" />
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
                          <div className="font-medium">{shortcut.label}</div>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={shortcut.category?.placement_type || ''}
                          onValueChange={(value) => {
                            // Find a category with this placement type
                            const targetCategory = categories.find(c => c.placement_type === value);
                            if (!targetCategory) return;
                            
                            optimisticUpdate(
                              shortcut.id,
                              { category_id: targetCategory.id },
                              'Placement updated'
                            );
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Select placement...">
                              {shortcut.category?.placement_type && 
                                getPlacementTypeMeta(shortcut.category.placement_type).label}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PLACEMENT_TYPES).map(([key, value]) => {
                              const meta = getPlacementTypeMeta(value);
                              const IconComponent = getIconComponent(meta.icon as any);
                              return (
                                <SelectItem key={value} value={value} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="h-3.5 w-3.5" />
                                    {meta.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <CategorySelector
                          categories={categories}
                          value={shortcut.category_id}
                          onValueChange={(value) => {
                            optimisticUpdate(shortcut.id, { category_id: value }, 'Category updated');
                          }}
                          allowedPlacementTypes={shortcut.category?.placement_type ? [shortcut.category.placement_type] : undefined}
                          compact
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={shortcut.result_display || 'modal-full'}
                          onValueChange={(value: any) => {
                            optimisticUpdate(shortcut.id, { result_display: value }, 'Display updated');
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue>
                              {getResultDisplayMeta(shortcut.result_display).label}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(RESULT_DISPLAY_META).map(([key, value]) => (
                              <SelectItem key={key} value={key} className="text-xs">
                                {value.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={shortcut.auto_run ?? true}
                          onCheckedChange={(checked) => {
                            optimisticUpdate(shortcut.id, { auto_run: !!checked }, 'Auto-run updated');
                          }}
                          className="mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={shortcut.allow_chat ?? true}
                          onCheckedChange={(checked) => {
                            optimisticUpdate(shortcut.id, { allow_chat: !!checked }, 'Allow chat updated');
                          }}
                          className="mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={shortcut.show_variables ?? false}
                          onCheckedChange={(checked) => {
                            optimisticUpdate(shortcut.id, { show_variables: !!checked }, 'Show variables updated');
                          }}
                          className="mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={shortcut.apply_variables ?? true}
                          onCheckedChange={(checked) => {
                            optimisticUpdate(shortcut.id, { apply_variables: !!checked }, 'Apply variables updated');
                          }}
                          className="mx-auto"
                        />
                      </TableCell>
                      <TableCell>
                        {shortcut.keyboard_shortcut && (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {shortcut.keyboard_shortcut}
                          </code>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant={isConnected ? "ghost" : "ghost"}
                              size="sm"
                              className={`h-6 px-2 text-xs ${isConnected ? 'justify-start' : ''}`}
                            >
                              {isConnected ? (
                                <>
                                  <Link2 className="h-3 w-3 mr-1 flex-shrink-0 text-green-600" />
                                  <span className="font-medium truncate">
                                    {shortcut.builtin?.name || 'Connected'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3 mr-1 text-orange-600" />
                                  Connect
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isConnected ? (
                              <>
                                <DropdownMenuItem onClick={() => setViewingBuiltinId(shortcut.prompt_builtin_id!)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit Builtin
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSelectingBuiltinFor(shortcut)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Change Builtin
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    optimisticUpdate(shortcut.id, { prompt_builtin_id: null }, 'Builtin detached');
                                  }}
                                  className="text-destructive"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Detach Builtin
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => setSelectingBuiltinFor(shortcut)}>
                                  <Zap className="h-4 w-4 mr-2" />
                                  Select Existing Builtin
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSelectingPromptFor(shortcut)}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Create from Prompt
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                        <Switch
                          checked={shortcut.is_active ?? true}
                          onCheckedChange={(checked) => {
                            optimisticUpdate(
                              shortcut.id,
                              { is_active: checked },
                              `Shortcut ${checked ? 'activated' : 'deactivated'}`
                            );
                          }}
                        />
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
                                onClick={() => setDuplicatingShortcut(shortcut)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate</TooltipContent>
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
        <ShortcutEditModal
          isOpen={isEditDialogOpen && !!editingShortcut}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingShortcut(null);
          }}
          onSuccess={() => {
            setIsEditDialogOpen(false);
            setEditingShortcut(null);
            loadData();
          }}
          shortcut={editingShortcut}
          categories={categories}
          builtins={builtins}
          mode="standalone"
          models={models}
          availableTools={availableTools}
        />

        {/* Create Dialog */}
        <ShortcutEditModal
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSuccess={() => {
            setIsCreateDialogOpen(false);
            loadData();
          }}
          shortcut={null}
          categories={categories}
          builtins={builtins}
          mode="standalone"
          models={models}
          availableTools={availableTools}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmShortcut} onOpenChange={(open) => !open && setDeleteConfirmShortcut(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shortcut</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteConfirmShortcut?.label}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Duplicate Shortcut Modal */}
        {duplicatingShortcut && (
          <DuplicateShortcutModal
            isOpen={true}
            onClose={() => setDuplicatingShortcut(null)}
            onSuccess={async () => {
              setDuplicatingShortcut(null);
              await loadData();
            }}
            shortcut={duplicatingShortcut}
            categories={categories}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

