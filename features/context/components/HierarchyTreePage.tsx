'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2, FolderKanban, ListTodo, User,
  ChevronRight, ChevronDown, Plus, Search, Loader2,
  Pencil, Trash2, MoreHorizontal, Calendar, Tag,
  ArrowRightFromLine, Check, X, AlertCircle, Clock,
  FolderOpen, TreePine, MoveRight, RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useHierarchyTree, filterHierarchyTree, countDescendants,
  useUpdateEntity, useDeleteEntity,
} from '../hooks/useHierarchy';
import { HierarchyEntityModal } from './HierarchyEntityModal';
import { HierarchyMoveModal } from './HierarchyMoveModal';
import type { HierarchyNode, HierarchyNodeType } from '../service/hierarchyService';

// ─── Config ─────────────────────────────────────────────────────────

const ICONS: Record<HierarchyNodeType, React.ComponentType<{ className?: string }>> = {
  user: User,
  organization: Building2,
  project: FolderKanban,
  task: ListTodo,
};

const ACCENT_BG: Record<HierarchyNodeType, string> = {
  user: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  organization: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  project: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  task: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
};

const ACCENT_TEXT: Record<HierarchyNodeType, string> = {
  user: 'text-blue-500',
  organization: 'text-violet-500',
  project: 'text-amber-500',
  task: 'text-sky-500',
};

const TYPE_LABEL: Record<HierarchyNodeType, string> = {
  user: 'Personal',
  organization: 'Organization',
  project: 'Project',
  task: 'Task',
};

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-400', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-400', icon: ArrowRightFromLine },
  completed: { label: 'Completed', color: 'bg-green-400', icon: Check },
  blocked: { label: 'Blocked', color: 'bg-red-400', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-300', icon: X },
};

// ─── Filter options ─────────────────────────────────────────────────

type FilterType = 'all' | 'organization' | 'project' | 'task';

const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All', icon: TreePine },
  { value: 'organization', label: 'Organizations', icon: Building2 },
  { value: 'project', label: 'Projects', icon: FolderKanban },
  { value: 'task', label: 'Tasks', icon: ListTodo },
];

// ─── Main Component ─────────────────────────────────────────────────

