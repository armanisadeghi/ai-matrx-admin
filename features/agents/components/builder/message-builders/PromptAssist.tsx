"use client";

/**
 * PromptAssist — what the agent builder's system and user prompt boxes share:
 *
 *   - `usePromptInsertSources(agentId)` — the Insert menu's sources: the agent's
 *     own variables, its context items, and the Shape registry's kinds (loaded
 *     on first open; a kind inserts its JSON Schema with `__kind`).
 *   - `insertPromptText(...)` — puts an insert at the caret as exact text: the
 *     textarea's selection in Plain/Split, the Write editor's caret in Write.
 *   - `PromptWriteBox` — Write: the rich editor over the SAME stored text. It
 *     reports a change only when the person edits; an unedited open, a mode
 *     switch and a save leave the text byte-identical (rich-editor's prompt
 *     fidelity corpus guards this).
 *
 * Nothing here rewrites the prompt on its own. Corrections are suggestions in
 * PromptFixReview (rich-editor) and apply only on Apply.
 */

import { useMemo, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { EditableContextMenu } from "@ai-matrx/context-menu/react";
import { sectionMenuSection, wrapEditorSelection } from "@ai-matrx/rich-content/editor/core/section-menu";
import type { ContextMenuExtraSection } from "@ai-matrx/context-menu/engine";
import RichEditor, { type RichEditorController } from "@ai-matrx/rich-content/editor/editor/RichEditor";
import type { PromptBlockHost } from "@ai-matrx/rich-content/editor/editor/RichEditorContext";
import { FormatButtons } from "@ai-matrx/rich-content/editor/format/FormatButtons";
import { textareaFormatTarget } from "@ai-matrx/rich-content/editor/format/format-target";
import { insertIntoText, type PromptInsert } from "@ai-matrx/rich-content/editor/core/prompt-inserts";
import type { PromptInsertKind, PromptInsertContextItem } from "@ai-matrx/rich-content/editor/format/PromptInsertMenu";
import { kindSchemaToJsonSchema } from "@ai-matrx/content-ir";
import {
  catalogResolver,
  listAllKinds,
  listCompiledKinds,
  type KindCatalogEntry,
} from "@/features/content-ir/registry/kind-catalog";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentContextPolicies,
  selectAgentMessages,
  selectAgentVariableDefinitions,
} from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import type { DeclaredVariable } from "@ai-matrx/rich-content/editor/core/variables";
import type { VariableDefinition } from "@ai-matrx/chat/agents/types/agent-definition.types";
import { nextSendConversationId } from "@/features/agents/hooks/agentBuilderContextBundle";
import { selectResolvedVariables } from "@ai-matrx/chat/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";

export interface PromptInsertSources {
  variables: string[];
  /**
   * The agent's variable definitions as the prompt editor's pills and Peek read them: label, help,
   * input, default, required, options, what fills it, and the OTHER prompt boxes that use it.
   */
  definitions: DeclaredVariable[];
  kinds: PromptInsertKind[] | null;
  kindSchema: (kind: string) => unknown;
  contextItems: PromptInsertContextItem[];
  /** Call when the menu opens: loads the kind catalog once. */
  loadKinds: () => void;
}

/** Which prompt box this is: the system instructions, or a message by its index in the messages array. */
export type PromptPlace = "system" | number;

/** What fills a bound variable, in words (the Peek's "Filled from"). */
function filledFrom(definition: VariableDefinition): string | undefined {
  if (definition.control) return `Model setting · ${definition.control.key}`;
  const binding = definition.binding;
  if (!binding) return undefined;
  if (binding.kind === "merge_field") return "Your custom data";
  return `Context · ${binding.itemKey}`;
}

