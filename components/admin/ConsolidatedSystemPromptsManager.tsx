/**
 * Consolidated System Prompts Manager
 * 
 * Unified interface for managing AI Tool Functionalities and their prompt connections.
 * 
 * Data Model:
 * - Functionality Config (system_prompt_functionality_configs) - The "what" (e.g., "explain-text")
 * - System Prompt (system_prompts) - The connection to an AI prompt (the "how")
 * - Category (system_prompt_categories) - Grouping for UI display
 * 
 * Each row represents a FUNCTIONALITY with:
 * - Core properties: name, description, icon, variables, placement types
 * - Category assignment
 * - Optional connection to an AI prompt
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  Link2,
  Unlink,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Menu,
  Code2,
  Zap,
  Filter,
  X,
  ArrowUpDown,
  ArrowLeftRight,
  Download,
  Save,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useFunctionalityConfigs } from '@/hooks/useFunctionalityConfigs';
import { useSystemPromptCategories } from '@/hooks/useSystemPromptCategories';
import { useAllSystemPrompts } from '@/hooks/useSystemPrompts';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { SelectPromptModal } from './SelectPromptModal';
import { UpdatePromptModal } from './UpdatePromptModal';

type PlacementType = 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action';
type SortField = 'name' | 'category' | 'status' | 'connection';
type SortDirection = 'asc' | 'desc';

const PLACEMENT_ICONS = {
  'context-menu': Menu,
  'card': LayoutGrid,
  'button': Zap,
  'modal': AlertCircle,
  'link': Link2,
  'action': Code2,
};

const ICON_OPTIONS = [
  'MessageCircleQuestion', 'RefreshCw', 'FileText', 'Languages', 'PenLine',
  'List', 'Search', 'Wrench', 'Code', 'Sparkles', 'CreditCard',
  'HelpCircle', 'Globe', 'Lightbulb', 'LayoutGrid', 'Menu', 'Zap',
];

interface FunctionalityWithPrompt {
  // From system_prompt_functionality_configs
  id: string;
  functionality_id: string;
  category_id: string;
  label: string;
  description: string | null;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
  required_variables: string[];
  optional_variables: string[];
  placement_types: string[];
  examples: string[];
  category?: {
    id: string;
    label: string;
    color: string;
    icon_name: string;
  };
  // Connected system prompt (if any)
  systemPrompt?: any;
}

export function ConsolidatedSystemPromptsManager() {
  const { configs, isLoading: loadingConfigs, error: configsError, refetch: refetchConfigs } = useFunctionalityConfigs({ 
    activeOnly: false, 
    includeCategory: true 
  });
  const { categories, isLoading: loadingCategories } = useSystemPromptCategories({ activeOnly: false });
  const { systemPrompts, loading: loadingPrompts, refetch: refetchPrompts } = useAllSystemPrompts();
  
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'unconnected'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [editingFunctionality, setEditingFunctionality] = useState<FunctionalityWithPrompt | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectingPromptFor, setSelectingPromptFor] = useState<{ functionality: FunctionalityWithPrompt; mode: 'select' | 'change' } | null>(null);
  const [updatingPrompt, setUpdatingPrompt] = useState<FunctionalityWithPrompt | null>(null);

  // Combine functionality configs with their system prompts
  const functionalitiesWithPrompts: FunctionalityWithPrompt[] = useMemo(() => {
    return configs.map(config => {
      // Find matching system prompt by functionality_id
      const systemPrompt = systemPrompts.find(sp => sp.functionality_id === config.functionality_id);
      return {
        ...config,
        systemPrompt
      };
    });
  }, [configs, systemPrompts]);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = [...functionalitiesWithPrompts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.label.toLowerCase().includes(query) ||
        f.functionality_id.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(f => f.category_id === categoryFilter);
    }

    // Status filter
    if (statusFilter === 'connected') {
      filtered = filtered.filter(f => f.systemPrompt && !f.systemPrompt.prompt_snapshot?.placeholder);
    } else if (statusFilter === 'unconnected') {
      filtered = filtered.filter(f => !f.systemPrompt || f.systemPrompt.prompt_snapshot?.placeholder);
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter(f => f.is_active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(f => !f.is_active);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
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
          aVal = (a.systemPrompt && !a.systemPrompt.prompt_snapshot?.placeholder) ? 1 : 0;
          bVal = (b.systemPrompt && !b.systemPrompt.prompt_snapshot?.placeholder) ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [functionalitiesWithPrompts, searchQuery, categoryFilter, statusFilter, activeFilter, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => {
    const total = functionalitiesWithPrompts.length;
    const connected = functionalitiesWithPrompts.filter(f => f.systemPrompt && !f.systemPrompt.prompt_snapshot?.placeholder).length;
    const active = functionalitiesWithPrompts.filter(f => f.is_active).length;
    
    return { total, connected, unconnected: total - connected, active };
  }, [functionalitiesWithPrompts]);

  const refetch = async () => {
    await Promise.all([refetchConfigs(), refetchPrompts()]);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (functionality: FunctionalityWithPrompt) => {
    setEditingFunctionality(functionality);
    setIsEditModalOpen(true);
  };

  const handleCreate = () => {
    setEditingFunctionality(null);
    setIsCreateModalOpen(true);
  };

  const handleToggleActive = async (functionalityId: string, currentState: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('system_prompt_functionality_configs')
        .update({ 
          is_active: !currentState,
          updated_at: new Date().toISOString()
        })
        .eq('id', functionalityId);

      if (error) throw error;

      toast.success(`Functionality ${!currentState ? 'activated' : 'deactivated'}`);
      await refetchConfigs();
    } catch (error) {
      toast.error('Failed to update functionality');
    }
  };

  const handleDelete = async (functionalityId: string, functionalityLabel: string) => {
    if (!confirm(`Are you sure you want to delete "${functionalityLabel}"? This will also remove any connected system prompts.`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('system_prompt_functionality_configs')
        .delete()
        .eq('id', functionalityId);

      if (error) throw error;

      toast.success('Functionality deleted');
      await refetch();
    } catch (error) {
      toast.error('Failed to delete functionality');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setActiveFilter('all');
  };

  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || activeFilter !== 'all';

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Sparkles;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    );
  };

  if (loadingConfigs || loadingPrompts) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl pl-2 font-bold">AI Tools Manager</h2>
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Functionality
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-2">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
                <div className="text-xs text-muted-foreground">Connected</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-2xl font-bold text-orange-600">{stats.unconnected}</div>
                <div className="text-xs text-muted-foreground">Unconnected</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search functionalities..."
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
                  <TableHead className="min-w-[200px]" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Name</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="name" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[150px]">Functionality ID</TableHead>
                  <TableHead className="min-w-[130px]" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1 cursor-pointer hover:text-primary">
                      <span className="font-semibold">Category</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="category" />
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[120px]">Placement</TableHead>
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
                  <TableHead className="text-right w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map((functionality) => {
                  const isConnected = functionality.systemPrompt && !functionality.systemPrompt.prompt_snapshot?.placeholder;
                  const Icon = getIcon(functionality.icon_name);

                  return (
                    <TableRow 
                      key={functionality.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(functionality)}
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
                          <Icon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{functionality.label}</div>
                            {functionality.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {functionality.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{functionality.functionality_id}</code>
                      </TableCell>
                      <TableCell>
                        {functionality.category && (
                          <Badge variant="outline">{functionality.category.label}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {functionality.placement_types.map(type => {
                            const PlacementIcon = PLACEMENT_ICONS[type as PlacementType] || Code2;
                            return (
                              <Tooltip key={type}>
                                <TooltipTrigger>
                                  <Badge variant="secondary" className="text-xs">
                                    <PlacementIcon className="h-3 w-3 mr-1" />
                                    {type}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>{type}</TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isConnected ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1 text-sm">
                                <Link2 className="h-3 w-3 text-green-600" />
                                <span className="font-medium line-clamp-1">
                                  {functionality.systemPrompt.prompt_snapshot?.name || 'Connected'}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-semibold">AI Prompt:</p>
                                <p className="text-xs">{functionality.systemPrompt.prompt_snapshot?.name}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setSelectingPromptFor({ functionality, mode: 'select' })}
                          >
                            <Unlink className="h-3 w-3 mr-1" />
                            Connect
                          </Button>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Badge variant={functionality.is_active ? 'default' : 'secondary'}>
                          {functionality.is_active ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {isConnected && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectingPromptFor({ functionality, mode: 'change' })}
                                  >
                                    <ArrowLeftRight className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Change AI Prompt</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setUpdatingPrompt(functionality)}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Update to Latest</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(functionality.id, functionality.is_active)}
                              >
                                {functionality.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {functionality.is_active ? 'Deactivate' : 'Activate'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(functionality.id, functionality.label)}
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
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No functionalities found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Edit/Create Modal - Full details */}
        <FunctionalityEditModal
          functionality={editingFunctionality}
          isOpen={isEditModalOpen || isCreateModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setIsCreateModalOpen(false);
            setEditingFunctionality(null);
          }}
          categories={categories}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setIsCreateModalOpen(false);
            setEditingFunctionality(null);
            refetch();
          }}
        />

        {/* Select/Change Prompt Modal */}
        {selectingPromptFor && selectingPromptFor.functionality.systemPrompt && (
          <SelectPromptModal
            isOpen={true}
            onClose={() => setSelectingPromptFor(null)}
            systemPrompt={selectingPromptFor.functionality.systemPrompt}
            mode={selectingPromptFor.mode}
            onSuccess={() => {
              setSelectingPromptFor(null);
              refetch();
            }}
          />
        )}

        {/* Update to Latest Modal */}
        {updatingPrompt && updatingPrompt.systemPrompt && (
          <UpdatePromptModal
            isOpen={true}
            onClose={() => setUpdatingPrompt(null)}
            systemPrompt={updatingPrompt.systemPrompt}
            onSuccess={() => {
              setUpdatingPrompt(null);
              refetch();
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// Full Edit Modal for Functionality
function FunctionalityEditModal({
  functionality,
  isOpen,
  onClose,
  categories,
  onSuccess,
}: {
  functionality: FunctionalityWithPrompt | null;
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    functionality_id: '',
    category_id: '',
    label: '',
    description: '',
    icon_name: 'Sparkles',
    sort_order: 1,
    is_active: true,
    required_variables: [] as string[],
    optional_variables: [] as string[],
    placement_types: [] as string[],
    examples: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when functionality changes
  React.useEffect(() => {
    if (functionality) {
      setForm({
        functionality_id: functionality.functionality_id,
        category_id: functionality.category_id,
        label: functionality.label,
        description: functionality.description || '',
        icon_name: functionality.icon_name,
        sort_order: functionality.sort_order,
        is_active: functionality.is_active,
        required_variables: functionality.required_variables || [],
        optional_variables: functionality.optional_variables || [],
        placement_types: functionality.placement_types || [],
        examples: functionality.examples || [],
      });
    } else {
      setForm({
        functionality_id: '',
        category_id: categories[0]?.id || '',
        label: '',
        description: '',
        icon_name: 'Sparkles',
        sort_order: 1,
        is_active: true,
        required_variables: [],
        optional_variables: [],
        placement_types: [],
        examples: [],
      });
    }
  }, [functionality, categories]);

  const handleSave = async () => {
    if (!form.functionality_id.trim() || !form.category_id || !form.label.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const supabase = createClient();

      if (functionality) {
        // Update existing
        const { error } = await supabase
          .from('system_prompt_functionality_configs')
          .update({
            category_id: form.category_id,
            label: form.label,
            description: form.description,
            icon_name: form.icon_name,
            sort_order: form.sort_order,
            is_active: form.is_active,
            required_variables: form.required_variables,
            optional_variables: form.optional_variables,
            placement_types: form.placement_types,
            examples: form.examples,
            updated_at: new Date().toISOString(),
          })
          .eq('id', functionality.id);

        if (error) throw error;
        toast.success('Functionality updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('system_prompt_functionality_configs')
          .insert({
            functionality_id: form.functionality_id,
            category_id: form.category_id,
            label: form.label,
            description: form.description,
            icon_name: form.icon_name,
            sort_order: form.sort_order,
            is_active: form.is_active,
            required_variables: form.required_variables,
            optional_variables: form.optional_variables,
            placement_types: form.placement_types,
            examples: form.examples,
          });

        if (error) throw error;
        toast.success('Functionality created successfully');
      }

      onSuccess();
    } catch (err) {
      console.error('[FunctionalityEditModal] Error saving:', err);
      toast.error(`Failed to save: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Sparkles;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {functionality ? 'Edit Functionality' : 'Create New Functionality'}
          </DialogTitle>
          <DialogDescription>
            {functionality 
              ? 'Modify the functionality properties. Changes will apply to all connected system prompts.' 
              : 'Create a new functionality definition. You can connect it to an AI prompt later.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="functionality_id">Functionality ID *</Label>
              <Input
                id="functionality_id"
                value={form.functionality_id}
                onChange={(e) => setForm({ ...form, functionality_id: e.target.value })}
                placeholder="e.g., explain-text"
                disabled={!!functionality}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (kebab-case)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={form.category_id}
                onValueChange={(value) => setForm({ ...form, category_id: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Display Name *</Label>
            <Input
              id="label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Explain Text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Explain selected text or concept in simple terms"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={form.icon_name}
                onValueChange={(value) => setForm({ ...form, icon_name: value })}
              >
                <SelectTrigger id="icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((iconName) => {
                    const Icon = getIcon(iconName);
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {iconName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="flex items-end space-x-2 pb-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Required Variables (comma-separated)</Label>
            <Input
              value={form.required_variables.join(', ')}
              onChange={(e) => setForm({ 
                ...form, 
                required_variables: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
              })}
              placeholder="content_to_explain, text"
            />
            <p className="text-xs text-muted-foreground">
              Variables that MUST be present in the prompt
            </p>
          </div>

          <div className="space-y-2">
            <Label>Optional Variables (comma-separated)</Label>
            <Input
              value={form.optional_variables.join(', ')}
              onChange={(e) => setForm({ 
                ...form, 
                optional_variables: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
              })}
              placeholder="context, audience_level"
            />
          </div>

          <div className="space-y-2">
            <Label>Placement Types (comma-separated)</Label>
            <Input
              value={form.placement_types.join(', ')}
              onChange={(e) => setForm({ 
                ...form, 
                placement_types: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
              })}
              placeholder="context-menu, card, button"
            />
            <p className="text-xs text-muted-foreground">
              Where this can appear: context-menu, card, button, modal, link, action
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {functionality ? 'Save Changes' : 'Create'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

