"use client";

/**
 * THE one Insert menu of a prompt message (system, user, assistant): every way
 * to put something into a message, in the chat + menu's own rows and cascades
 * (`ComposerMenu` from @ai-matrx/chat — one look for every menu of this kind).
 *
 * It only chooses; the host inserts at the caret and shows what was inserted.
 * Fetched lists (kinds, prompt blocks) open in `OwnedItemPicker`: search, the
 * Mine | Shared | All | Public lanes, and the platform Peek on hover.
 */

import { useState, type ComponentType } from "react";
import {
  Boxes,
  Braces,
  FileJson,
  ImagePlus,
  Library,
  Plus,
  Tag,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import {
  COMPOSER_MENU_NO_ENTRANCE,
  ComposerMenuCloseAllContext,
  ComposerMenuDivider,
  ComposerMenuLevel,
  ComposerMenuRow,
  ComposerSubmenu,
  ignoreOwnWrapper,
} from "@ai-matrx/chat/agents/components/inputs/smart-input/composer/ComposerMenu";
import {
  contextReferenceInsert,
  exampleInsert,
  sectionInsert,
  variableInsert,
  type PromptInsert,
} from "@ai-matrx/rich-content/editor/core/prompt-inserts";
import { OwnedItemPicker, type OwnedPickerItem } from "./OwnedItemPicker";

type IconType = ComponentType<{ className?: string }>;

export interface InsertMenuContentType<T extends string = string> {
  type: T;
  label: string;
  icon: IconType;
}

export interface InsertMenuContextItem {
  key: string;
  label?: string;
}

const SECTION_ROWS: readonly { id: string; label: string; insert: () => PromptInsert }[] = [
  { id: "example", label: "Input & Output Example", insert: exampleInsert },
  { id: "instructions", label: "Instructions", insert: () => sectionInsert("instructions") },
  { id: "context", label: "Context", insert: () => sectionInsert("context") },
  { id: "examples", label: "Examples", insert: () => sectionInsert("examples") },
  { id: "output_format", label: "Output Format", insert: () => sectionInsert("output_format") },
];

const LIST_PANEL = "w-64 max-h-80 overflow-y-auto";
const PICKER_PANEL = "w-[340px] h-[min(440px,70dvh,var(--radix-popover-content-available-height))]";

export interface MessageInsertMenuProps<T extends string = string> {
  variables: readonly string[];
  onInsert: (insert: PromptInsert) => void;
  /** Keep the selection (or an empty pair) only when the variable is filled / empty. */
  onWrapSection?: (name: string, when: "filled" | "empty") => void;
  /** Media & content blocks this message offers. */
  contentTypes?: readonly InsertMenuContentType<T>[];
  onAddContentType?: (type: T) => void;
  /** Kind schemas (null while loading); `onPickKind` inserts the chosen one. */
  kinds: readonly OwnedPickerItem[] | null;
  kindsError?: string | null;
  onPickKind: (kind: string) => void;
  /** Prompt blocks (null while loading). */
  blocks: readonly OwnedPickerItem[] | null;
  blocksError?: string | null;
  onPickBlock: (name: string) => void;
  contextItems: readonly InsertMenuContextItem[];
  /** Nothing yet: these run the builder's own Add for that section. */
  onAddVariable: () => void;
  onAddContextItem: () => void;
  /** Opening the menu: the host saves the caret and loads the fetched lists. */
  onOpenChange?: (open: boolean) => void;
}

export function MessageInsertMenu<T extends string = string>({
  variables,
  onInsert,
  onWrapSection,
  contentTypes = [],
  onAddContentType,
  kinds,
  kindsError,
  onPickKind,
  blocks,
  blocksError,
  onPickBlock,
  contextItems,
  onAddVariable,
  onAddContextItem,
  onOpenChange,
}: MessageInsertMenuProps<T>) {
  const [open, setOpenState] = useState(false);
  const setOpen = (next: boolean) => {
    setOpenState(next);
    onOpenChange?.(next);
  };
  const close = () => setOpen(false);
  const run = (fn: () => void) => {
    close();
    fn();
  };

  const variableRows = (pick: (name: string) => void, mono: (name: string) => string) =>
    variables.length === 0 ? (
      <ComposerMenuRow icon={Plus} label="Add variable" onClick={() => run(onAddVariable)} />
    ) : (
      variables.map((name) => (
        <ComposerMenuRow key={name} label={<span className="font-mono">{mono(name)}</span>} onClick={() => run(() => pick(name))} />
      ))
    );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="quiet"
          icon={<Plus />}
          aria-label="Insert"
          data-testid="prompt-insert-menu"
          // Keep the field's selection: the trigger never takes focus on press.
          onMouseDown={(e) => e.preventDefault()}
        >
          Insert
        </Button>
      </PopoverTrigger>
      <PopoverContent
        /* sizing: fixed — the chat + menu's 300px */
        align="end"
        sideOffset={6}
        onPointerDownOutside={ignoreOwnWrapper}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className={`flex w-[300px] max-h-[var(--radix-popover-content-available-height)] flex-col overflow-y-auto p-1 ${COMPOSER_MENU_NO_ENTRANCE}`}
        data-testid="prompt-insert-menu-panel"
      >
        <ComposerMenuCloseAllContext.Provider value={close}>
          <ComposerMenuLevel>
            {contentTypes.length > 0 && onAddContentType ? (
              <ComposerSubmenu row={{ icon: ImagePlus, label: "Media & content block" }} panelClassName={LIST_PANEL}>
                {contentTypes.map((ct) => (
                  <ComposerMenuRow key={ct.type} icon={ct.icon} label={ct.label} onClick={() => run(() => onAddContentType(ct.type))} />
                ))}
              </ComposerSubmenu>
            ) : null}

            <ComposerSubmenu row={{ icon: Braces, label: "Variable" }} panelClassName={LIST_PANEL}>
              {variableRows((name) => onInsert(variableInsert(name)), (name) => `{{${name}}}`)}
            </ComposerSubmenu>
            {onWrapSection ? (
              <>
                <ComposerSubmenu
                  row={{ icon: ToggleRight, label: "Add block 'if' variable", hint: "Kept only when the variable has a value" }}
                  panelClassName={LIST_PANEL}
                >
                  {variableRows((name) => onWrapSection(name, "filled"), (name) => name)}
                </ComposerSubmenu>
                <ComposerSubmenu
                  row={{ icon: ToggleLeft, label: "Add block 'if no' variable", hint: "Kept only when the variable is empty" }}
                  panelClassName={LIST_PANEL}
                >
                  {variableRows((name) => onWrapSection(name, "empty"), (name) => name)}
                </ComposerSubmenu>
              </>
            ) : null}

            <ComposerMenuDivider />

            <ComposerSubmenu row={{ icon: FileJson, label: "Kind schema" }} panelClassName={PICKER_PANEL}>
              <OwnedItemPicker
                items={kinds}
                error={kindsError}
                searchLabel="Search kinds"
                onPick={(item) => run(() => onPickKind(item.id))}
              />
            </ComposerSubmenu>
            <ComposerSubmenu row={{ icon: Boxes, label: "Instruction Block" }} panelClassName={PICKER_PANEL}>
              <OwnedItemPicker
                items={blocks}
                error={blocksError}
                searchLabel="Search blocks"
                onPick={(item) => run(() => onPickBlock(item.id))}
              />
            </ComposerSubmenu>
            <ComposerSubmenu row={{ icon: Tag, label: "Section tags" }} panelClassName={LIST_PANEL}>
              {SECTION_ROWS.map((row) => (
                <ComposerMenuRow key={row.id} label={row.label} onClick={() => run(() => onInsert(row.insert()))} />
              ))}
            </ComposerSubmenu>

            <ComposerMenuDivider />

            <ComposerSubmenu row={{ icon: Library, label: "Context Item" }} panelClassName={LIST_PANEL}>
              {contextItems.length === 0 ? (
                <ComposerMenuRow icon={Plus} label="Add context item" onClick={() => run(onAddContextItem)} />
              ) : (
                contextItems.map((item) => (
                  <ComposerMenuRow
                    key={item.key}
                    label={item.label ?? item.key}
                    detail={item.label && item.label !== item.key ? <span className="font-mono">{item.key}</span> : undefined}
                    onClick={() => run(() => onInsert(contextReferenceInsert(item.key)))}
                  />
                ))
              )}
            </ComposerSubmenu>
          </ComposerMenuLevel>
        </ComposerMenuCloseAllContext.Provider>
      </PopoverContent>
    </Popover>
  );
}