function hasDefault(value: unknown): boolean {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

/** The token forms that use `name`: `{{name}}` and its section markers. */
function usesVariable(text: string, name: string): boolean {
  return text.includes(`{{${name}}}`) || text.includes(`{{#${name}}}`) || text.includes(`{{^${name}}}`) || text.includes(`{{/${name}}}`);
}

/**
 * The agent's definitions in the editor's shape, with where each one is used outside `place`
 * ("System instructions", "User message 2"). The stored prompt is only read here, never written.
 */
export function promptVariableDefinitions(
  definitions: readonly VariableDefinition[] | null | undefined,
  messages: readonly { role: string; content?: unknown }[] | null | undefined,
  place?: PromptPlace,
  /** The Test panel's current values (absent: the test panel has not started, so no value is claimed). */
  testValues?: Readonly<Record<string, unknown>> | null,
): DeclaredVariable[] {
  const boxes: { label: string; text: string; place: PromptPlace }[] = [];
  let ordinal = 0;
  (messages ?? []).forEach((message, index) => {
    const text = JSON.stringify(message.content ?? "");
    if (message.role === "system") {
      boxes.push({ label: "System instructions", text, place: "system" });
      return;
    }
    ordinal += 1;
    const role = message.role === "assistant" ? "Assistant" : "User";
    boxes.push({ label: `${role} message ${ordinal}`, text, place: index });
  });
  return (definitions ?? [])
    .filter((definition) => Boolean(definition.name))
    .map((definition) => {
      const options = definition.customComponent?.options?.filter((option) => typeof option === "string" && option.trim() !== "");
      const from = filledFrom(definition);
      const usedIn = boxes.filter((box) => box.place !== place && usesVariable(box.text, definition.name)).map((box) => box.label);
      return {
        name: definition.name,
        ...(definition.label ? { label: definition.label } : {}),
        ...(definition.customComponent?.type ? { type: definition.customComponent.type } : {}),
        ...(definition.helpText ? { helpText: definition.helpText } : {}),
        ...(definition.defaultValue !== undefined ? { defaultValue: definition.defaultValue } : {}),
        ...(definition.required !== undefined ? { required: definition.required } : {}),
        ...(options && options.length ? { options } : {}),
        ...(from ? { filledFrom: from } : {}),
        ...(usedIn.length ? { usedIn } : {}),
        // The pill's "needs a value" tint and the Peek's input preview read the Test panel's value.
        // Before the panel has started (always so on a phone, where the panel is another tab) the value is
        // the default the panel WILL show; a variable with no default claims nothing (no false "needs a value").
        ...(testValues
          ? { value: testValues[definition.name] ?? "" }
          : hasDefault(definition.defaultValue)
            ? { value: definition.defaultValue }
            : {}),
      };
    });
}

/**
 * The Test panel's values AS THE PANEL SHOWS THEM: what the person typed, else what the context
 * filled, else the variable's default (the same merge Send submits). Reading only the typed values
 * left a Dropdown showing "bug" in the panel and "No value yet" in the Peek (live, 2026-10-17).
 * Null until the panel has a conversation with its variables, so no value is claimed before then.
 */
export function useTestPanelValues(agentId: string): Readonly<Record<string, unknown>> | null {
  const conversationId = useAppSelector((state) => nextSendConversationId(state, agentId));
  const resolved = useMemo(() => (conversationId ? selectResolvedVariables(conversationId) : null), [conversationId]);
  return useAppSelector((state) =>
    resolved && conversationId && state.instanceVariableValues.byConversationId[conversationId] ? resolved(state) : null,
  );
}

export function usePromptInsertSources(agentId: string, place?: PromptPlace): PromptInsertSources {
  const variableDefinitions = useAppSelector((state) => selectAgentVariableDefinitions(state, agentId));
  const messages = useAppSelector((state) => selectAgentMessages(state, agentId));
  const testValues = useTestPanelValues(agentId);
  const definitions = useMemo(
    () => promptVariableDefinitions(variableDefinitions, messages, place, testValues),
    [variableDefinitions, messages, place, testValues],
  );
  const contextPolicies = useAppSelector((state) => selectAgentContextPolicies(state, agentId));
  const [catalog, setCatalog] = useState<KindCatalogEntry[] | null>(null);
  const loading = useRef(false);

  const loadKinds = () => {
    if (loading.current) return;
    loading.current = true;
    listAllKinds()
      .then(setCatalog)
      .catch((error: unknown) => {
        // Loud recovery: the compiled kinds keep the menu usable.
        console.error("[PromptInsertMenu] kind catalog DB load failed — compiled kinds only:", error);
        setCatalog(listCompiledKinds());
      });
  };

  const variables = (variableDefinitions ?? [])
    .map((v) => v.name)
    .filter((name): name is string => Boolean(name));
  const contextItems = (contextPolicies ?? []).map((p) => ({ key: p.key, label: p.label }));
  const kinds = catalog
    ? catalog
        .filter((entry) => entry.isActive !== false)
        .map((entry) => ({ kind: entry.kind, label: entry.label }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : null;
  const kindSchema = (kind: string) =>
    catalog ? (kindSchemaToJsonSchema(kind, catalogResolver(catalog))?.schema ?? null) : null;

  return { variables, definitions, kinds, kindSchema, contextItems, loadKinds };
}

export interface InsertPromptTextArgs {
  insert: PromptInsert;
  text: string;
  onChange: (next: string) => void;
  /** Write is showing: insert through the editor at its caret. */
  writeController?: RichEditorController | null;
  /** The textarea showing (Plain editing / Split), if any. */
  textarea?: HTMLTextAreaElement | null;
  /** The last caret the host saw when no textarea is showing. */
  fallbackCaret?: { start: number; end: number } | null;
}

/** Insert at the caret as exact text. Returns the caret after the insert (textarea paths). */
export function insertPromptText({
  insert,
  text,
  onChange,
  writeController,
  textarea,
  fallbackCaret,
}: InsertPromptTextArgs): number | null {
  if (writeController) {
    if (insert.placement === "block") {
      // Exactly at the caret, splitting its line there — what Plain does to the text.
      if (!writeController.insertText(insert.text, "caret")) writeController.replaceSelection(insert.text);
    } else {
      writeController.replaceSelection(insert.text);
    }
    return null;
  }
  // The live selection counts only while the textarea still has focus: the menu
  // takes focus, and a box that blurred (or remounted) reports a caret at 0. The
  // caret saved when the menu opened is the person's real caret.
  const live = textarea && typeof document !== "undefined" && document.activeElement === textarea;
  const start = live ? textarea.selectionStart : (fallbackCaret?.start ?? text.length);
  const end = live ? textarea.selectionEnd : (fallbackCaret?.end ?? start);
  const result = insertIntoText(text, start, end, insert);
  onChange(result.text);
  if (textarea) {
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.caret, result.caret);
    });
  }
  return result.caret;
}

