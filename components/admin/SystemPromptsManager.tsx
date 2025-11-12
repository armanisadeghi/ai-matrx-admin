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
} from 'lucide-react';
import { useAllSystemPrompts } from '@/hooks/useSystemPrompts';
import { SYSTEM_FUNCTIONALITIES } from '@/types/system-prompt-functionalities';
import type { SystemPromptDB } from '@/types/system-prompts-db';
import { cn } from '@/lib/utils';

type PlacementType = 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action';
type SortField = 'name' | 'category' | 'functionality' | 'status' | 'placement';
type SortDirection = 'asc' | 'desc';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'placeholder'>('all');
  const [placementFilter, setPlacementFilter] = useState<PlacementType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [assigningPrompt, setAssigningPrompt] = useState<SystemPromptDB | null>(null);

  // Filter and sort prompts
  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = [...systemPrompts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.system_prompt_id.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.functionality_id?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter === 'connected') {
      filtered = filtered.filter((p) => !p.prompt_snapshot?.placeholder);
    } else if (statusFilter === 'placeholder') {
      filtered = filtered.filter((p) => p.prompt_snapshot?.placeholder);
    }

    // Placement filter
    if (placementFilter !== 'all') {
      filtered = filtered.filter((p) => p.placement_type === placementFilter);
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
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [systemPrompts, searchQuery, statusFilter, placementFilter, sortField, sortDirection]);

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
        <div className="flex-shrink-0 p-6 border-b bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">System Prompts Manager</h2>
              <p className="text-sm text-muted-foreground">
                Manage system prompt assignments and configurations
              </p>
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.connected}</div>
                <div className="text-xs text-muted-foreground">Connected</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.placeholders}</div>
                <div className="text-xs text-muted-foreground">Placeholders</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, functionality, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="connected">Connected Only</option>
              <option value="placeholder">Placeholders Only</option>
            </select>

            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="card">Cards</option>
              <option value="context-menu">Context Menus</option>
              <option value="button">Buttons</option>
              <option value="modal">Modals</option>
              <option value="link">Links</option>
              <option value="action">Actions</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('name')}
                >
                  Name <SortIcon field="name" />
                </TableHead>
                <TableHead>System ID</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('functionality')}
                >
                  Functionality <SortIcon field="functionality" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('placement')}
                >
                  Placement <SortIcon field="placement" />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('category')}
                >
                  Category <SortIcon field="category" />
                </TableHead>
                <TableHead>Source Prompt</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50" 
                  onClick={() => handleSort('status')}
                >
                  Active <SortIcon field="status" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
