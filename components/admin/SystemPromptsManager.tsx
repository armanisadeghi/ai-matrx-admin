/**
 * SystemPromptsManager
 * 
 * Comprehensive admin interface for managing system prompts.
 * Features:
 * - Sidebar with placement types and categories
 * - View all placeholders and their mapping status
 * - Assign prompts to placeholders
 * - Manage functionalities
 * - Enable/disable prompts
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  LayoutGrid,
  Menu,
  Code2,
  Link as LinkIcon,
  Zap,
  Loader2,
} from 'lucide-react';
import { useAllSystemPrompts } from '@/hooks/useSystemPrompts';
import { SYSTEM_FUNCTIONALITIES } from '@/types/system-prompt-functionalities';
import type { SystemPromptDB } from '@/types/system-prompts-db';
import { cn } from '@/lib/utils';

type PlacementType = 'context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action';

interface CategoryGroup {
  [category: string]: SystemPromptDB[];
}

const PLACEMENT_ICONS = {
  'context-menu': Menu,
  'card': LayoutGrid,
  'button': Zap,
  'modal': Sparkles,
  'link': LinkIcon,
  'action': Code2,
};

export function SystemPromptsManager() {
  const { systemPrompts, loading, refetch } = useAllSystemPrompts();
  const [selectedPlacementType, setSelectedPlacementType] = useState<PlacementType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPromptDB | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'placeholders' | 'functionalities'>('placeholders');

  // Group prompts by placement type and category
  const groupedPrompts = useMemo(() => {
    const groups: Record<PlacementType, CategoryGroup> = {
      'context-menu': {},
      'card': {},
      'button': {},
      'modal': {},
      'link': {},
      'action': {},
    };

    systemPrompts.forEach((prompt) => {
      const type = prompt.placement_type;
      const category = prompt.category || 'uncategorized';

      if (!groups[type][category]) {
        groups[type][category] = [];
      }
      groups[type][category].push(prompt);
    });

    return groups;
  }, [systemPrompts]);

  // Get counts
  const counts = useMemo(() => {
    const result: Record<PlacementType | 'all', { total: number; active: number; placeholders: number }> = {
      all: { total: 0, active: 0, placeholders: 0 },
      'context-menu': { total: 0, active: 0, placeholders: 0 },
      'card': { total: 0, active: 0, placeholders: 0 },
      'button': { total: 0, active: 0, placeholders: 0 },
      'modal': { total: 0, active: 0, placeholders: 0 },
      'link': { total: 0, active: 0, placeholders: 0 },
      'action': { total: 0, active: 0, placeholders: 0 },
    };

    systemPrompts.forEach((prompt) => {
      const type = prompt.placement_type;
      const isPlaceholder = prompt.prompt_snapshot?.placeholder;

      result[type].total++;
      result.all.total++;

      if (prompt.is_active) {
        result[type].active++;
        result.all.active++;
      }

      if (isPlaceholder) {
        result[type].placeholders++;
        result.all.placeholders++;
      }
    });

    return result;
  }, [systemPrompts]);

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    let filtered = systemPrompts;

    if (selectedPlacementType !== 'all') {
      filtered = filtered.filter((p) => p.placement_type === selectedPlacementType);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.system_prompt_id.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.functionality_id?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [systemPrompts, selectedPlacementType, selectedCategory, searchQuery]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    systemPrompts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [systemPrompts]);

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

  const handleDelete = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this system prompt?')) return;

    try {
      const response = await fetch(`/api/system-prompts/${promptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Prompt deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete prompt');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* LEFT SIDEBAR */}
      <div className="w-64 flex-shrink-0 border-r bg-card">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* View Mode Toggle */}
            <div className="space-y-2">
              <Button
                variant={viewMode === 'placeholders' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setViewMode('placeholders')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Placeholders
              </Button>
              <Button
                variant={viewMode === 'functionalities' ? 'default' : 'outline'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setViewMode('functionalities')}
              >
                <Code2 className="h-4 w-4 mr-2" />
                Functionalities
              </Button>
            </div>

            <Separator />

            {viewMode === 'placeholders' && (
              <>
                {/* Placement Types */}
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold mb-2">Placement Type</h4>
                  <Button
                    variant={selectedPlacementType === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setSelectedPlacementType('all')}
                  >
                    <span>All</span>
                    <Badge variant="outline" className="ml-auto">
                      {counts.all.total}
                    </Badge>
                  </Button>

                  {(Object.keys(PLACEMENT_ICONS) as PlacementType[]).map((type) => {
                    const Icon = PLACEMENT_ICONS[type];
                    const count = counts[type];
                    if (count.total === 0) return null;

                    return (
                      <Button
                        key={type}
                        variant={selectedPlacementType === type ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-between"
                        onClick={() => {
                          setSelectedPlacementType(type);
                          setSelectedCategory('all');
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </span>
                        <Badge variant="outline" className="ml-auto">
                          {count.active}/{count.total}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>

                <Separator />

                {/* Categories */}
                {categories.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold mb-2">Category</h4>
                    <Button
                      variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory('all')}
                    >
                      All Categories
                    </Button>
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-6 space-y-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">System Prompts Manager</h2>
              <p className="text-sm text-muted-foreground">
                {viewMode === 'placeholders'
                  ? 'Manage system prompt placeholders and assignments'
                  : 'View functionality definitions and requirements'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {counts.all.active} Active
              </Badge>
              <Badge variant="secondary">
                {counts.all.placeholders} Placeholders
              </Badge>
            </div>
          </div>

          {viewMode === 'placeholders' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or functionality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {viewMode === 'placeholders' ? (
              <PlaceholdersView
                prompts={filteredPrompts}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                onSelect={setSelectedPrompt}
              />
            ) : (
              <FunctionalitiesView />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Placeholders View Component
function PlaceholdersView({
  prompts,
  onToggleActive,
  onDelete,
  onSelect,
}: {
  prompts: SystemPromptDB[];
  onToggleActive: (id: string, currentState: boolean) => void;
  onDelete: (id: string) => void;
  onSelect: (prompt: SystemPromptDB) => void;
}) {
  if (prompts.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-2">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No system prompts found</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {prompts.map((prompt) => {
        const isPlaceholder = prompt.prompt_snapshot?.placeholder;
        const Icon = PLACEMENT_ICONS[prompt.placement_type];
        const functionality = prompt.functionality_id
          ? SYSTEM_FUNCTIONALITIES[prompt.functionality_id]
          : null;

        return (
          <Card
            key={prompt.id}
            className={cn(
              'relative group hover:shadow-lg transition-shadow',
              isPlaceholder && 'opacity-75 border-dashed'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{prompt.name}</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {prompt.system_prompt_id}
                  </CardDescription>
                </div>
                {isPlaceholder ? (
                  <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-1">
                <Badge variant={prompt.is_active ? 'default' : 'secondary'} className="text-xs">
                  {prompt.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {prompt.placement_type}
                </Badge>
                {prompt.category && (
                  <Badge variant="outline" className="text-xs">
                    {prompt.category}
                  </Badge>
                )}
                {isPlaceholder && (
                  <Badge variant="destructive" className="text-xs">
                    Placeholder
                  </Badge>
                )}
              </div>

              {/* Functionality */}
              {functionality && (
                <div className="text-xs space-y-1">
                  <p className="font-medium">{functionality.name}</p>
                  <p className="text-muted-foreground">{functionality.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {functionality.requiredVariables.map((v) => (
                      <Badge key={v} variant="secondary" className="text-[10px] px-1 py-0">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {prompt.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {prompt.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-1 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onToggleActive(prompt.id, prompt.is_active)}
                >
                  {prompt.is_active ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelect(prompt)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(prompt.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Functionalities View Component
function FunctionalitiesView() {
  const functionalities = Object.values(SYSTEM_FUNCTIONALITIES);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              What are Functionalities?
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              Functionalities are hardcoded definitions in your codebase that define what variables
              a system prompt must have to work with specific UI components (cards, buttons, menus).
              You cannot create new functionalities here - they must be added to the code.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {functionalities.map((func) => (
          <Card key={func.id}>
            <CardHeader>
              <CardTitle className="text-base">{func.name}</CardTitle>
              <CardDescription>{func.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium mb-1">ID:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">{func.id}</code>
              </div>

              <div>
                <p className="text-xs font-medium mb-1">Required Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {func.requiredVariables.map((v) => (
                    <Badge key={v} variant="default" className="text-xs">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>

              {func.optionalVariables && func.optionalVariables.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Optional Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {func.optionalVariables.map((v) => (
                      <Badge key={v} variant="secondary" className="text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium mb-1">Placement Types:</p>
                <div className="flex flex-wrap gap-1">
                  {func.placementTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {func.examples && func.examples.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Examples:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 ml-4 list-disc">
                    {func.examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