export interface PromptWriteBoxProps {
  value: string;
  onChange: (next: string) => void;
  controllerRef: RefObject<RichEditorController | null>;
  surfaceName: string;
  placeholder?: string;
  /**
   * The box's own text color, as literal `[&_.rich-editor-prose]:…` classes (each prompt box keeps
   * the color its text always had). The editor's surface is transparent — the box's background
   * shows through, and the box hugs its text (no minimum height, no runway).
   */
  textClassName?: string;
  /** The agent's variable names: undeclared names are flagged, and a selection can become a section. */
  variableNames?: readonly string[];
  /**
   * The agent's full variable definitions (`usePromptInsertSources(...).definitions`): the pills read
   * each one's label and input, and the hover Peek shows all of it. Wins over `variableNames`.
   */
  variableDefinitions?: readonly DeclaredVariable[];
  /** The surface scope the right-click menu acts on. */
  contextData?: Record<string, unknown>;
  /** Prompt blocks the agent declares / that resolve to nothing; `{{<name>}}` draws as a block chip. */
  promptBlocks?: PromptBlockHost | null;
  /**
   * The host's own rows for the menu (agent builder: `agentPromptMenuSections`), given Write's
   * "Only include when" section to place. Called when the menu opens.
   */
  menuSections?: (conditional: ContextMenuExtraSection[]) => ContextMenuExtraSection[];
  /**
   * Extra props for the right-click menu (`usePromptBlockEditing().menuProps`): a content block picked
   * from the menu becomes a declared `{{<name>}}` chip instead of pasted text.
   */
  menuProps?: object;
}

