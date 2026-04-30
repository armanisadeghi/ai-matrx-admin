"use client";

/**
 * Data Stores management page (per-user surface).
 *
 * Two columns:
 *   left  — list of stores the caller can see (own + same-org), with a
 *           "+ New" form at the top
 *   right — detail of the selected store: header chips, member table
 *           with add/remove, edit + delete actions
 *
 * Auth: Supabase RLS gates everything. Reads return only stores the
 * caller can see; writes succeed only when auth.uid() matches the
 * row's created_by (or the caller's organization_id matches).
 *
 * Selection state is held in URL search params (?store_id=<uuid>) so
 * deep links work and a refresh keeps the right pane open.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  Database,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useDataStoreDetail,
  useDataStores,
  type EnrichedMember,
} from "@/features/data-stores/hooks/useDataStores";
import {
  DATA_STORE_KINDS,
  SOURCE_KINDS,
} from "@/features/data-stores/types-ext";
import type { DataStoreWithMemberCount } from "@/features/data-stores/types";

export function DataStoresPage() {
  const router = useRouter();
  const search = useSearchParams();
  const storeId = search?.get("store_id") ?? null;

  const list = useDataStores();
  const detail = useDataStoreDetail(storeId);

  const select = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(search?.toString() ?? "");
      if (id) params.set("store_id", id);
      else params.delete("store_id");
      const qs = params.toString();
      router.replace(`/rag/data-stores${qs ? `?${qs}` : ""}`);
    },
    [router, search],
  );

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-background">
      <aside className="w-80 border-r flex flex-col overflow-hidden shrink-0">
        <div className="px-3 py-2 border-b flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold flex-1">Data stores</h1>
          <span className="text-xs text-muted-foreground tabular-nums">
            {list.stores.length}
          </span>
        </div>
        <CreateStoreInline onCreated={(id) => select(id)} />
        <div className="flex-1 overflow-auto">
          {list.loading && list.stores.length === 0 && (
            <div className="px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          )}
          {list.error && (
            <div className="px-3 py-2 flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {list.error}
            </div>
          )}
          {!list.loading && list.stores.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              No data stores yet. Create your first one above.
            </div>
          )}
          {list.stores.map((s) => (
            <StoreListRow
              key={s.id}
              store={s}
              selected={s.id === storeId}
              onSelect={() => select(s.id)}
            />
          ))}
        </div>
      </aside>

      <section className="flex-1 overflow-hidden">
        {!storeId ? (
          <div className="m-6 rounded-md border bg-muted/20 p-6 text-sm text-muted-foreground max-w-2xl">
            <p className="font-medium text-foreground mb-2">
              What is a data store?
            </p>
            <p className="mb-2">
              A named, curated bucket of documents. Agents can search inside
              one with{" "}
              <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">
                rag_search_data_store(data_store_id, query)
              </code>
              . Bind any indexed PDF, note, code file, or library doc; the
              agent then sees only that bucket when it retrieves.
            </p>
            <p>
              Pick or create a store on the left to get started.
            </p>
          </div>
        ) : (
          <StoreDetailPanel
            storeId={storeId}
            detail={detail}
            onDeleted={() => {
              select(null);
              list.refresh();
            }}
          />
        )}
      </section>
    </div>
  );
}

function StoreListRow({
  store,
  selected,
  onSelect,
}: {
  store: DataStoreWithMemberCount;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-3 py-2 border-b border-border/50 hover:bg-muted/40",
        selected && "bg-muted/60",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium truncate flex-1">{store.name}</span>
        {!store.isActive && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
            archived
          </span>
        )}
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {store.memberCount}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground truncate">
        {(store.kind ?? "general") +
          (store.shortCode ? ` · ${store.shortCode}` : "")}
      </div>
      {store.description && (
        <div className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
          {store.description}
        </div>
      )}
    </button>
  );
}

function CreateStoreInline({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const list = useDataStores();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof DATA_STORE_KINDS)[number]>("general");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2 text-xs h-9 rounded-none border-b w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" /> New data store
      </Button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        setPending(true);
        setErr(null);
        const made = await list.createStore({
          name: trimmed,
          kind,
          description: description.trim() || undefined,
        });
        setPending(false);
        if (made) {
          setName("");
          setDescription("");
          setOpen(false);
          onCreated(made.id);
        } else {
          setErr(list.error ?? "Could not create data store");
        }
      }}
      className="border-b p-3 space-y-2 bg-muted/10"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (e.g. Yorba case)"
        className="h-8 text-xs"
        autoFocus
      />
      <select
        value={kind}
        onChange={(e) =>
          setKind(e.target.value as (typeof DATA_STORE_KINDS)[number])
        }
        className="w-full h-8 px-2 rounded border bg-background text-xs"
      >
        {DATA_STORE_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="h-8 text-xs"
      />
      <div className="flex items-center gap-1.5">
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={!name.trim() || pending}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setErr(null);
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {err && <div className="text-[10px] text-destructive">{err}</div>}
    </form>
  );
}

function StoreDetailPanel({
  storeId,
  detail,
  onDeleted,
}: {
  storeId: string;
  detail: ReturnType<typeof useDataStoreDetail>;
  onDeleted: () => void;
}) {
  void storeId;
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  if (detail.loading && !detail.store) {
    return (
      <div className="m-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (detail.error || !detail.store) {
    return (
      <div className="m-6 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />{" "}
        {detail.error ?? "Data store not found"}
      </div>
    );
  }
  const s = detail.store;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="border-b px-4 py-3 space-y-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">{s.name}</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground uppercase tracking-wide">
            {s.kind ?? "general"}
          </span>
          {!s.isActive && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
              archived
            </span>
          )}
          {s.organizationId && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-mono">
              org {s.organizationId.slice(0, 8)}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing((e) => !e)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={async () => {
                if (
                  !confirm(
                    `Permanently delete data store "${s.name}"? Members will be removed but the underlying documents are not affected.`,
                  )
                )
                  return;
                const ok = await detail.deleteStore();
                if (ok) onDeleted();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
        {s.description && (
          <p className="text-xs text-muted-foreground">{s.description}</p>
        )}
        <div className="text-[10px] text-muted-foreground font-mono select-all">
          {s.id}
        </div>
        {editing && (
          <EditStoreForm
            initial={{
              name: s.name,
              description: s.description ?? "",
              shortCode: s.shortCode ?? "",
              kind: (s.kind ?? "general") as (typeof DATA_STORE_KINDS)[number],
              isActive: s.isActive,
            }}
            onSave={async (patch) => {
              const ok = await detail.updateStore(patch);
              if (ok) setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        )}
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Members ({detail.members.length})
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdd((v) => !v)}
          >
            <Plus className="h-3.5 w-3.5" /> Bind document
          </Button>
        </div>

        {showAdd && (
          <AddMemberForm
            onAdd={async (input) => {
              const ok = await detail.addMember(input);
              if (ok) setShowAdd(false);
            }}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {detail.members.length === 0 ? (
          <div className="rounded-md border bg-muted/20 p-4 text-xs text-muted-foreground">
            No members yet. Bind a PDF, processed document, or library doc
            using the button above. Agents calling{" "}
            <code className="font-mono bg-muted px-1 py-0.5 rounded">
              rag_search_data_store({s.id.slice(0, 8)}…, query)
            </code>{" "}
            will return zero hits until at least one member is bound.
          </div>
        ) : (
          <MemberTable
            members={detail.members}
            onRemove={(m) => detail.removeMember(m.sourceKind, m.sourceId)}
          />
        )}
      </div>
    </div>
  );
}

function MemberTable({
  members,
  onRemove,
}: {
  members: EnrichedMember[];
  onRemove: (m: EnrichedMember) => unknown;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kind
            </th>
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Document
            </th>
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </th>
            <th className="px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Added
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((m) => (
            <tr key={`${m.sourceKind}/${m.sourceId}`} className="hover:bg-muted/20">
              <td className="px-3 py-1.5 text-xs">{m.sourceKind}</td>
              <td className="px-3 py-1.5">
                <div className="text-xs">{m.label ?? "—"}</div>
                <div className="font-mono text-[10px] text-muted-foreground select-all truncate">
                  {m.sourceId}
                </div>
              </td>
              <td className="px-3 py-1.5 text-xs text-muted-foreground">
                {m.notes ?? "—"}
              </td>
              <td className="px-3 py-1.5 text-[10px] text-muted-foreground tabular-nums">
                {new Date(m.addedAt).toLocaleString()}
              </td>
              <td className="px-3 py-1.5 text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive"
                  onClick={() => {
                    if (
                      confirm(
                        `Remove ${m.sourceKind}/${m.sourceId.slice(0, 8)}… from this store?`,
                      )
                    ) {
                      void onRemove(m);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddMemberForm({
  onAdd,
  onCancel,
}: {
  onAdd: (input: {
    sourceKind: string;
    sourceId: string;
    notes?: string;
  }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<(typeof SOURCE_KINDS)[number]>("cld_file");
  const [sourceId, setSourceId] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const id = sourceId.trim();
        if (!id) return;
        setPending(true);
        await onAdd({
          sourceKind: kind,
          sourceId: id,
          notes: notes.trim() || undefined,
        });
        setPending(false);
        setSourceId("");
        setNotes("");
      }}
      className="rounded-md border bg-muted/20 p-3 flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">source_kind</span>
        <select
          value={kind}
          onChange={(e) =>
            setKind(e.target.value as (typeof SOURCE_KINDS)[number])
          }
          className="h-8 px-2 rounded border bg-background text-xs"
        >
          {SOURCE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="flex-1 flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">source_id (UUID)</span>
        <Input
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          placeholder="e.g. 7bf8b4f1-…"
          className="h-8 text-xs font-mono"
        />
      </label>
      <label className="flex-1 flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">notes (optional)</span>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="why?"
          className="h-8 text-xs"
        />
      </label>
      <div className="flex items-center gap-1.5">
        <Button type="submit" size="sm" disabled={!sourceId.trim() || pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}

function EditStoreForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: {
    name: string;
    description: string;
    shortCode: string;
    kind: (typeof DATA_STORE_KINDS)[number];
    isActive: boolean;
  };
  onSave: (patch: {
    name?: string;
    description?: string | null;
    shortCode?: string | null;
    kind?: string | null;
    isActive?: boolean;
  }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [pending, setPending] = useState(false);
  const dirty = useMemo(() => {
    return (
      draft.name !== initial.name ||
      draft.description !== initial.description ||
      draft.shortCode !== initial.shortCode ||
      draft.kind !== initial.kind ||
      draft.isActive !== initial.isActive
    );
  }, [draft, initial]);

  return (
    <div className="rounded-md border bg-muted/20 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">name</span>
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="h-8 text-xs"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">kind</span>
        <select
          value={draft.kind}
          onChange={(e) =>
            setDraft({
              ...draft,
              kind: e.target.value as (typeof DATA_STORE_KINDS)[number],
            })
          }
          className="h-8 px-2 rounded border bg-background text-xs"
        >
          {DATA_STORE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs sm:col-span-2">
        <span className="text-muted-foreground">description</span>
        <Input
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className="h-8 text-xs"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">short_code</span>
        <Input
          value={draft.shortCode}
          onChange={(e) => setDraft({ ...draft, shortCode: e.target.value })}
          className="h-8 text-xs font-mono"
        />
      </label>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
        />
        <span>active</span>
      </label>
      <div className="sm:col-span-2 flex items-center gap-1.5 justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!dirty || pending}
          onClick={async () => {
            setPending(true);
            await onSave({
              name: draft.name !== initial.name ? draft.name : undefined,
              description:
                draft.description !== initial.description
                  ? draft.description || null
                  : undefined,
              shortCode:
                draft.shortCode !== initial.shortCode
                  ? draft.shortCode || null
                  : undefined,
              kind: draft.kind !== initial.kind ? draft.kind : undefined,
              isActive:
                draft.isActive !== initial.isActive ? draft.isActive : undefined,
            });
            setPending(false);
          }}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
