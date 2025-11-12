/**
 * SystemPromptsManager
 * 
 * Table-based admin interface for managing system prompts.
 * Features:
 * - Sortable/filterable table
 * - Assign prompts to placeholders
 * - Enable/disable prompts
 * - Clear connection status
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Search,
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
} from 'lucide-react';
import { useAllSystemPrompts } from '@/hooks/useSystemPrompts';
import { SYSTEM_FUNCTIONALITIES } from '@/types/system-prompt-functionalities';
import type { SystemPromptDB } from '@/types/system-prompts-db';
import { cn } from '@/lib/utils';

type PlacementType = 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action';
type SortField = 'name' | 'category' | 'functionality' | 'status' | 'placement' | 'connection';
type SortDirection = 'asc' | 'desc';

interface ColumnFilters {
  status: 'all' | 'connected' | 'placeholder';
  name: string;
  systemId: string;
  functionality: Set<string>;
  placement: Set<PlacementType>;
  category: Set<string>;
  sourcePrompt: 'all' | 'connected' | 'none';
  active: 'all' | 'active' | 'inactive';
}

const PLACEMENT_ICONS = {
  'context-menu': Menu,
  'card': LayoutGrid,
  'button': Zap,
  'modal': AlertCircle,
  'link': Link2,
  'action': Code2,
};

export function SystemPromptsManager() {
  const { systemPrompts, loading, refetch } = useAllSystemPrompts();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [assigningPrompt, setAssigningPrompt] = useState<SystemPromptDB | null>(null);
  
  // Column filters
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    status: 'all',
    name: '',
    systemId: '',
    functionality: new Set<string>(),
    placement: new Set<PlacementType>(),
    category: new Set<string>(),
    sourcePrompt: 'all',
    active: 'all',
  });

  // Get unique values for dropdown filters
  const uniqueValues = useMemo(() => {
    const functionalities = new Set<string>();
    const placements = new Set<PlacementType>();
    const categories = new Set<string>();

    systemPrompts.forEach((p) => {
      if (p.functionality_id) functionalities.add(p.functionality_id);
      if (p.placement_type) placements.add(p.placement_type);
      if (p.category) categories.add(p.category);
    });

    return {
      functionalities: Array.from(functionalities).sort(),
      placements: Array.from(placements).sort(),
      categories: Array.from(categories).sort(),
    };
  }, [systemPrompts]);

  // Filter and sort prompts
  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = [...systemPrompts];

    // Status filter (placeholder vs connected)
    if (columnFilters.status === 'connected') {
      filtered = filtered.filter((p) => !p.prompt_snapshot?.placeholder);
    } else if (columnFilters.status === 'placeholder') {
      filtered = filtered.filter((p) => p.prompt_snapshot?.placeholder);
    }

    // Name filter
    if (columnFilters.name) {
      const query = columnFilters.name.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
    }

    // System ID filter
    if (columnFilters.systemId) {
      const query = columnFilters.systemId.toLowerCase();
      filtered = filtered.filter((p) => p.system_prompt_id.toLowerCase().includes(query));
    }

    // Functionality filter
    if (columnFilters.functionality.size > 0) {
      filtered = filtered.filter((p) => 
        p.functionality_id && columnFilters.functionality.has(p.functionality_id)
      );
    }

    // Placement filter
    if (columnFilters.placement.size > 0) {
      filtered = filtered.filter((p) => columnFilters.placement.has(p.placement_type));
    }

    // Category filter
    if (columnFilters.category.size > 0) {
      filtered = filtered.filter((p) => p.category && columnFilters.category.has(p.category));
    }

    // Source prompt filter
    if (columnFilters.sourcePrompt === 'connected') {
      filtered = filtered.filter((p) => p.source_prompt_id);
    } else if (columnFilters.sourcePrompt === 'none') {
      filtered = filtered.filter((p) => !p.source_prompt_id);
    }

    // Active filter
    if (columnFilters.active === 'active') {
      filtered = filtered.filter((p) => p.is_active);
    } else if (columnFilters.active === 'inactive') {
      filtered = filtered.filter((p) => !p.is_active);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'functionality':
          aVal = a.functionality_id || '';
          bVal = b.functionality_id || '';
          break;
        case 'status':
          aVal = a.is_active ? 1 : 0;
          bVal = b.is_active ? 1 : 0;
          break;
        case 'placement':
          aVal = a.placement_type;
          bVal = b.placement_type;
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
  }, [systemPrompts, columnFilters, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => {
    const connected = systemPrompts.filter((p) => !p.prompt_snapshot?.placeholder).length;
    const placeholders = systemPrompts.filter((p) => p.prompt_snapshot?.placeholder).length;
    const active = systemPrompts.filter((p) => p.is_active).length;

    return { total: systemPrompts.length, connected, placeholders, active };
  }, [systemPrompts]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Helper functions for filter management
  const updateTextFilter = (field: 'name' | 'systemId', value: string) => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSetFilter = <T extends string>(field: 'functionality' | 'placement' | 'category', value: T) => {
    setColumnFilters((prev) => {
      const newSet = new Set(prev[field]);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return { ...prev, [field]: newSet };
    });
  };

  const updateDropdownFilter = (field: 'status' | 'sourcePrompt' | 'active', value: any) => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearAllFilters = () => {
    setColumnFilters({
      status: 'all',
      name: '',
      systemId: '',
      functionality: new Set<string>(),
      placement: new Set<PlacementType>(),
      category: new Set<string>(),
      sourcePrompt: 'all',
      active: 'all',
    });
  };

  const hasActiveFilters = 
    columnFilters.status !== 'all' ||
    columnFilters.name || 
    columnFilters.systemId || 
    columnFilters.functionality.size > 0 || 
    columnFilters.placement.size > 0 || 
    columnFilters.category.size > 0 || 
    columnFilters.sourcePrompt !== 'all' || 
    columnFilters.active !== 'all';

  const handleToggleActive = async (promptId: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/system-prompts/${promptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentState }),
      });

      if (!response.ok) throw new Error('Failed to update');

      toast.success(`Prompt ${!currentState ? 'activated' : 'deactivated'}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update prompt');
    }
  };

  const handleDelete = async (promptId: string, systemPromptId: string) => {
    if (!confirm(`Are you sure you want to delete "${systemPromptId}"?`)) return;

    try {
      const response = await fetch(`/api/system-prompts/${promptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

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

  if (loading) {
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
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Active filters:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {columnFilters.status !== 'all' && (
                <Badge variant="secondary">Status: {columnFilters.status}</Badge>
              )}
              {columnFilters.name && (
                <Badge variant="secondary">Name: {columnFilters.name}</Badge>
              )}
              {columnFilters.systemId && (
                <Badge variant="secondary">ID: {columnFilters.systemId}</Badge>
              )}
              {columnFilters.functionality.size > 0 && (
                <Badge variant="secondary">Functionality ({columnFilters.functionality.size})</Badge>
              )}
              {columnFilters.placement.size > 0 && (
                <Badge variant="secondary">Placement ({columnFilters.placement.size})</Badge>
              )}
              {columnFilters.category.size > 0 && (
                <Badge variant="secondary">Category ({columnFilters.category.size})</Badge>
              )}
              {columnFilters.sourcePrompt !== 'all' && (
                <Badge variant="secondary">Source: {columnFilters.sourcePrompt}</Badge>
              )}
              {columnFilters.active !== 'all' && (
                <Badge variant="secondary">Active: {columnFilters.active}</Badge>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <ScrollArea className="flex-1 pr-4">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {/* Status Column - Dropdown filter */}
                <TableHead className="min-w-[40px]">
                  <div className="space-y-1">
                    <span className="font-semibold">Status</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-full justify-between text-xs">
                          <span className="truncate">{
                            columnFilters.status === 'all' ? 'All' :
                            columnFilters.status === 'connected' ? 'Connected' : 'Placeholder'
                          }</span>
                          <Filter className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-16">
                        <DropdownMenuCheckboxItem
                          checked={columnFilters.status === 'all'}
                          onCheckedChange={() => updateDropdownFilter('status', 'all')}
                        >
                          All
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={columnFilters.status === 'connected'}
                          onCheckedChange={() => updateDropdownFilter('status', 'connected')}
                        >
                          Connected
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={columnFilters.status === 'placeholder'}
                          onCheckedChange={() => updateDropdownFilter('status', 'placeholder')}
                        >
                          Placeholder
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>
                
                {/* Name Column - Text filter + Sort */}
                <TableHead className="min-w-[180px]">
                  <div className="space-y-1">
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:text-primary"
                      onClick={() => handleSort('name')}
                    >
                      <span className="font-semibold">Name</span>
                      <ArrowUpDown className="h-3 w-3" />
                      <SortIcon field="name" />
                    </div>
                    <Input
                      placeholder="Filter..."
                      value={columnFilters.name}
                      onChange={(e) => updateTextFilter('name', e.target.value)}
                      className="h-7 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </TableHead>

                {/* System ID Column - Text filter */}
                <TableHead className="min-w-[160px]">
                  <div className="space-y-1">
                    <span className="font-semibold">System ID</span>
                    <Input
                      placeholder="Filter..."
                      value={columnFilters.systemId}
                      onChange={(e) => updateTextFilter('systemId', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </TableHead>

                {/* Functionality Column - Dropdown filter + Sort */}
                <TableHead className="min-w-[150px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span 
                        className="font-semibold cursor-pointer hover:text-primary"
                        onClick={() => handleSort('functionality')}
                      >
                        Functionality
                      </span>
                      <ArrowUpDown className="h-3 w-3 cursor-pointer" onClick={() => handleSort('functionality')} />
                      <SortIcon field="functionality" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-full justify-between text-xs">
                          <span className="truncate">
                            {columnFilters.functionality.size > 0 
                              ? `${columnFilters.functionality.size} selected`
                              : 'All'}
                          </span>
                          <Filter className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel className="flex items-center justify-between">
                          <span>Filter by Functionality</span>
                          {columnFilters.functionality.size > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setColumnFilters(prev => ({ ...prev, functionality: new Set() }))}
                              className="h-5 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                            >
                              Clear
                            </Button>
                          )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {uniqueValues.functionalities.map((func) => (
                          <DropdownMenuCheckboxItem
                            key={func}
                            checked={columnFilters.functionality.has(func)}
                            onCheckedChange={() => toggleSetFilter('functionality', func)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {SYSTEM_FUNCTIONALITIES[func]?.name || func}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>

                {/* Placement Column - Dropdown filter + Sort */}
                <TableHead className="min-w-[140px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span 
                        className="font-semibold cursor-pointer hover:text-primary"
                        onClick={() => handleSort('placement')}
                      >
                        Placement
                      </span>
                      <ArrowUpDown className="h-3 w-3 cursor-pointer" onClick={() => handleSort('placement')} />
                      <SortIcon field="placement" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-full justify-between text-xs">
                          <span className="truncate">
                            {columnFilters.placement.size > 0 
                              ? `${columnFilters.placement.size} selected`
                              : 'All'}
                          </span>
                          <Filter className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="flex items-center justify-between">
                          <span>Filter by Placement</span>
                          {columnFilters.placement.size > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setColumnFilters(prev => ({ ...prev, placement: new Set() }))}
                              className="h-5 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                            >
                              Clear
                            </Button>
                          )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {uniqueValues.placements.map((placement) => (
                          <DropdownMenuCheckboxItem
                            key={placement}
                            checked={columnFilters.placement.has(placement)}
                            onCheckedChange={() => toggleSetFilter('placement', placement)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {placement}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>

                {/* Category Column - Dropdown filter + Sort */}
                <TableHead className="min-w-[130px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span 
                        className="font-semibold cursor-pointer hover:text-primary"
                        onClick={() => handleSort('category')}
                      >
                        Category
                      </span>
                      <ArrowUpDown className="h-3 w-3 cursor-pointer" onClick={() => handleSort('category')} />
                      <SortIcon field="category" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-full justify-between text-xs">
                          <span className="truncate">
                            {columnFilters.category.size > 0 
                              ? `${columnFilters.category.size} selected`
                              : 'All'}
                          </span>
                          <Filter className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuLabel className="flex items-center justify-between">
                          <span>Filter by Category</span>
                          {columnFilters.category.size > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setColumnFilters(prev => ({ ...prev, category: new Set() }))}
                              className="h-5 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                            >
                              Clear
                            </Button>
                          )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {uniqueValues.categories.map((category) => (
                          <DropdownMenuCheckboxItem
                            key={category}
                            checked={columnFilters.category.has(category)}
                            onCheckedChange={() => toggleSetFilter('category', category)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {category}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>

                {/* Source Prompt Column - Dropdown filter + Sort */}
                <TableHead className="min-w-[140px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span 
                        className="font-semibold cursor-pointer hover:text-primary"
                        onClick={() => handleSort('connection')}
                      >
                        Source Prompt
                      </span>
                      <ArrowUpDown className="h-3 w-3 cursor-pointer" onClick={() => handleSort('connection')} />
                      <SortIcon field="connection" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-full justify-between text-xs">
                          <span className="truncate">{
                            columnFilters.sourcePrompt === 'all' ? 'All' :
                            columnFilters.sourcePrompt === 'connected' ? 'Connected' : 'None'
                          }</span>
                          <Filter className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={columnFilters.sourcePrompt === 'all'}
                          onCheckedChange={() => updateDropdownFilter('sourcePrompt', 'all')}
                        >
                          All
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={columnFilters.sourcePrompt === 'connected'}
                          onCheckedChange={() => updateDropdownFilter('sourcePrompt', 'connected')}
                        >
                          Connected Only
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={columnFilters.sourcePrompt === 'none'}
                          onCheckedChange={() => updateDropdownFilter('sourcePrompt', 'none')}
                        >
                          None
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>

                {/* Active Column - Dropdown filter + Sort */}
                <TableHead className="min-w-[110px]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span 
                        className="font-semibold cursor-pointer hover:text-primary"
                        onClick={() => handleSort('status')}
                      >
                        Active
                      </span>
                      <ArrowUpDown className="h-3 w-3 cursor-pointer" onClick={() => handleSort('status')} />
                      <SortIcon field="status" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 w-full justify-between text-xs">
                          <span className="truncate">{
                            columnFilters.active === 'all' ? 'All' :
                            columnFilters.active === 'active' ? 'Active' : 'Inactive'
                          }</span>
                          <Filter className="h-3 w-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={columnFilters.active === 'all'}
                          onCheckedChange={() => updateDropdownFilter('active', 'all')}
                        >
                          All
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={columnFilters.active === 'active'}
                          onCheckedChange={() => updateDropdownFilter('active', 'active')}
                        >
                          Active Only
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={columnFilters.active === 'inactive'}
                          onCheckedChange={() => updateDropdownFilter('active', 'inactive')}
                        >
                          Inactive Only
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableHead>

                {/* Actions Column - No filter/sort */}
                <TableHead className="text-right min-w-[140px] pr-4">
                  <div className="space-y-1">
                    <span className="font-semibold">Actions</span>
                    <div className="h-7" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedPrompts.map((prompt) => {
                const isPlaceholder = prompt.prompt_snapshot?.placeholder;
                const Icon = PLACEMENT_ICONS[prompt.placement_type];
                const functionality = prompt.functionality_id
                  ? SYSTEM_FUNCTIONALITIES[prompt.functionality_id]
                  : null;

                return (
                  <TableRow key={prompt.id} className={cn(isPlaceholder && 'opacity-60')}>
                    <TableCell>
                      {isPlaceholder ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="h-4 w-4 text-orange-600" />
                          </TooltipTrigger>
                          <TooltipContent>Placeholder - No prompt assigned</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </TooltipTrigger>
                          <TooltipContent>Connected to prompt</TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{prompt.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{prompt.system_prompt_id}</code>
                    </TableCell>
                    <TableCell>
                      {functionality ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm">{functionality.name}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold">{functionality.name}</p>
                            <p className="text-xs mt-1">{functionality.description}</p>
                            <p className="text-xs mt-2">Required: {functionality.requiredVariables.join(', ')}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        <span className="text-xs">{prompt.placement_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {prompt.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {prompt.source_prompt_id ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary" className="text-xs">
                              <Link2 className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>Source: {prompt.source_prompt_id}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Unlink className="h-3 w-3 mr-1" />
                          None
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={prompt.is_active ? 'default' : 'secondary'} className="text-xs">
                        {prompt.is_active ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isPlaceholder ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAssigningPrompt(prompt)}
                              >
                                <Link2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Assign a prompt</TooltipContent>
                          </Tooltip>
                        ) : (
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
                        )}
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info('Edit functionality coming soon')}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit settings</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(prompt.id, prompt.system_prompt_id)}
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
            </div>
          )}
        </ScrollArea>

        {/* Assign Prompt Modal */}
        {assigningPrompt && (
          <AssignPromptModal
            systemPrompt={assigningPrompt}
            onClose={() => setAssigningPrompt(null)}
            onSuccess={() => {
              setAssigningPrompt(null);
              refetch();
            }}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

// Assign Prompt Modal Component
function AssignPromptModal({
  systemPrompt,
  onClose,
  onSuccess,
}: {
  systemPrompt: SystemPromptDB;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const functionality = systemPrompt.functionality_id
    ? SYSTEM_FUNCTIONALITIES[systemPrompt.functionality_id]
    : null;

  // Fetch compatible prompts
  React.useEffect(() => {
    async function fetchPrompts() {
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('prompts')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;

        // Filter to only compatible prompts
        const compatible = (data || []).filter((prompt) => {
          if (!functionality) return true;
          
          // Extract variables from prompt
          const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
          const variables = new Set<string>();
          
          prompt.messages?.forEach((msg: any) => {
            if (msg.content) {
              let match;
              while ((match = variableRegex.exec(msg.content)) !== null) {
                variables.add(match[1]);
              }
            }
          });

          // Check if all required variables are present
          const hasAllRequired = functionality.requiredVariables.every((v) => variables.has(v));
          return hasAllRequired;
        });

        setPrompts(compatible);
      } catch (error) {
        console.error('Error fetching prompts:', error);
        toast.error('Failed to load prompts');
      } finally {
        setLoading(false);
      }
    }

    fetchPrompts();
  }, [functionality]);

  const handleAssign = async (promptId: string) => {
    setAssigning(true);
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      // Fetch the source prompt
      const { data: sourcePrompt, error: fetchError } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', promptId)
        .single();

      if (fetchError || !sourcePrompt) throw new Error('Failed to fetch prompt');

      // Extract variables
      const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
      const variables = new Set<string>();
      
      sourcePrompt.messages?.forEach((msg: any) => {
        if (msg.content) {
          let match;
          while ((match = variableRegex.exec(msg.content)) !== null) {
            variables.add(match[1]);
          }
        }
      });

      // Update the system prompt
      const { error: updateError } = await supabase
        .from('system_prompts')
        .update({
          source_prompt_id: promptId,
          prompt_snapshot: {
            name: sourcePrompt.name,
            description: sourcePrompt.description || '',
            messages: sourcePrompt.messages || [],
            settings: sourcePrompt.settings || {},
            variableDefaults: sourcePrompt.variable_defaults || [],
            variables: Array.from(variables),
            placeholder: false, // No longer a placeholder!
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', systemPrompt.id);

      if (updateError) throw updateError;

      toast.success('Prompt assigned successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error assigning prompt:', error);
      toast.error('Failed to assign prompt');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assign Prompt to "{systemPrompt.name}"</DialogTitle>
          <DialogDescription>
            {functionality
              ? `Select a prompt that has these variables: ${functionality.requiredVariables.join(', ')}`
              : 'Select a prompt to assign to this system prompt'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No compatible prompts found</p>
              <p className="text-sm text-muted-foreground">
                Create a prompt with variables: {functionality?.requiredVariables.join(', ')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {prompts.map((prompt) => (
                <Card key={prompt.id} className="p-4 hover:border-primary cursor-pointer transition-colors" onClick={() => !assigning && handleAssign(prompt.id)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{prompt.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {prompt.description || 'No description'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {/* Show variables */}
                        {(() => {
                          const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
                          const variables = new Set<string>();
                          
                          prompt.messages?.forEach((msg: any) => {
                            if (msg.content) {
                              let match;
                              while ((match = variableRegex.exec(msg.content)) !== null) {
                                variables.add(match[1]);
                              }
                            }
                          });

                          return Array.from(variables).map((v) => (
                            <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {v}
                            </Badge>
                          ));
                        })()}
                      </div>
                    </div>
                    <Button size="sm" disabled={assigning}>
                      {assigning ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Assign'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
