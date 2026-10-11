"use client";

/** One prompt block: name, text, optional linked skill or bound tool, variants, who uses it. */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, ConfirmDelete, Field, Select, Textarea } from "@ai-matrx/design-system/controls";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId, selectIsSuperAdminPerson } from "@/lib/redux/selectors/userSelectors";
import { selectActiveOrganizationId } from "@/features/scopes/redux/selectors/active-context";
import { toast } from "@/lib/toast";
import {
  agentsUsing,
  archiveBlock,
  createBlock,
  getBlock,
  listSkills,
  listToolNames,
  toolUpdatedAt,
  updateBlock,
  type SkillOption,
  type UsingAgent,
} from "../service";
import { invalidateBlocks } from "../blocksCache";
import { invalidateMissing } from "../agentBlocksStore";
import { BLOCK_LANE_LABEL, SYSTEM_ORG_ID, laneOf, mayBeStale, type BlockLane } from "../lanes";
import { isValidBlockName, toBlockName } from "../tokens";
import { VariantsEditor } from "./VariantsEditor";
import type { PromptBlockRow } from "../types";

const NONE = "__none__";

export function PromptBlockEditor({ blockId }: { blockId: string | "new" }) {
  const router = useRouter();
  const params = useSearchParams();
  const meId = useAppSelector(selectUserId);
  const orgId = useAppSelector(selectActiveOrganizationId);
  const isPlatformAdmin = useAppSelector(selectIsSuperAdminPerson);
  const isNew = blockId === "new";

  const [row, setRow] = useState<PromptBlockRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState(params.get("name") ?? "");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [level, setLevel] = useState<BlockLane>("mine");
  const [skill, setSkill] = useState<string>(NONE);
  const [tool, setTool] = useState<string>(NONE);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [toolChanged, setToolChanged] = useState<string | null>(null);
  const [users, setUsers] = useState<UsingAgent[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    void listSkills().then(setSkills);
    void listToolNames().then(setTools);
  }, []);

  useEffect(() => {
    if (isNew) return;
    getBlock(blockId)
      .then((r) => {
        if (!r) {
          setLoadError("This block was not found, or you cannot see it.");
          return;
        }
        setRow(r);
        setName(r.name);
        setLabel(r.label);
        setDescription(r.description ?? "");
        setContent(r.content);
        setSkill(r.source_kind === "skill" && r.source_ref ? r.source_ref : NONE);
        setTool(r.bound_tool ?? NONE);
        void agentsUsing(r.name).then(setUsers).catch(() => setUsers([]));
        if (r.bound_tool) void toolUpdatedAt(r.bound_tool).then(setToolChanged);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Could not load the block"));
  }, [blockId, isNew]);

  const lane: BlockLane = row ? laneOf(row, meId) : level;
  const readOnly = !isNew && lane === "system" && !isPlatformAdmin;
  const stale = row?.bound_tool ? mayBeStale(row.updated_at, toolChanged) : false;
  const nameError = useMemo(() => (name && !isValidBlockName(name) ? "Lowercase letters, digits, _ and -; starts with a letter" : null), [name]);

  const skillOptions = useMemo(
    () => [{ value: NONE, label: "No skill" }, ...skills.map((s) => ({ value: s.skill_id, label: s.label || s.skill_id }))],
    [skills],
  );
  const toolOptions = useMemo(() => [{ value: NONE, label: "No tool" }, ...tools.map((t) => ({ value: t, label: t }))], [tools]);

  const save = async () => {
    setBusy(true);
    try {
      const source = skill !== NONE ? { source_kind: "skill" as const, source_ref: skill } : { source_kind: "authored" as const, source_ref: null };
      const bound_tool = tool === NONE ? null : tool;
      if (isNew) {
        const home = level === "system" ? SYSTEM_ORG_ID : orgId;
        if (!home) throw new Error("Choose an organization first");
        const created = await createBlock({
          name,
          label: label || name,
          description: description || null,
          content,
          ...source,
          bound_tool,
          organization_id: home,
          visibility: level === "mine" ? "personal" : "internal",
        });
        invalidateBlocks();
        invalidateMissing();
        toast.success("Block created");
        router.replace(`/agents/prompt-blocks/${created.id}`);
      } else if (row) {
        const saved = await updateBlock(row.id, { label: label || row.name, description: description || null, content, ...source, bound_tool });
        setRow(saved);
        invalidateBlocks();
        invalidateMissing();
        toast.success("Saved. Agents using it pick this up on their next run.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!row) return;
    setBusy(true);
    try {
      await archiveBlock(row.id);
      invalidateBlocks();
      invalidateMissing();
      toast.success("Archived");
      router.push("/agents/prompt-blocks");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not archive");
    } finally {
      setBusy(false);
      setConfirmArchive(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-6 pt-[calc(var(--shell-header-h)+1rem)]">
        <p className="text-sm text-destructive">{loadError}</p>
        <Link href="/agents/prompt-blocks" className="text-sm text-primary">
          Back to blocks
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-textured">
      <RouteHeader
        left={
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/agents/prompt-blocks" className="text-sm text-muted-foreground hover:text-foreground">
              Prompt blocks
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="type-title truncate font-mono text-foreground">{isNew ? "New block" : (row?.name ?? "")}</h1>
            {!isNew && row && <Badge>{BLOCK_LANE_LABEL[lane]}</Badge>}
            {stale && (
              <Badge tone="warning" data-testid="prompt-block-stale">
                May be stale
              </Badge>
            )}
          </div>
        }
        right={
          !readOnly ? (
            <Button variant="primary" disabled={busy || (isNew && (!name || !!nameError))} onClick={save} data-testid="prompt-block-save">
              {isNew ? "Create" : "Save"}
            </Button>
          ) : undefined
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-[calc(var(--shell-header-h)+0.75rem)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {readOnly && <p className="text-xs text-muted-foreground">System blocks are edited by platform admins.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Name
              <Field
                aria-label="Name"
                data-testid="prompt-block-name"
                value={name}
                disabled={!isNew}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => isNew && !label && setLabel(name)}
                placeholder="research_rules"
              />
              {nameError && <span className="text-destructive">{nameError}</span>}
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Label
              <Field aria-label="Label" value={label} disabled={readOnly} onChange={(e) => setLabel(e.target.value)} onBlur={() => isNew && !name && setName(toBlockName(label))} />
            </label>
          </div>
          {isNew && (
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Level
              <Select
                aria-label="Level"
                value={level}
                onValueChange={(v) => setLevel(v as BlockLane)}
                options={[
                  { value: "mine", label: "Mine" },
                  { value: "organization", label: "Organization" },
                  ...(isPlatformAdmin ? [{ value: "system", label: "System" }] : []),
                ]}
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Description
            <Field aria-label="Description" value={description} disabled={readOnly} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Linked skill
              <Select aria-label="Linked skill" value={skill} disabled={readOnly} onValueChange={setSkill} options={skillOptions} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Bound tool
              <Select aria-label="Bound tool" value={tool} disabled={readOnly} onValueChange={setTool} options={toolOptions} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Text
            <Textarea aria-label="Text" data-testid="prompt-block-content" mono rows={12} value={content} disabled={readOnly} onChange={(e) => setContent(e.target.value)} />
          </label>
          {row && <VariantsEditor block={row} readOnly={readOnly} />}
          {row && (
            <section className="flex flex-col gap-2" aria-label="Used by" data-testid="prompt-block-used-by">
              <h2 className="text-sm font-semibold">Used by</h2>
              <p className="text-xs text-muted-foreground">An edit goes live in every agent below.</p>
              {users === null && <p className="text-xs text-muted-foreground">Loading</p>}
              {users?.length === 0 && <p className="text-xs text-muted-foreground">No agent declares this block.</p>}
              <ul className="flex flex-col gap-1">
                {(users ?? []).map((a) => (
                  <li key={a.id}>
                    <Link href={`/agents/${a.id}/build`} className="text-sm text-primary hover:underline">
                      {a.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {row && !readOnly && (
            <div>
              <Button variant="danger" onClick={() => setConfirmArchive(true)} data-testid="prompt-block-archive">
                Archive block
              </Button>
            </div>
          )}
        </div>
      </div>
      <ConfirmDelete
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive this block?"
        cost={`Agents declaring ${row?.name ?? "it"} are refused at run time until another block with this name exists.`}
        confirmLabel="Archive block"
        onConfirm={archive}
        busy={busy}
      />
    </div>
  );
}
