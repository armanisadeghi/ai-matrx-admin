"use client";

/**
 * One hook the prompt fields use: the Block button, the right-click row, the `{{<` trigger, the
 * picker, the chip panel, and the highlight handed to HighlightedText. Insert writes `{{<name>}}`
 * AND declares the name on the agent; declaring is explicit for hand-typed tokens (never automatic).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { Boxes } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import type { ContextMenuExtraSection } from "@ai-matrx/context-menu/engine";
import type { RichEditorController } from "@ai-matrx/rich-editor/editor/RichEditor";
import { toast } from "@/lib/toast";
import { useAgentBlocks } from "./agentBlocksStore";
import { PromptBlockPicker, type PickerAnchor } from "./components/PromptBlockPicker";
import { BlockChipPanel, type ChipTarget } from "./components/BlockChipPanel";
import type { BlockHighlight } from "./components/BlockChip";
import { applyBlockInsert, blockToken, typedTriggerAt, type TypedTrigger } from "./tokens";

let lastPointer: PickerAnchor = { x: 200, y: 200 };
if (typeof window !== "undefined") {
  window.addEventListener("contextmenu", (e) => (lastPointer = { x: e.clientX, y: e.clientY }), true);
}

interface Args {
  agentId: string;
  text: string;
  onChange: (text: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  writeRef: RefObject<RichEditorController | null>;
  viewMode: string;
  modelName?: string | null;
  creatorId?: string | null;
}

export function usePromptBlockEditing({ agentId, text, onChange, textareaRef, writeRef, viewMode, modelName, creatorId }: Args) {
  const blocks = useAgentBlocks(agentId);
  const [picker, setPicker] = useState<{ anchor: PickerAnchor; trigger: TypedTrigger | null } | null>(null);
  const [chip, setChip] = useState<ChipTarget | null>(null);
  const caretRef = useRef<{ start: number; end: number } | null>(null);

  const declared = useMemo(() => new Set(blocks.declared), [blocks.declared]);
  const missing = useMemo(() => new Set(blocks.missing), [blocks.missing]);

  const saveCaret = useCallback(() => {
    const ta = textareaRef.current;
    caretRef.current = ta && ta.isConnected ? { start: ta.selectionStart, end: ta.selectionEnd } : null;
  }, [textareaRef]);

  const openPicker = useCallback(
    (anchor: PickerAnchor, trigger: TypedTrigger | null = null) => {
      saveCaret();
      setPicker({ anchor, trigger });
    },
    [saveCaret],
  );

  const insertBlock = useCallback(
    async (name: string, trigger: TypedTrigger | null): Promise<boolean> => {
      try {
        await blocks.declare(name);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not declare the block");
        return false;
      }
      const ta = textareaRef.current;
      const write = viewMode === "write" ? writeRef.current : null;
      if (write) {
        write.replaceSelection(blockToken(name));
        return true;
      }
      const caret = caretRef.current;
      const from = caret?.start ?? text.length;
      const to = caret?.end ?? from;
      const next = applyBlockInsert(text, from, to, name, trigger ? { ...trigger } : null);
      onChange(next.text);
      if (ta && ta.isConnected) {
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(next.caret, next.caret);
        });
      }
      return true;
    },
    [blocks, textareaRef, writeRef, viewMode, text, onChange],
  );

  const pick = useCallback(
    async (name: string) => {
      const trigger = picker?.trigger ?? null;
      setPicker(null);
      await insertBlock(name, trigger);
    },
    [picker, insertBlock],
  );

  /** The editor context menu's content blocks: `{{<name>}}` at the caret, declared on the agent. */
  const insertFromMenu = useCallback(
    async (block: { name: string; label: string }): Promise<boolean> => {
      saveCaret();
      return insertBlock(block.name, null);
    },
    [saveCaret, insertBlock],
  );

  /** Call with the textarea's new value and caret on every change: `{{<` opens the picker. */
  const noteTyping = useCallback(
    (value: string, caret: number) => {
      const trigger = typedTriggerAt(value, caret);
      if (!trigger) {
        if (picker?.trigger) setPicker(null);
        return;
      }
      const ta = textareaRef.current;
      const rect = ta?.getBoundingClientRect();
      caretRef.current = { start: caret, end: caret };
      setPicker({ anchor: { x: (rect?.left ?? 200) + 16, y: (rect?.top ?? 200) + 28 }, trigger });
    },
    [picker, textareaRef],
  );

  useEffect(() => {
    if (picker?.trigger) {
      const trig = typedTriggerAt(text, caretRef.current?.start ?? text.length);
      if (!trig) setPicker(null);
    }
  }, [text, picker]);

  const toolbarButton: ReactNode = (
    <Button
      variant="quiet"
      icon={<Boxes />}
      aria-label="Insert prompt block"
      data-testid="prompt-block-insert-button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        openPicker({ x: r.left, y: r.bottom + 4 });
      }}
    >
      Block
    </Button>
  );

  const menuSections = useCallback(
    (): ContextMenuExtraSection[] => [
      {
        id: "prompt-blocks",
        anchor: "after-clipboard",
        items: [
          {
            kind: "item",
            id: "insert-prompt-block",
            label: "Insert prompt block…",
            onSelect: () => openPicker({ x: lastPointer.x, y: lastPointer.y }),
          },
        ],
      },
    ],
    [openPicker],
  );

  const highlight: BlockHighlight = useMemo(
    () => ({ declared, missing, onOpen: (name, rect) => setChip({ name, rect }) }),
    [declared, missing],
  );

  const nodes: ReactNode = (
    <>
      <PromptBlockPicker
        open={!!picker}
        anchor={picker?.anchor ?? null}
        initialQuery={picker?.trigger?.query ?? ""}
        declared={declared}
        onPick={(row) => void pick(row.name)}
        onClose={() => setPicker(null)}
      />
      <BlockChipPanel
        target={chip}
        declared={chip ? declared.has(chip.name) : false}
        modelName={modelName}
        creatorId={creatorId}
        onDeclare={blocks.declare}
        onClose={() => setChip(null)}
        onChanged={() => void blocks.refresh()}
      />
    </>
  );

  return { toolbarButton, nodes, menuSections, insertFromMenu, highlight, noteTyping, declared, missing, openPicker };
}