/** Write: the rich editor over the stored prompt text (see header). */
export function PromptWriteBox({
  value,
  onChange,
  controllerRef,
  surfaceName,
  placeholder,
  textClassName,
  variableNames,
  variableDefinitions,
  contextData,
  promptBlocks = null,
  menuSections,
  menuProps,
}: PromptWriteBoxProps) {
  const declared = useMemo(
    () => variableDefinitions ?? variableNames?.map((name) => ({ name })) ?? null,
    [variableDefinitions, variableNames],
  );
  const box = (
    <div
      data-testid="prompt-write-box"
      // In place (layout "flow"): no panel, no textured surface, no 60dvh floor, no 40dvh runway — the
      // text sits on the box's own background at the size the prompt textarea always had (Arman,
      // 2026-10-11: "the giant blank thing added to the bottom … looks horrible"). Headings take the
      // text's color: a prompt is read as text.
      className={cn(
        "relative w-full [--rich-editor-heading-color:currentColor] [&_.ProseMirror]:font-sans",
        textClassName,
      )}
    >
      <RichEditor
        value={value}
        onChange={onChange}
        view="visual"
        chrome="bare"
        layout="flow"
        textSize="xs"
        hostContextMenu
        variables={declared}
        promptBlocks={promptBlocks}
        controllerRef={controllerRef}
        placeholder={placeholder}
        surfaceName={surfaceName}
        sourceFeature="agent-builder"
        defaultOutlineOpen={false}
        imagePolicy="other"
      />
    </div>
  );
  return (
    <EditableContextMenu
      {...menuProps}
      sourceFeature="agent-builder"
      surfaceName={surfaceName}
      menuDesign="global"
      menuFeatureTitle="Prompt"
      contentSource={{ type: "raw" }}
      contextData={contextData}
      insertAtCaret={(text: string) => {
        if (!controllerRef.current) return false;
        controllerRef.current.replaceSelection(text);
        return true;
      }}
      onTextReplace={onChange}
      resolveExtraSectionsOnOpen={() => {
        const section = sectionMenuSection({
          variables: declared,
          hasSelection: () => (controllerRef.current?.selectedText() ?? "").trim() !== "",
          wrap: (name, when) => wrapEditorSelection(controllerRef.current, name, when),
        });
        const conditional = section ? [section as ContextMenuExtraSection] : [];
        if (menuSections) return menuSections(conditional);
        return conditional.length ? conditional : undefined;
      }}
    >
      {box}
    </EditableContextMenu>
  );
}

/**
 * The shared format buttons in a prompt box's own toolbar row, for every editable mode:
 * Write formats through the editor, Plain editing / Split through the textarea.
 */
export function PromptFormatButtons({
  mode,
  writeRef,
  getTextarea,
}: {
  mode: "write" | "textarea";
  writeRef: RefObject<RichEditorController | null>;
  getTextarea: () => HTMLTextAreaElement | null;
}) {
  return (
    <FormatButtons
      size="xs"
      className="min-w-0 flex-1"
      resolve={() => {
        if (mode === "write") return writeRef.current?.formatTarget?.() ?? null;
        const textarea = getTextarea();
        return textarea && textarea.isConnected ? textareaFormatTarget(textarea) : null;
      }}
    />
  );
}

/**
 * The Insert menu's empty Variable / Context rows link here: the builder section scrolls
 * into view and its Add button takes focus — or, with `press`, opens what Add opens
 * (`data-agent-builder-section` on the left panel).
 */
export function goToBuilderSection(section: "variables" | "context", { press = false }: { press?: boolean } = {}) {
  if (typeof document === "undefined") return;
  const element = document.querySelector<HTMLElement>(`[data-agent-builder-section="${section}"]`);
  if (!element) {
    console.error(`[PromptAssist] builder section "${section}" is not on this page`);
    return;
  }
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  const add = [...element.querySelectorAll<HTMLButtonElement>("button")].find((button) =>
    /^add\b/i.test((button.getAttribute("aria-label") ?? button.textContent ?? "").trim()),
  );
  window.setTimeout(() => {
    (add ?? element).focus({ preventScroll: true });
    // `press`: run the section's own Add (the same editor its button opens).
    if (press) add?.click();
  }, 250);
}
