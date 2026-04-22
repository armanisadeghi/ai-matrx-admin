"use client";

/**
 * ShortcutQuickCreateBody
 *
 * The body of the "Create Shortcut" window panel. Tabs are ordered so the
 * user sees the minimum they actually care about first, and everything
 * optional is pushed back.
 *
 *   1. Essentials  — category, icon, widget (displayMode), show-variables
 *                    switch + style. This is the single screen that can
 *                    produce a working shortcut.
 *   2. Variables   — per-variable default values + scope mappings. Only
 *                    relevant when the agent actually declares variables.
 *   3. Details     — name override (defaults to the agent name), description
 *                    (defaults to the agent description), version pinning
 *                    (pins to current by default; switch for "always latest").
 *   4. Advanced    — everything else: keyboard shortcut, enabled surfaces,
 *                    execution toggles (auto-run, allow chat, hide reasoning,
 *                    hide tool results).
 *   5. Link        — search the user's shortcuts and repoint a matching one
 *                    at this agent without creating a new row.
 *
 * Design goals
 * ─────────────
 * - The user should be able to submit from the Essentials tab with nothing
 *   else filled in. Label falls back to the agent's name, description to the
 *   agent's description, and `enabledFeatures` always includes "general" so
 *   the shortcut shows up everywhere by default.
 * - Every field in the Advanced tab has a real default applied on save — the
 *   user never has to visit that tab unless they want to change something.
 * - The admin-only "make this global" toggle lives in the footer so it's
 *   visible from every tab without taking up valuable essentials real-estate.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Info,
  Layers,
  Link2,
  Loader2,
  MonitorSmartphone,
  Plus,
  Search,
  Settings2,
  Sparkles,
  User as UserIcon,
  Variable,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import IconInputWithValidation from "@/components/official/icons/IconInputWithValidation.dynamic";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdmin } from "@/lib/redux/slices/userSlice";
import { fetchAgentExecutionMinimal } from "@/features/agents/redux/agent-definition/thunks";
import { selectAgentById } from "@/features/agents/redux/agent-definition/selectors";
import { DEFAULT_AGENT_EXECUTION_CONFIG } from "@/features/agents/types/agent-execution-config.types";
import type { ResultDisplayMode } from "@/features/agents/types/instance.types";
import {
  VARIABLE_PANEL_STYLE_OPTIONS,
  type VariablesPanelStyle,
} from "@/features/agents/components/inputs/variable-input-variations/variable-input-options";
import type { VariableDefinition } from "@/features/agents/types/agent-definition.types";
import type { ShortcutContext } from "@/features/agents/utils/shortcut-context-utils";
import type { AgentScope } from "../constants";
import {
  DEFAULT_AVAILABLE_SCOPES,
  PLACEMENT_TYPES,
  RESULT_DISPLAY_OPTIONS,
} from "../constants";
import { useAgentShortcuts } from "../hooks/useAgentShortcuts";
import { useAgentShortcutCrud } from "../hooks/useAgentShortcutCrud";
import type { ShortcutFormData } from "../types";
import { AgentVersionPicker } from "./AgentVersionPicker";
import { CopyableUuid } from "./CopyableUuid";
import { DefaultVariableValuesEditor } from "./DefaultVariableValuesEditor";
import {
  ScopeMappingEditor,
  type AgentVariableDefinition,
} from "./ScopeMappingEditor";
import { ShortcutContextsPicker } from "./ShortcutContextsPicker";

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

export type QuickCreateTab =
  | "essentials"
  | "variables"
  | "details"
  | "advanced"
  | "link";

export interface ShortcutQuickCreateBodyProps {
  /** Agent this shortcut will point at. Required — the window has no meaning otherwise. */
  agentId: string;
  /** Controlled active tab (mirrored into the WindowPanel's onCollectData). */
  activeTab: QuickCreateTab;
  onActiveTabChange: (tab: QuickCreateTab) => void;
  /** Fired after a successful create or link with the resulting shortcut id. */
  onSuccess?: (shortcutId: string) => void;
  /** Dismiss the surrounding window. */
  onClose: () => void;
}

