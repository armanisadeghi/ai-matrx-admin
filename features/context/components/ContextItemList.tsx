'use client';

import { useMemo } from 'react';
import { Search, Plus, SlidersHorizontal, LayoutGrid, Table2, Columns3, Bot, LayoutTemplate, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ContextItemCard } from './ContextItemCard';
import { ContextItemTable } from './ContextItemTable';
import { ContextKanban } from './ContextKanban';
import { ContextEmptyState } from './ContextEmptyState';
import { STATUS_PHASES, STATUS_CONFIG, FETCH_HINT_CONFIG, SENSITIVITY_CONFIG } from '../constants';
import { useContextManifest, useUpdateContextStatus, useDuplicateContextItem, useArchiveContextItem } from '../hooks/useContextItems';
import { useContextFilters } from '../hooks/useContextFilters';
import type { ContextItemManifest, ContextItemStatus, ContextItemView } from '../types';
import type { ScopeState } from '../hooks/useContextScope';
import Link from 'next/link';

type Props = {
  scope: ScopeState;
};

export function ContextItemList({ scope }: Props) {
  const { data: items, isLoading } = useContextManifest(scope.scopeType, scope.scopeId);
  const {
    filters, sort, view, setSearch, setStatuses, setView, clearFilters, hasActiveFilters,
  } = useContextFilters();
  const statusMutation = useUpdateContextStatus(scope.scopeType, scope.scopeId);
  const duplicateMutation = useDuplicateContextItem(scope.scopeType, scope.scopeId);
  const archiveMutation = useArchiveContextItem(scope.scopeType, scope.scopeId);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    let result = [...items];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(i =>
        i.display_name.toLowerCase().includes(q) ||
        i.key.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    if (filters.statuses.length > 0) {
      result = result.filter(i => filters.statuses.includes(i.status));
    }
    if (filters.categories.length > 0) {
      result = result.filter(i => i.category && filters.categories.includes(i.category));
    }
    if (filters.fetchHints.length > 0) {
      result = result.filter(i => filters.fetchHints.includes(i.fetch_hint));
    }
    if (filters.sensitivities.length > 0) {
      result = result.filter(i => filters.sensitivities.includes(i.sensitivity));
    }
    if (filters.hasValue === 'yes') {
      result = result.filter(i => i.char_count != null && i.char_count > 0);
    } else if (filters.hasValue === 'no') {
      result = result.filter(i => !i.char_count);
    }

    // Sort
    result.sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      switch (sort.field) {
        case 'display_name': return dir * a.display_name.localeCompare(b.display_name);
        case 'char_count': return dir * ((a.char_count ?? 0) - (b.char_count ?? 0));
        default: return 0;
      }
    });

    return result;
  }, [items, filters, sort]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const showBootstrap = items && items.length < 5;

  return (
    <div className="space-y-3">
      {/* Bootstrap banner */}
      {showBootstrap && items.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <LayoutTemplate className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Start fast — apply an industry template</p>
            <p className="text-[11px] text-muted-foreground">Create a set of recommended context items for this scope</p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 text-xs h-7" asChild>
            <Link href="/ssr/context/templates">Browse Templates</Link>
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={filters.search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <StatusFilterPopover
          selected={filters.statuses}
          onSelect={setStatuses}
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
            <X className="h-3 w-3" /> Clear
          </Button>
        )}

        <div className="flex-1" />

        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground">
          <Bot className="h-3.5 w-3.5" /> AI Health Check
          {/* TODO: Wire agent */}
        </Button>

        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <ViewToggle icon={LayoutGrid} active={view === 'cards'} onClick={() => setView('cards')} label="Cards" />
          <ViewToggle icon={Table2} active={view === 'table'} onClick={() => setView('table')} label="Table" />
          <ViewToggle icon={Columns3} active={view === 'kanban'} onClick={() => setView('kanban')} label="Kanban" />
        </div>

        <Button size="sm" className="h-8 text-xs gap-1" asChild>
          <Link href="/ssr/context/items/new">
            <Plus className="h-3.5 w-3.5" /> New Item
          </Link>
        </Button>
      </div>

      {/* Content */}
      {filteredItems.length === 0 ? (
        items && items.length === 0
          ? <ContextEmptyState variant="no-items" />
          : <ContextEmptyState variant="no-results" onClearFilters={clearFilters} />
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map(item => (
            <ContextItemCard
              key={item.id}
              item={item}
              onStatusChange={(id, s, n) => statusMutation.mutate({ itemId: id, status: s, statusNote: n })}
              onDuplicate={id => duplicateMutation.mutate(id)}
              onArchive={id => archiveMutation.mutate(id)}
            />
          ))}
        </div>
      ) : view === 'table' ? (
        <ContextItemTable
          items={filteredItems}
          onStatusChange={(id, s, n) => statusMutation.mutate({ itemId: id, status: s, statusNote: n })}
        />
      ) : (
        <ContextKanban
          items={filteredItems}
          onStatusChange={(id, s) => statusMutation.mutate({ itemId: id, status: s })}
        />
      )}
    </div>
  );
}

// ─── Toolbar sub-components ──────────────────────────────────────

function ViewToggle({ icon: Icon, active, onClick, label }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`h-8 w-8 flex items-center justify-center transition-colors ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
      onClick={onClick}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function StatusFilterPopover({ selected, onSelect }: { selected: ContextItemStatus[]; onSelect: (s: ContextItemStatus[]) => void }) {
  const toggle = (s: ContextItemStatus) => {
    onSelect(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
          <SlidersHorizontal className="h-3 w-3" />
          Status
          {selected.length > 0 && <Badge variant="secondary" className="h-4 text-[10px] px-1 ml-1">{selected.length}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {STATUS_PHASES.map(phase => (
          <div key={phase.key} className="mb-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{phase.label}</p>
            <div className="flex flex-wrap gap-1">
              {phase.statuses.map(s => {
                const config = STATUS_CONFIG[s];
                const isSelected = selected.includes(s);
                return (
                  <button
                    key={s}
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors border ${isSelected ? `${config.colorBg} ${config.colorText} border-current/20` : 'border-transparent hover:bg-muted text-muted-foreground'}`}
                    onClick={() => toggle(s)}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${config.colorDot}`} />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
