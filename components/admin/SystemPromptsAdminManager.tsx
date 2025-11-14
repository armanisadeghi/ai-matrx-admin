/**
 * System Prompts Admin Manager (NEW SCHEMA - FULL FEATURED)
 * 
 * Comprehensive admin interface for managing system prompts using the
 * consolidated schema (system_prompts_new + system_prompt_categories_new).
 * 
 * Features:
 * - Full CRUD operations with complete edit modal
 * - Connect/change AI prompts via SelectPromptModal
 * - Update to latest version via UpdatePromptModal
 * - Advanced filtering & sorting
 * - Category-based organization
 * - Status tracking (draft/published)
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
  Download,
  ArrowLeftRight,
  Save,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAllSystemPrompts } from '@/hooks/useSystemPrompts';
import { useSystemPromptCategories } from '@/hooks/useSystemPromptCategories';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import type { SystemPromptDB } from '@/types/system-prompts-db';
import { SelectPromptModal } from './SelectPromptModal';
import { UpdatePromptModal } from './UpdatePromptModal';

type PlacementType = 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action';
type SortField = 'label' | 'category' | 'status' | 'placement' | 'connection';
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
  'Bug', 'Wand2', 'Code2', 'Pencil', 'CheckCircle2'
];

interface ColumnFilters {
  status: 'all' | 'connected' | 'placeholder';
  label: string;
  promptId: string;
  placement: Set<PlacementType>;
  category: Set<string>;
  sourcePrompt: 'all' | 'connected' | 'none';
  active: 'all' | 'active' | 'inactive';
  publishStatus: 'all' | 'draft' | 'published' | 'archived';
}

export function SystemPromptsAdminManager() {
  const { systemPrompts, loading, refetch } = useAllSystemPrompts();
  const { categories, isLoading: loadingCategories } = useSystemPromptCategories({ activeOnly: false });
  
  const [sortField, setSortField] = useState<SortField>('label');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Filters (matching your original clean UX)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'placeholder'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [placementFilter, setPlacementFilter] = useState<string>('all');

  // Modals
  const [editingPrompt, setEditingPrompt] = useState<SystemPromptDB | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectingPromptFor, setSelectingPromptFor] = useState<{ prompt: SystemPromptDB; mode: 'select' | 'change' } | null>(null);
  const [updatingPrompt, setUpdatingPrompt] = useState<SystemPromptDB | null>(null);

  // Get unique values for dropdown filters
  const uniqueValues = useMemo(() => {
    const placements = new Set<PlacementType>();
    const categoryIds = new Set<string>();

    systemPrompts.forEach((p) => {
      if (p.category?.placement_type) placements.add(p.category.placement_type);
      if (p.category?.id) categoryIds.add(p.category.id);
    });

    return {
      placements: Array.from(placements).sort(),
      categories: categories.filter(cat => categoryIds.has(cat.id)),
    };
  }, [systemPrompts, categories]);

  // Filter and sort prompts (matching your original logic)
  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = [...systemPrompts];

    // Global search (matches your original: searches label, prompt_id, description)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.label.toLowerCase().includes(query) ||
        p.prompt_id.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category_id === categoryFilter);
    }

    // Status filter (connected vs placeholder)
    if (statusFilter === 'connected') {
      filtered = filtered.filter(p => !p.prompt_snapshot?.placeholder);
    } else if (statusFilter === 'placeholder') {
      filtered = filtered.filter(p => p.prompt_snapshot?.placeholder);
    }

    // Active filter
    if (activeFilter === 'active') {
      filtered = filtered.filter(p => p.is_active);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(p => !p.is_active);
    }

    // Placement filter
    if (placementFilter !== 'all') {
      filtered = filtered.filter(p => p.category?.placement_type === placementFilter);
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
        case 'placement':
          aVal = a.category?.placement_type || '';
          bVal = b.category?.placement_type || '';
          break;
        case 'connection':
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
  }, [systemPrompts, searchQuery, categoryFilter, statusFilter, activeFilter, placementFilter, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => {
    const connected = systemPrompts.filter((p) => !p.prompt_snapshot?.placeholder).length;
    const placeholders = systemPrompts.filter((p) => p.prompt_snapshot?.placeholder).length;
    const active = systemPrompts.filter((p) => p.is_active).length;
    const published = systemPrompts.filter((p) => p.status === 'published').length;

    return { total: systemPrompts.length, connected, placeholders, active, published };
  }, [systemPrompts]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (prompt: SystemPromptDB) => {
    setEditingPrompt(prompt);
    setIsEditModalOpen(true);
  };

  const handleCreate = () => {
    setEditingPrompt(null);
    setIsCreateModalOpen(true);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setActiveFilter('all');
    setPlacementFilter('all');
  };

  const hasActiveFilters = 
    searchQuery || 
    categoryFilter !== 'all' || 
    statusFilter !== 'all' || 
    activeFilter !== 'all' ||
    placementFilter !== 'all';

  const handleToggleActive = async (promptId: string, currentState: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('system_prompts_new')
        .update({ is_active: !currentState })
        .eq('id', promptId);

      if (error) throw error;

      toast.success(`Prompt ${!currentState ? 'activated' : 'deactivated'}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update prompt');
    }
  };

  const handleDelete = async (promptId: string, promptLabel: string) => {
    if (!confirm(`Are you sure you want to delete "${promptLabel}"?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('system_prompts_new')
        .delete()
        .eq('id', promptId);

      if (error) throw error;

      toast.success('System prompt deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete prompt');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline ml-1" />
    );
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return LucideIcons.Sparkles;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Sparkles;
  };

  if (loading || loadingCategories) {
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
              <h2 className="text-2xl pl-2 font-bold">System Prompts Manager</h2>
              <p className="text-sm text-muted-foreground pl-2">
                Manage AI prompts organized by categories and placement types
              </p>
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button onClick={clearAllFilters} variant="outline" size="sm">
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
                New Prompt
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4">
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
                <div className="text-2xl font-bold text-orange-600">{stats.placeholders}</div>
                <div className="text-xs text-muted-foreground">Placeholders</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-2">
                <div className="text-2xl font-bold text-purple-600">{stats.published}</div>
                <div className="text-xs text-muted-foreground">Published</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters (Your original clean design) */}
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search prompts..."
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
                <SelectValue placeholder="All Placements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Placements</SelectItem>
                {uniqueValues.placements.map(placement => (
                  <SelectItem key={placement} value={placement}>{placement}</SelectItem>
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
                <SelectItem value="placeholder">Placeholder</SelectItem>
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
                  <TableHead className="min-w-[150px]">Prompt ID</TableHead>
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
                  <TableHead className="text-right w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedPrompts.map((prompt) => {
                  const isConnected = prompt.source_prompt_id && !prompt.prompt_snapshot?.placeholder;
                  const Icon = getIcon(prompt.icon_name);
                  const PlacementIcon = prompt.category?.placement_type 
                    ? PLACEMENT_ICONS[prompt.category.placement_type] || Code2
                    : Code2;

                  return (
                    <TableRow 
                      key={prompt.id} 
                      className={cn("cursor-pointer hover:bg-muted/50", !isConnected && 'opacity-60')}
                      onClick={() => handleRowClick(prompt)}
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
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium">{prompt.label}</div>
                            {prompt.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {prompt.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{prompt.prompt_id}</code>
                      </TableCell>
                      <TableCell>
                        {prompt.category && (
                          <Badge variant="outline" className="text-xs">
                            {prompt.category.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {prompt.category?.placement_type && (
                          <div className="flex items-center gap-1">
                            <PlacementIcon className="h-3 w-3" />
                            <span className="text-xs">{prompt.category.placement_type}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {isConnected ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1 text-sm">
                                <Link2 className="h-3 w-3 text-green-600" />
                                <span className="font-medium line-clamp-1">
                                  {prompt.prompt_snapshot?.name || 'Connected'}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-semibold">AI Prompt:</p>
                                <p className="text-xs">{prompt.prompt_snapshot?.name}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setSelectingPromptFor({ prompt, mode: 'select' })}
                          >
                            <Unlink className="h-3 w-3 mr-1" />
                            Connect
                          </Button>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Badge variant={prompt.is_active ? 'default' : 'secondary'} className="text-xs">
                          {prompt.is_active ? 'Yes' : 'No'}
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
                                    onClick={() => setSelectingPromptFor({ prompt, mode: 'change' })}
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
                                    onClick={() => setUpdatingPrompt(prompt)}
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
                                onClick={() => handleToggleActive(prompt.id, prompt.is_active)}
                              >
                                {prompt.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {prompt.is_active ? 'Deactivate' : 'Activate'}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(prompt.id, prompt.label)}
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

            {filteredAndSortedPrompts.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No system prompts found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearAllFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Edit/Create Modal */}
        <SystemPromptEditModal
          systemPrompt={editingPrompt}
          isOpen={isEditModalOpen || isCreateModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setIsCreateModalOpen(false);
            setEditingPrompt(null);
          }}
          categories={categories}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setIsCreateModalOpen(false);
            setEditingPrompt(null);
            refetch();
          }}
        />

        {/* Select/Change Prompt Modal */}
        {selectingPromptFor && (
          <SelectPromptModal
            isOpen={true}
            onClose={() => setSelectingPromptFor(null)}
            systemPrompt={selectingPromptFor.prompt}
            mode={selectingPromptFor.mode}
            onSuccess={() => {
              setSelectingPromptFor(null);
              refetch();
            }}
          />
        )}

        {/* Update to Latest Modal */}
        {updatingPrompt && (
          <UpdatePromptModal
            isOpen={true}
            onClose={() => setUpdatingPrompt(null)}
            systemPrompt={updatingPrompt}
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

// Full Edit/Create Modal for System Prompts
function SystemPromptEditModal({
  systemPrompt,
  isOpen,
  onClose,
  categories,
  onSuccess,
}: {
  systemPrompt: SystemPromptDB | null;
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    prompt_id: '',
    category_id: '',
    label: '',
    description: '',
    icon_name: 'Sparkles',
    sort_order: 1,
    is_active: false, // Start inactive for safety
    is_featured: false,
    status: 'draft' as 'draft' | 'published' | 'archived',
    tags: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when systemPrompt changes
  React.useEffect(() => {
    if (systemPrompt) {
      setForm({
        prompt_id: systemPrompt.prompt_id,
        category_id: systemPrompt.category_id || '',
        label: systemPrompt.label,
        description: systemPrompt.description || '',
        icon_name: systemPrompt.icon_name || 'Sparkles',
        sort_order: systemPrompt.sort_order || 1,
        is_active: systemPrompt.is_active,
        is_featured: systemPrompt.is_featured || false,
        status: (systemPrompt.status as any) || 'draft',
        tags: systemPrompt.tags || [],
      });
    } else {
      setForm({
        prompt_id: '',
        category_id: categories[0]?.id || '',
        label: '',
        description: '',
        icon_name: 'Sparkles',
        sort_order: 1,
        is_active: false,
        is_featured: false,
        status: 'draft',
        tags: [],
      });
    }
  }, [systemPrompt, categories]);

  const handleSave = async () => {
    if (!form.prompt_id.trim() || !form.category_id || !form.label.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const supabase = createClient();

      if (systemPrompt) {
        // Update existing
        const { error } = await supabase
          .from('system_prompts_new')
          .update({
            category_id: form.category_id,
            label: form.label,
            description: form.description,
            icon_name: form.icon_name,
            sort_order: form.sort_order,
            is_active: form.is_active,
            is_featured: form.is_featured,
            status: form.status,
            tags: form.tags,
          })
          .eq('id', systemPrompt.id);

        if (error) throw error;
        toast.success('System prompt updated successfully');
      } else {
        // Create new (as placeholder - admin must connect prompt later)
        const { error } = await supabase
          .from('system_prompts_new')
          .insert({
            prompt_id: form.prompt_id,
            category_id: form.category_id,
            label: form.label,
            description: form.description,
            icon_name: form.icon_name,
            sort_order: form.sort_order,
            is_active: form.is_active,
            is_featured: form.is_featured,
            status: form.status,
            tags: form.tags,
            prompt_snapshot: { placeholder: true }, // Mark as placeholder
          });

        if (error) throw error;
        toast.success('System prompt created as placeholder. Connect an AI prompt to activate.');
      }

      onSuccess();
    } catch (err) {
      console.error('[SystemPromptEditModal] Error saving:', err);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {systemPrompt ? 'Edit System Prompt' : 'Create New System Prompt'}
          </DialogTitle>
          <DialogDescription>
            {systemPrompt 
              ? 'Modify the system prompt properties. Changes apply immediately.' 
              : 'Create a new system prompt placeholder. You can connect it to an AI prompt later.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prompt_id">Prompt ID *</Label>
              <Input
                id="prompt_id"
                value={form.prompt_id}
                onChange={(e) => setForm({ ...form, prompt_id: e.target.value })}
                placeholder="e.g., explain-text"
                disabled={!!systemPrompt}
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
            <Label htmlFor="label">Display Label *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value: any) => setForm({ ...form, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_featured"
                checked={form.is_featured}
                onCheckedChange={(checked) => setForm({ ...form, is_featured: checked })}
              />
              <Label htmlFor="is_featured">Featured</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={form.tags.join(', ')}
              onChange={(e) => setForm({ 
                ...form, 
                tags: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
              })}
              placeholder="text-manipulation, ai-tools"
            />
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
                {systemPrompt ? 'Save Changes' : 'Create'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