export function HierarchyTreePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id') ?? null;
  const { data: tree, isLoading, isError, refetch } = useHierarchyTree();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['user-root']));
  const [createModal, setCreateModal] = useState<{
    type: HierarchyNodeType;
    parentId?: string;
    parentType?: HierarchyNodeType;
    orgId?: string;
  } | null>(null);
  const [editModal, setEditModal] = useState<HierarchyNode | null>(null);
  const [moveModal, setMoveModal] = useState<HierarchyNode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: HierarchyNodeType; id: string; name: string } | null>(null);

  const deleteMutation = useDeleteEntity();

  // Apply filters
  const filteredTree = useMemo(() => {
    let result = tree ?? [];
    if (search.trim()) {
      result = filterHierarchyTree(result, search);
    }
    return result;
  }, [tree, search]);

  // Find selected node
  const selectedNode = useMemo(() => {
    if (!selectedId || !tree) return null;
    return findNode(tree, selectedId);
  }, [tree, selectedId]);

  // Auto-expand when search is active
  const effectiveExpanded = search.trim()
    ? new Set(getAllIds(filteredTree))
    : expandedIds;

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (tree) setExpandedIds(new Set(getAllIds(tree)));
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set(['user-root']));
  }, []);

  const handleSelect = useCallback((node: HierarchyNode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('id', node.id);
    params.set('type', node.type);
    router.push(`/ssr/context/hierarchy?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-[380px] border-r border-border/50 p-4 space-y-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7" style={{ width: `${85 - i * 6}%`, marginLeft: `${i * 16}px` }} />
          ))}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <h3 className="text-sm font-medium mb-1">Failed to load hierarchy</h3>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* ─── Left: Tree ──────────────────────────────────────── */}
      <div className="w-full md:w-[380px] shrink-0 border-b md:border-b-0 md:border-r border-border/50 flex flex-col overflow-hidden bg-card/30 h-[40vh] md:h-full">
        {/* Toolbar */}
        <div className="p-2 border-b border-border/50 space-y-2">
          {/* Search + Refresh */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search everything..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => refetch()} title="Refresh Hierarchy">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Filter pills + expand/collapse */}
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = typeFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'
                  }`}
                  onClick={() => setTypeFilter(opt.value)}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {opt.label}
                </button>
              );
            })}
            <div className="flex-1" />
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground px-1"
              onClick={expandAll}
            >
              Expand
            </button>
            <span className="text-muted-foreground/30">|</span>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground px-1"
              onClick={collapseAll}
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Tree */}
        <ScrollArea className="flex-1">
          <div className="p-1.5">
            {filteredTree.map(node => (
              <TreeBranch
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                expandedIds={effectiveExpanded}
                typeFilter={typeFilter}
                onSelect={handleSelect}
                onToggle={toggleExpand}
                onCreateChild={(type, parentId, parentType, orgId) =>
                  setCreateModal({ type, parentId, parentType, orgId })
                }
                onDelete={(type, id, name) => setDeleteConfirm({ type, id, name })}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Bottom bar: quick actions */}
        <div className="p-2 border-t border-border/50 space-y-1">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 flex-1"
              onClick={() => setCreateModal({ type: 'organization' })}
            >
              <Building2 className="h-3 w-3" /> New Org
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 flex-1"
              onClick={() => setCreateModal({ type: 'project' })}
            >
              <FolderKanban className="h-3 w-3" /> New Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 flex-1"
              onClick={() => setCreateModal({ type: 'task' })}
            >
              <ListTodo className="h-3 w-3" /> New Task
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Right: Detail Panel ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {selectedNode ? (
          <DetailPanel
            node={selectedNode}
            onCreateChild={(type, orgId) => setCreateModal({
              type,
              parentId: selectedNode.id,
              parentType: selectedNode.type,
              orgId,
            })}
            onDelete={(type, id, name) => setDeleteConfirm({ type, id, name })}
            onEdit={(node) => setEditModal(node)}
            onMove={(node) => setMoveModal(node)}
          />
        ) : (
          <EmptyDetail treeStats={tree ? computeStats(tree) : null} />
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────── */}
      {createModal && (
        <HierarchyEntityModal
          entityType={createModal.type}
          mode="create"
          parentId={createModal.parentId}
          parentType={createModal.parentType}
          orgId={createModal.orgId}
          onClose={() => setCreateModal(null)}
        />
      )}

      {editModal && (
        <HierarchyEntityModal
          entityType={editModal.type}
          mode="edit"
          existingNode={editModal}
          onClose={() => setEditModal(null)}
        />
      )}

      {moveModal && tree && (
        <HierarchyMoveModal
          nodeToMove={moveModal}
          tree={tree}
          onClose={() => setMoveModal(null)}
        />
      )}

      {deleteConfirm && (
        <AlertDialog open onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm">Delete {TYPE_LABEL[deleteConfirm.type]}?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                {deleteConfirm.type === 'organization' && ' This will delete all projects and tasks within this organization.'}
                {deleteConfirm.type === 'project' && ' All tasks in this project will also be deleted.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="text-xs h-8 bg-destructive hover:bg-destructive/90"
                onClick={() => {
                  deleteMutation.mutate({ type: deleteConfirm.type, id: deleteConfirm.id });
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ─── Tree Branch (recursive) ────────────────────────────────────────

function TreeBranch({
  node,
  depth,
  selectedId,
  expandedIds,
  typeFilter,
  onSelect,
  onToggle,
  onCreateChild,
  onDelete,
}: {
  node: HierarchyNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  typeFilter: FilterType;
  onSelect: (node: HierarchyNode) => void;
  onToggle: (id: string) => void;
  onCreateChild: (type: HierarchyNodeType, parentId: string, parentType: HierarchyNodeType, orgId?: string) => void;
  onDelete: (type: HierarchyNodeType, id: string, name: string) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = node.id === selectedId;
  const hasChildren = node.children.length > 0;
  const isVirtual = !!node.meta?.virtual;

  // Type filter: skip nodes that don't match (but always show ancestors)
  if (typeFilter !== 'all' && node.type !== typeFilter && node.type !== 'user') {
    // But if any children match, we still show this node
    const hasMatchingChildren = node.children.some(c => hasDescendantOfType(c, typeFilter));
    if (!hasMatchingChildren) return null;
  }

  const childTypes: HierarchyNodeType[] =
    node.type === 'user' ? ['organization'] :
    node.type === 'organization' ? ['project'] :
    node.type === 'project' ? ['task'] :
    node.type === 'task' ? ['task'] : [];

  const orgId = node.type === 'organization' ? node.id : (node.meta?.organization_id as string | undefined);
  const Icon = ICONS[node.type];
  const accent = ACCENT_TEXT[node.type];
  const totalDescendants = countDescendants(node);

  return (
    <>
      <div
        className={`group flex items-center gap-1 rounded-md cursor-pointer transition-all ${
          isSelected
            ? 'bg-primary/10 ring-1 ring-primary/20'
            : 'hover:bg-muted/50'
        } ${isVirtual ? 'opacity-70 italic' : ''}`}
        style={{ paddingLeft: `${depth * 20 + 4}px`, paddingRight: '4px' }}
      >
        {/* Expand toggle */}
        <button
          className={`h-5 w-5 flex items-center justify-center shrink-0 rounded hover:bg-muted transition-colors ${
            hasChildren ? '' : 'invisible'
          }`}
          onClick={e => { e.stopPropagation(); onToggle(node.id); }}
        >
          {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </button>

        {/* Icon + Name */}
        <div
          className="flex items-center gap-1.5 flex-1 min-w-0 py-1"
          onClick={() => {
            onSelect(node);
            if (hasChildren || isVirtual) onToggle(node.id);
          }}
        >
          <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-primary' : accent}`} />
          <div className="flex-1 min-w-[80px] truncate">
            <span className={`text-xs ${isSelected ? 'font-semibold text-primary' : ''}`}>
              {node.name}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1.5 w-[6.5rem] shrink-0">
            {/* Count badge */}
            {hasChildren ? (
              <Badge variant="secondary" className="h-4 text-[9px] px-1 opacity-50 font-mono min-w-[1.25rem] justify-center">
                {totalDescendants}
              </Badge>
            ) : (
              <div className="min-w-[1.25rem]" />
            )}

            {node.type === 'task' ? (
              <div className="flex items-center gap-1.5 w-16 justify-end">
                {node.meta?.status && (
                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                    TASK_STATUS_CONFIG[node.meta.status as string]?.color ?? 'bg-gray-400'
                  }`} title={String(node.meta.status)} />
                )}
                {node.meta?.priority && node.meta.priority !== 'medium' && (
                  <Badge
                    variant={node.meta.priority === 'high' || node.meta.priority === 'urgent' ? 'destructive' : 'outline'}
                    className="h-3.5 text-[8px] px-1 shrink-0"
                  >
                    {(node.meta.priority as string).slice(0, 1).toUpperCase()}
                  </Badge>
                )}
              </div>
            ) : (
              <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded w-16 text-center truncate shrink-0 ${ACCENT_BG[node.type]}`}>
                {node.type}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!isVirtual && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {childTypes.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors"
                    onClick={e => e.stopPropagation()}
                    title="Add child"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 z-50">
                  {childTypes.map(cType => (
                    <DropdownMenuItem
                      key={cType}
                      onClick={e => {
                        e.stopPropagation();
                        onCreateChild(cType, node.id, node.type, orgId);
                      }}
                      className="text-xs flex items-center gap-2"
                    >
                      <Plus className="h-3 w-3" /> New {TYPE_LABEL[cType]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {node.type !== 'user' && (
              <button
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 transition-colors"
                onClick={e => { e.stopPropagation(); onDelete(node.type, node.id, node.name); }}
                title="Delete"
              >
                <Trash2 className="h-3 w-3 text-destructive/50" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              typeFilter={typeFilter}
              onSelect={onSelect}
              onToggle={onToggle}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Detail Panel ───────────────────────────────────────────────────

function DetailPanel({
  node,
  onCreateChild,
  onDelete,
  onEdit,
  onMove,
}: {
  node: HierarchyNode;
  onCreateChild: (type: HierarchyNodeType, orgId?: string) => void;
  onDelete: (type: HierarchyNodeType, id: string, name: string) => void;
  onEdit: (node: HierarchyNode) => void;
  onMove: (node: HierarchyNode) => void;
}) {
  const Icon = ICONS[node.type];
  const accent = ACCENT_BG[node.type];
  const isVirtual = !!node.meta?.virtual;
  const updateMutation = useUpdateEntity();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [editDescription, setEditDescription] = useState(node.description ?? '');

  const childTypes: HierarchyNodeType[] =
    node.type === 'user' ? ['organization'] :
    node.type === 'organization' ? ['project'] :
    node.type === 'project' ? ['task'] :
    node.type === 'task' ? ['task'] : [];

  const orgId = node.type === 'organization' ? node.id : (node.meta?.organization_id as string | undefined);

  const handleSave = () => {
    const nameField = node.type === 'task' ? 'title' : 'name';
    updateMutation.mutate({
      type: node.type,
      id: node.id,
      data: { [nameField]: editName, description: editDescription || null },
    }, {
      onSuccess: () => setIsEditing(false),
    });
  };

  // Reset edit state when node changes
  if (editName !== node.name && !isEditing) {
    setEditName(node.name);
    setEditDescription(node.description ?? '');
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="text-lg font-bold h-10"
                autoFocus
              />
              <Input
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Description..."
                className="text-sm h-8"
              />
              <div className="flex gap-2">
                <Button size="sm" className="text-xs h-7" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                  setIsEditing(false);
                  setEditName(node.name);
                  setEditDescription(node.description ?? '');
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold truncate">{node.name}</h1>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">{TYPE_LABEL[node.type]}</Badge>
              </div>
              {node.description && (
                <p className="text-sm text-muted-foreground mt-1">{node.description}</p>
              )}
            </>
          )}
        </div>
        {!isVirtual && node.type !== 'user' && !isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            {node.type !== 'organization' && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onMove(node)}>
                <MoveRight className="h-3 w-3" /> Move
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onEdit(node)}>
              <Pencil className="h-3 w-3" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => onDelete(node.type, node.id, node.name)}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Task-specific metadata */}
      {node.type === 'task' && node.meta && (
        <Card className="mb-4">
          <CardContent className="p-4 flex flex-wrap gap-4">
            {node.meta.status && (
              <MetaItem label="Status">
                <Badge className={`${TASK_STATUS_CONFIG[node.meta.status as string]?.color ?? 'bg-gray-400'} text-white text-[10px] h-5`}>
                  {TASK_STATUS_CONFIG[node.meta.status as string]?.label ?? String(node.meta.status)}
                </Badge>
              </MetaItem>
            )}
            {node.meta.priority && (
              <MetaItem label="Priority">
                <Badge variant="outline" className="text-[10px] h-5 capitalize">{node.meta.priority as string}</Badge>
              </MetaItem>
            )}
            {node.meta.due_date && (
              <MetaItem label="Due Date">
                <span className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(node.meta.due_date as string).toLocaleDateString()}</span>
              </MetaItem>
            )}
            {node.meta.created_at && (
              <MetaItem label="Created">
                <span className="text-xs">{new Date(node.meta.created_at as string).toLocaleDateString()}</span>
              </MetaItem>
            )}
          </CardContent>
        </Card>
      )}

      {/* Org/Project metadata */}
      {(node.type === 'organization' || node.type === 'project') && node.meta && (
        <Card className="mb-4">
          <CardContent className="p-4 flex flex-wrap gap-4">
            {node.meta.slug && (
              <MetaItem label="Slug">
                <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{node.meta.slug as string}</code>
              </MetaItem>
            )}
            {node.meta.role && (
              <MetaItem label="Your Role">
                <Badge variant="secondary" className="text-[10px] h-5 capitalize">{node.meta.role as string}</Badge>
              </MetaItem>
            )}
            {node.meta.is_personal && (
              <MetaItem label="Type">
                <Badge variant="secondary" className="text-[10px] h-5">Personal</Badge>
              </MetaItem>
            )}
            {node.meta.created_at && (
              <MetaItem label="Created">
                <span className="text-xs">{new Date(node.meta.created_at as string).toLocaleDateString()}</span>
              </MetaItem>
            )}
          </CardContent>
        </Card>
      )}

      {/* Children summary */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">
            Contents
            <span className="text-muted-foreground font-normal ml-1">({node.children.length} direct {node.children.length === 1 ? 'item' : 'items'})</span>
          </h2>
          {childTypes.length > 0 && !isVirtual && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> New...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 z-50">
                {childTypes.map((cType) => (
                  <DropdownMenuItem
                    key={cType}
                    onClick={() => onCreateChild(cType, orgId)}
                    className="text-xs flex items-center gap-2"
                  >
                    <Plus className="h-3 w-3" /> New {TYPE_LABEL[cType]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {node.children.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-border rounded-xl">
            <FolderOpen className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">
              {childTypes.length > 0 ? `No items yet` : 'No children'}
            </p>
            {childTypes.length > 0 && !isVirtual && (
              <div className="flex gap-2 justify-center mt-3">
                {childTypes.map((cType) => (
                  <Button key={cType} variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onCreateChild(cType, orgId)}>
                    <Plus className="h-3 w-3" /> Create {TYPE_LABEL[cType]}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {node.children.map(child => (
              <ChildRow key={child.id} node={child} />
            ))}
          </div>
        )}
      </div>

      {/* User-level full stats */}
      {node.type === 'user' && (
        <Card className="mt-6">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Hierarchy Overview</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              {(['organization', 'project', 'task'] as HierarchyNodeType[]).map(type => {
                const count = countOfType(node, type);
                const IconT = ICONS[type];
                return (
                  <div key={type} className="space-y-1">
                    <IconT className={`h-5 w-5 mx-auto ${ACCENT_TEXT[type]}`} />
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-[10px] text-muted-foreground">{TYPE_LABEL[type]}s</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Child Row (in detail panel) ────────────────────────────────────

function ChildRow({ node }: { node: HierarchyNode }) {
  const Icon = ICONS[node.type];
  const accent = ACCENT_TEXT[node.type];
  const router = useRouter();
  const descendants = countDescendants(node);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 cursor-pointer transition-all"
      onClick={() => router.push(`/ssr/context/hierarchy?id=${node.id}&type=${node.type}`, { scroll: false })}
    >
      <Icon className={`h-4 w-4 shrink-0 ${accent}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{node.name}</p>
        {node.description && (
          <p className="text-[10px] text-muted-foreground truncate">{node.description}</p>
        )}
      </div>
      {node.type === 'task' && node.meta?.status && (
        <Badge className={`${TASK_STATUS_CONFIG[node.meta.status as string]?.color ?? 'bg-gray-400'} text-white text-[9px] h-4`}>
          {TASK_STATUS_CONFIG[node.meta.status as string]?.label ?? String(node.meta.status)}
        </Badge>
      )}
      {descendants > 0 && (
        <Badge variant="secondary" className="h-4 text-[9px] px-1 font-mono">{descendants}</Badge>
      )}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </div>
  );
}

// ─── Empty Detail Panel ─────────────────────────────────────────────

function EmptyDetail({ treeStats }: { treeStats: { orgs: number; projects: number; tasks: number } | null }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-5">
          <TreePine className="h-8 w-8 text-primary/30" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Your Hierarchy</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Select any item in the tree to view and edit its details. This is your complete organizational structure from the top down.
        </p>
        {treeStats && (
          <div className="flex justify-center gap-6 text-center">
            <StatMini label="Organizations" value={treeStats.orgs} icon={Building2} />
            <StatMini label="Projects" value={treeStats.projects} icon={FolderKanban} />
            <StatMini label="Tasks" value={treeStats.tasks} icon={ListTodo} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatMini({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="space-y-1">
      <Icon className="h-4 w-4 mx-auto text-muted-foreground" />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

// ─── Utilities ──────────────────────────────────────────────────────

function getAllIds(nodes: HierarchyNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    ids.push(...getAllIds(node.children));
  }
  return ids;
}

function findNode(nodes: HierarchyNode[], id: string): HierarchyNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function hasDescendantOfType(node: HierarchyNode, type: string): boolean {
  if (node.type === type) return true;
  return node.children.some(c => hasDescendantOfType(c, type));
}

function countOfType(node: HierarchyNode, type: HierarchyNodeType): number {
  let count = node.type === type ? 1 : 0;
  for (const child of node.children) {
    count += countOfType(child, type);
  }
  return count;
}

function computeStats(tree: HierarchyNode[]): { orgs: number; projects: number; tasks: number } {
  const stats = { orgs: 0, projects: 0, tasks: 0 };
  function walk(node: HierarchyNode) {
    if (node.type === 'organization') stats.orgs++;
    if (node.type === 'project' && !node.meta?.virtual) stats.projects++;
    if (node.type === 'task' && !node.meta?.virtual) stats.tasks++;
    node.children.forEach(walk);
  }
  tree.forEach(walk);
  return stats;
}