// ───────────────────────────────────────────────────────────────────────────
// Constants
// ───────────────────────────────────────────────────────────────────────────

const DEFAULT_ICON = "Sparkles";
const DEFAULT_SURFACE: ShortcutContext = "general";
const FALLBACK_CATEGORY_LABEL = "My Shortcuts";
const FALLBACK_SHORTCUT_LABEL = "Untitled shortcut";

// ───────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────

export function ShortcutQuickCreateBody({
  agentId,
  activeTab,
  onActiveTabChange,
  onSuccess,
  onClose,
}: ShortcutQuickCreateBodyProps) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const isAdmin = useAppSelector(selectIsAdmin);
  const agent = useAppSelector((s) => selectAgentById(s, agentId));

  // Fire the idempotent execution-minimal thunk so variable definitions are
  // available in the Variables tab. Failure just hides the variable editors.
  useEffect(() => {
    dispatch(fetchAgentExecutionMinimal(agentId)).catch(() => {
      /* intentionally swallowed — variables are optional */
    });
  }, [dispatch, agentId]);

  // ── Scope ────────────────────────────────────────────────────────────────
  // "user" is the universal default. Admins see a footer toggle that flips to
  // "global". Categories re-fetch when scope changes because they're scoped too.
  const [scope, setScope] = useState<AgentScope>("user");

  const { shortcuts, categories } = useAgentShortcuts({
    scope,
    scopeId: undefined,
    autoFetch: true,
  });
  const crud = useAgentShortcutCrud({ scope, scopeId: undefined });

  // ── Identity / display ───────────────────────────────────────────────────
  const [label, setLabel] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [iconName, setIconName] = useState<string>(DEFAULT_ICON);
  const [keyboardShortcut, setKeyboardShortcut] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [enabledFeatures, setEnabledFeatures] = useState<ShortcutContext[]>([
    DEFAULT_SURFACE,
  ]);

  // ── Version ──────────────────────────────────────────────────────────────
  // Pin to current by default — never "use latest" unless the user opts in.
  const [useLatest, setUseLatest] = useState<boolean>(false);
  const [agentVersionId, setAgentVersionId] = useState<string | null>(null);

  // ── Execution config (every field has a default) ─────────────────────────
  const [displayMode, setDisplayMode] = useState<ResultDisplayMode>(
    DEFAULT_AGENT_EXECUTION_CONFIG.displayMode,
  );
  const [showVariablePanel, setShowVariablePanel] = useState<boolean>(
    DEFAULT_AGENT_EXECUTION_CONFIG.showVariablePanel,
  );
  const [variablesPanelStyle, setVariablesPanelStyle] =
    useState<VariablesPanelStyle>(
      DEFAULT_AGENT_EXECUTION_CONFIG.variablesPanelStyle,
    );
  const [autoRun, setAutoRun] = useState<boolean>(
    DEFAULT_AGENT_EXECUTION_CONFIG.autoRun,
  );
  const [allowChat, setAllowChat] = useState<boolean>(
    DEFAULT_AGENT_EXECUTION_CONFIG.allowChat,
  );
  const [hideReasoning, setHideReasoning] = useState<boolean>(
    DEFAULT_AGENT_EXECUTION_CONFIG.hideReasoning,
  );
  const [hideToolResults, setHideToolResults] = useState<boolean>(
    DEFAULT_AGENT_EXECUTION_CONFIG.hideToolResults,
  );

  // ── Variables (defaults + scope mappings) ────────────────────────────────
  const [defaultVariables, setDefaultVariables] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [scopeMappings, setScopeMappings] = useState<Record<string, string>>(
    {},
  );
  const [availableScopes, setAvailableScopes] = useState<string[]>(
    DEFAULT_AVAILABLE_SCOPES,
  );

  // ── Link-existing tab state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExistingId, setSelectedExistingId] = useState<string | null>(
    null,
  );
  const [showOnlyUnlinked, setShowOnlyUnlinked] = useState(true);

  // ── Save state ───────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed label and description from the agent exactly once per agent, so the
  // user can still edit them without us trampling their typing when the agent
  // record refreshes.
  const seededForAgent = useRef<string | null>(null);
  useEffect(() => {
    if (!agent?.name) return;
    if (seededForAgent.current === agentId) return;
    setLabel(agent.name);
    setDescription(agent.description ?? "");
    seededForAgent.current = agentId;
  }, [agent?.name, agent?.description, agentId]);

  // Auto-select the first available category once the list loads. If the user
  // already picked one explicitly we don't override.
  useEffect(() => {
    if (categoryId) return;
    if (categories.length > 0) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  // Changing scope invalidates the category selection (categories are
  // scope-scoped too) and any selected "link existing" target.
  useEffect(() => {
    setCategoryId("");
    setSelectedExistingId(null);
  }, [scope]);

  const agentVariableDefs: VariableDefinition[] = useMemo(
    () => agent?.variableDefinitions ?? [],
    [agent?.variableDefinitions],
  );

  const variableDefsForScopeMapping = useMemo<AgentVariableDefinition[]>(
    () =>
      agentVariableDefs.map((d) => ({
        name: d.name,
        default_value: d.defaultValue,
        description: d.helpText ?? null,
      })),
    [agentVariableDefs],
  );

  const filteredExisting = useMemo(() => {
    let out = showOnlyUnlinked
      ? shortcuts.filter((s) => !s.agentId)
      : shortcuts;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [shortcuts, showOnlyUnlinked, searchQuery]);

  // ── Save handlers ────────────────────────────────────────────────────────

  /**
   * Ensure we have a category id to attach the new shortcut to. If the user's
   * scope has no categories yet we create a simple "My Shortcuts" one on the
   * fly so the Essentials tab doesn't dead-end.
   */
  async function ensureCategoryId(): Promise<string> {
    if (categoryId) return categoryId;
    if (categories.length > 0) return categories[0].id;
    const newId = await crud.createCategory({
      label: FALLBACK_CATEGORY_LABEL,
      placementType: PLACEMENT_TYPES.AI_ACTION,
      parentCategoryId: null,
      description: "",
      iconName: DEFAULT_ICON,
      color: "#6366f1",
      sortOrder: 0,
      isActive: true,
      enabledFeatures: [],
      metadata: {},
    });
    setCategoryId(newId);
    return newId;
  }

  async function handleCreate() {
    setIsSaving(true);
    setError(null);
    try {
      const resolvedCategoryId = await ensureCategoryId();

      // Always ship at least the default surface so the shortcut is visible
      // somewhere. If the user explicitly cleared the picker we interpret
      // that as "I didn't mean to scope this" and fall back to general.
      const finalSurfaces: ShortcutContext[] =
        enabledFeatures.length > 0 ? enabledFeatures : [DEFAULT_SURFACE];

      const finalLabel =
        label.trim() || agent?.name?.trim() || FALLBACK_SHORTCUT_LABEL;

      const payload: ShortcutFormData = {
        // ── Identity ───────────────────────────────────────────────────
        categoryId: resolvedCategoryId,
        label: finalLabel,
        description: description.trim() || null,
        iconName: iconName.trim() || DEFAULT_ICON,
        keyboardShortcut: keyboardShortcut.trim() || null,
        sortOrder: 0,
        // ── Agent reference ────────────────────────────────────────────
        agentId,
        agentVersionId: useLatest ? null : agentVersionId,
        useLatest,
        // ── Surfaces & scope routing ───────────────────────────────────
        enabledFeatures: finalSurfaces,
        scopeMappings:
          Object.keys(scopeMappings).length > 0 ? scopeMappings : null,
        contextMappings: null,
        // ── AgentExecutionConfig (defaults first, then explicit overrides) ─
        ...DEFAULT_AGENT_EXECUTION_CONFIG,
        displayMode,
        showVariablePanel,
        variablesPanelStyle,
        autoRun,
        allowChat,
        hideReasoning,
        hideToolResults,
        defaultVariables,
        // ── Status ─────────────────────────────────────────────────────
        isActive: true,
        // Scope wrapper fills userId / organizationId / projectId / taskId
        userId: null,
        organizationId: null,
        projectId: null,
        taskId: null,
      };

      const newId = await crud.createShortcut(payload);
      toast({
        title: "Shortcut created",
        description:
          scope === "global"
            ? `"${payload.label}" is now available globally.`
            : `"${payload.label}" added to your shortcuts.`,
      });
      onSuccess?.(newId);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create shortcut",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLinkExisting() {
    if (!selectedExistingId) {
      setError("Select a shortcut to link");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await crud.updateShortcut(selectedExistingId, {
        agentId,
        agentVersionId: useLatest ? null : agentVersionId,
        useLatest,
        scopeMappings:
          Object.keys(scopeMappings).length > 0 ? scopeMappings : null,
      });
      toast({
        title: "Linked",
        description: "Shortcut now points at this agent.",
      });
      onSuccess?.(selectedExistingId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link shortcut");
    } finally {
      setIsSaving(false);
    }
  }

  const primaryAction =
    activeTab === "link" ? handleLinkExisting : handleCreate;
  const primaryLabel =
    activeTab === "link" ? "Link shortcut" : "Create shortcut";
  const primaryDisabled =
    isSaving || (activeTab === "link" && !selectedExistingId);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Agent header — always visible, keeps context stable ───────────── */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-medium">
              Shortcut for agent
            </div>
            <div className="text-sm font-semibold text-foreground truncate mt-0.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              {agent?.name ?? "Loading…"}
            </div>
            {agent?.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {agent.description}
              </p>
            )}
          </div>
          <div className="shrink-0 pt-0.5">
            <CopyableUuid value={agentId} label="id" />
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => onActiveTabChange(v as QuickCreateTab)}
        className="flex-1 min-h-0 flex flex-col"
      >
        <div className="px-3 pt-3 shrink-0">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="essentials" className="text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Essentials
            </TabsTrigger>
            <TabsTrigger value="variables" className="text-xs gap-1.5">
              <Variable className="h-3.5 w-3.5" />
              Variables
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs gap-1.5">
              <Settings2 className="h-3.5 w-3.5" />
              Advanced
            </TabsTrigger>
            <TabsTrigger value="link" className="text-xs gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Link
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Essentials ─────────────────────────────────────────────────── */}
        <TabsContent value="essentials" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="px-4 py-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="qc-category" className="text-sm">
                  Category
                </Label>
                <Select
                  value={categoryId || undefined}
                  onValueChange={setCategoryId}
                  disabled={isSaving}
                >
                  <SelectTrigger id="qc-category" className="h-9">
                    <SelectValue
                      placeholder={
                        categories.length === 0
                          ? `Will create "${FALLBACK_CATEGORY_LABEL}"`
                          : "Choose a category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    First shortcut? We&apos;ll create a{" "}
                    <span className="font-medium">
                      {FALLBACK_CATEGORY_LABEL}
                    </span>{" "}
                    category for you automatically.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qc-icon" className="text-sm">
                  Icon
                </Label>
                <IconInputWithValidation
                  id="qc-icon"
                  value={iconName}
                  onChange={(value) => setIconName(value || DEFAULT_ICON)}
                  placeholder="e.g. Sparkles"
                  className="h-9 text-[16px]"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qc-display-mode" className="text-sm">
                  Widget
                </Label>
                <Select
                  value={displayMode}
                  onValueChange={(v) => setDisplayMode(v as ResultDisplayMode)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="qc-display-mode" className="h-9">
                    <div className="flex items-center gap-2 min-w-0">
                      <MonitorSmartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="How the result is shown" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {RESULT_DISPLAY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Where and how the agent&apos;s result appears when the
                  shortcut runs.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Label
                      htmlFor="qc-show-vars"
                      className="text-sm font-medium cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Variable className="h-3.5 w-3.5 text-muted-foreground" />
                      Show variables panel
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      Let the user review or edit the agent&apos;s variables
                      before the run kicks off.
                    </p>
                  </div>
                  <Switch
                    id="qc-show-vars"
                    checked={showVariablePanel}
                    onCheckedChange={setShowVariablePanel}
                    disabled={isSaving}
                  />
                </div>

                <div
                  className={cn(
                    "space-y-1.5 transition-opacity",
                    showVariablePanel ? "opacity-100" : "opacity-50",
                  )}
                >
                  <Label htmlFor="qc-vars-style" className="text-sm">
                    Variables style
                  </Label>
                  <Select
                    value={variablesPanelStyle}
                    onValueChange={(v) =>
                      setVariablesPanelStyle(v as VariablesPanelStyle)
                    }
                    disabled={isSaving || !showVariablePanel}
                  >
                    <SelectTrigger id="qc-vars-style" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIABLE_PANEL_STYLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {opt.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-medium text-foreground/90">
                    Defaults applied:
                  </span>{" "}
                  name pulled from the agent, pinned to the agent&apos;s current
                  version, auto-run, chat allowed, shown everywhere (
                  <code className="text-[10px] bg-muted px-1 rounded">
                    general
                  </code>{" "}
                  surface). Tweak anything in the remaining tabs.
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Variables ─────────────────────────────────────────────────── */}
        <TabsContent value="variables" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="px-4 py-3 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-sm font-semibold">
                    Default values
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Pre-fill what the agent&apos;s variables should start as when
                  this shortcut runs. Leave blank to inherit the agent&apos;s
                  own defaults.
                </p>
                <DefaultVariableValuesEditor
                  variableDefinitions={agentVariableDefs}
                  values={defaultVariables}
                  onChange={setDefaultVariables}
                  disabled={isSaving}
                  compact
                />
              </div>

              {variableDefsForScopeMapping.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Scope mappings
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Optionally route values from the surrounding app (like the
                      user&apos;s selection or the current document) into
                      specific agent variables.
                    </p>
                    <ScopeMappingEditor
                      availableScopes={availableScopes}
                      scopeMappings={scopeMappings}
                      variableDefinitions={variableDefsForScopeMapping}
                      onScopesChange={(scopes, mappings) => {
                        setAvailableScopes(scopes);
                        setScopeMappings(mappings);
                      }}
                      compact
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Details ───────────────────────────────────────────────────── */}
        <TabsContent value="details" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="px-4 py-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="qc-label" className="text-sm">
                  Name override
                </Label>
                <Input
                  id="qc-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={agent?.name ?? "What users will see"}
                  className="h-9 text-[16px]"
                  disabled={isSaving}
                />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Defaults to the agent&apos;s name
                  {agent?.name ? (
                    <>
                      {" "}
                      (<span className="font-medium">{agent.name}</span>)
                    </>
                  ) : null}
                  .
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qc-description" className="text-sm">
                  Description
                </Label>
                <Input
                  id="qc-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    agent?.description ?? "Short subtitle under the label"
                  }
                  className="h-9 text-[16px]"
                  disabled={isSaving}
                />
              </div>

              <Separator />

              <AgentVersionPicker
                agentId={agentId}
                agentVersionId={agentVersionId}
                useLatest={useLatest}
                onAgentVersionIdChange={setAgentVersionId}
                onUseLatestChange={setUseLatest}
                disabled={isSaving}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Advanced ──────────────────────────────────────────────────── */}
        <TabsContent value="advanced" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full">
            <div className="px-4 py-3 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="qc-keyboard" className="text-sm">
                  Keyboard shortcut
                </Label>
                <Input
                  id="qc-keyboard"
                  value={keyboardShortcut}
                  onChange={(e) => setKeyboardShortcut(e.target.value)}
                  placeholder="e.g. cmd+shift+e"
                  className="h-9 text-[16px] font-mono"
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Enabled surfaces</Label>
                <ShortcutContextsPicker
                  value={enabledFeatures}
                  onChange={(v) => setEnabledFeatures(v)}
                  disabled={isSaving}
                />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  At least one surface is required; we default to{" "}
                  <code className="text-[10px] bg-muted px-1 rounded">
                    general
                  </code>
                  .
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Execution behavior
                </Label>
                <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                  <ToggleRow
                    id="qc-auto-run"
                    label="Auto-run"
                    description="Execute immediately when the shortcut is launched."
                    checked={autoRun}
                    onCheckedChange={setAutoRun}
                    disabled={isSaving}
                  />
                  <ToggleRow
                    id="qc-allow-chat"
                    label="Allow chat"
                    description="Let the user keep talking to the agent after the first response."
                    checked={allowChat}
                    onCheckedChange={setAllowChat}
                    disabled={isSaving}
                  />
                  <ToggleRow
                    id="qc-hide-reasoning"
                    label="Hide reasoning"
                    description="Suppress the agent's internal thinking/reasoning blocks."
                    checked={hideReasoning}
                    onCheckedChange={setHideReasoning}
                    disabled={isSaving}
                  />
                  <ToggleRow
                    id="qc-hide-tool-results"
                    label="Hide tool results"
                    description="Suppress tool-call results from the output view."
                    checked={hideToolResults}
                    onCheckedChange={setHideToolResults}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Link existing ─────────────────────────────────────────────── */}
        <TabsContent value="link" className="flex-1 min-h-0 mt-0">
          <div className="px-4 py-3 flex flex-col h-full min-h-0 gap-2.5">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your shortcuts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-[16px]"
              />
            </div>
            <div className="flex items-center justify-between shrink-0">
              <div className="text-xs text-muted-foreground">
                {filteredExisting.length} shortcut
                {filteredExisting.length !== 1 ? "s" : ""}
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="qc-unlinked"
                  className="text-xs font-normal cursor-pointer"
                >
                  Unlinked only
                </Label>
                <Switch
                  id="qc-unlinked"
                  checked={showOnlyUnlinked}
                  onCheckedChange={setShowOnlyUnlinked}
                />
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {filteredExisting.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {showOnlyUnlinked
                      ? "No unlinked shortcuts. Try disabling the filter, or create one from the Essentials tab."
                      : "No shortcuts match your search."}
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-2 pb-1">
                    {filteredExisting.map((shortcut) => {
                      const isSelected = selectedExistingId === shortcut.id;
                      const cat = categories.find(
                        (c) => c.id === shortcut.categoryId,
                      );
                      return (
                        <button
                          key={shortcut.id}
                          type="button"
                          onClick={() => setSelectedExistingId(shortcut.id)}
                          className={cn(
                            "w-full text-left p-2.5 border rounded-md cursor-pointer transition-colors",
                            isSelected
                              ? "bg-primary/10 border-primary"
                              : "border-border hover:bg-muted/50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {shortcut.label}
                              </div>
                              {shortcut.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {shortcut.description}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {cat && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {cat.label}
                                  </Badge>
                                )}
                                {shortcut.agentId && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    already linked
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          {error ? (
            <div className="flex items-center gap-1.5 text-xs text-destructive min-w-0">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {scope === "global" ? (
                <>
                  <Globe className="h-3 w-3" />
                  Global shortcut (admin)
                </>
              ) : (
                <>
                  <UserIcon className="h-3 w-3" />
                  Personal shortcut
                </>
              )}
            </div>
          )}
          {isAdmin && (
            <div className="inline-flex items-center gap-1.5 text-[11px] shrink-0">
              <Label
                htmlFor="qc-scope-global"
                className="text-[11px] text-muted-foreground font-normal cursor-pointer inline-flex items-center gap-1"
              >
                <Globe className="h-3 w-3" />
                Global
              </Label>
              <Switch
                id="qc-scope-global"
                checked={scope === "global"}
                onCheckedChange={(on) => setScope(on ? "global" : "user")}
                disabled={isSaving}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={primaryAction} disabled={primaryDisabled}>
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                {activeTab === "link" ? (
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                {primaryLabel}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Small toggle row used in the Advanced tab. Kept local because it doesn't
// need to be reused elsewhere.
// ───────────────────────────────────────────────────────────────────────────

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2 bg-background">
      <div className="min-w-0 flex-1">
        <Label
          htmlFor={id}
          className="text-xs font-medium cursor-pointer block truncate"
        >
          {label}
        </Label>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
          {description}
        </p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
