"use client";

import { useState } from "react";
import {
  Plus,
  Image as ImageIcon,
  Music,
  Video,
  Youtube,
  FileText,
  X,
  Check,
  Pencil,
} from "lucide-react";
import { HighlightedText } from "@/features/agents/components/variables-management/HighlightedText";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlockType =
  | "image"
  | "audio"
  | "video"
  | "youtube_video"
  | "document";

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
}

interface BlockTypeConfig {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  fields: FieldConfig[];
}

const BLOCK_TYPES: BlockTypeConfig[] = [
  {
    type: "image",
    label: "Image",
    icon: <ImageIcon className="w-3.5 h-3.5" />,
    fields: [
      {
        key: "url",
        label: "Image URL or {{variable}}",
        placeholder: "https://example.com/image.png",
      },
    ],
  },
  {
    type: "audio",
    label: "Audio",
    icon: <Music className="w-3.5 h-3.5" />,
    fields: [
      {
        key: "url",
        label: "Audio URL or {{variable}}",
        placeholder: "https://example.com/audio.mp3",
      },
    ],
  },
  {
    type: "video",
    label: "Video",
    icon: <Video className="w-3.5 h-3.5" />,
    fields: [
      {
        key: "url",
        label: "Video URL or {{variable}}",
        placeholder: "https://example.com/video.mp4",
      },
    ],
  },
  {
    type: "youtube_video",
    label: "YouTube",
    icon: <Youtube className="w-3.5 h-3.5 text-red-500" />,
    fields: [
      {
        key: "url",
        label: "YouTube URL or {{variable}}",
        placeholder: "https://www.youtube.com/watch?v=...",
      },
    ],
  },
  {
    type: "document",
    label: "Document",
    icon: <FileText className="w-3.5 h-3.5" />,
    fields: [
      {
        key: "url",
        label: "Document URL or {{variable}}",
        placeholder: "https://example.com/document.pdf",
      },
      {
        key: "mime_type",
        label: "MIME type or {{variable}}",
        placeholder: "application/pdf",
      },
    ],
  },
];

function getConfig(type: string): BlockTypeConfig | undefined {
  return BLOCK_TYPES.find((c) => c.type === type);
}

// ---------------------------------------------------------------------------
// BlockEditor — shared form for add + edit
// ---------------------------------------------------------------------------

interface BlockEditorProps {
  /** null = adding new; string = type of existing block being edited */
  blockType: BlockType | null;
  /** Current field values (for edit mode) */
  initialValues?: Record<string, string>;
  onConfirm: (block: Record<string, unknown>) => void;
  onCancel: () => void;
  onSelectType?: (type: BlockType) => void;
  isEdit?: boolean;
}

export function BlockEditor({
  blockType,
  initialValues = {},
  onConfirm,
  onCancel,
  onSelectType,
  isEdit = false,
}: BlockEditorProps) {
  const config = blockType ? getConfig(blockType) : null;
  const [values, setValues] = useState<Record<string, string>>(
    config
      ? Object.fromEntries(
          config.fields.map((f) => [f.key, initialValues[f.key] ?? ""]),
        )
      : {},
  );

  const handleConfirm = () => {
    if (!config) return;
    const primaryValue = values[config.fields[0].key]?.trim();
    if (!primaryValue) return;
    const block: Record<string, unknown> = { type: config.type };
    config.fields.forEach(({ key }) => {
      const v = values[key]?.trim();
      if (v) block[key] = v;
    });
    onConfirm(block);
  };

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  // Type selection step
  if (!config) {
    return (
      <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-border bg-muted/40">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-medium">Add content block</span>
          <button
            onClick={onCancel}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              onClick={() => onSelectType?.(bt.type)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-left border border-transparent hover:border-border"
            >
              {bt.icon}
              {bt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const primaryValue = values[config.fields[0].key]?.trim();

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {config.icon}
          <span>{isEdit ? `Edit ${config.label}` : `Add ${config.label}`}</span>
        </div>
        <button
          onClick={onCancel}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {config.fields.map(({ key, label, placeholder }) => (
        <div key={key} className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Input
            autoFocus={key === config.fields[0].key}
            value={values[key] ?? ""}
            onChange={(e) => setValue(key, e.target.value)}
            placeholder={placeholder}
            className="h-7 text-xs font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
              if (e.key === "Escape") onCancel();
            }}
          />
        </div>
      ))}

      <div className="flex items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-6 text-xs px-2"
          onClick={handleConfirm}
          disabled={!primaryValue}
        >
          <Check className="w-3 h-3 mr-1" />
          {isEdit ? "Save" : "Add"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BlockRow — full-width display row for a single non-text block
// ---------------------------------------------------------------------------

interface BlockRowProps {
  block: Record<string, unknown>;
  onEdit: () => void;
  onRemove: () => void;
  validVariables?: string[];
}

export function BlockRow({
  block,
  onEdit,
  onRemove,
  validVariables = [],
}: BlockRowProps) {
  const type = block.type as string;
  const config = getConfig(type as BlockType);
  const icon = config?.icon ?? <FileText className="w-3.5 h-3.5" />;
  const label = config?.label ?? type;

  // Fields that have values
  const fieldRows =
    config?.fields
      .map(({ key, label: fieldLabel }) => {
        const val = block[key] as string | undefined;
        if (!val) return null;
        return { key, label: fieldLabel.replace(/ or \{\{.*?\}\}/, ""), val };
      })
      .filter(Boolean) ?? [];

  return (
    <div className="flex flex-col gap-0.5 w-full px-2 py-1.5 rounded-md border border-border bg-card text-xs group/row">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground shrink-0">{icon}</span>
        <span className="font-medium shrink-0">{label}</span>
        <div className="flex items-center gap-0.5 shrink-0 ml-auto opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Edit"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      {fieldRows.map(
        (f) =>
          f && (
            <div
              key={f.key}
              className="flex gap-1.5 pl-5 font-mono text-[10px] leading-snug"
            >
              <span className="text-muted-foreground shrink-0">{f.label}:</span>
              <span className="truncate">
                <HighlightedText text={f.val} validVariables={validVariables} />
              </span>
            </div>
          ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddBlockTrigger — the "+" dropdown that lives inside the icon button row
// ---------------------------------------------------------------------------

interface AddBlockTriggerProps {
  onSelectType: (type: BlockType) => void;
}

export function AddBlockTrigger({ onSelectType }: AddBlockTriggerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Add content block"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {BLOCK_TYPES.map((bt) => (
          <DropdownMenuItem
            key={bt.type}
            onClick={() => onSelectType(bt.type)}
            className="text-xs gap-2"
          >
            {bt.icon}
            {bt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// BlockList — renders all non-text blocks with edit + remove, plus add editor
// ---------------------------------------------------------------------------

interface BlockListProps {
  blocks: Record<string, unknown>[];
  onUpdateBlock: (index: number, block: Record<string, unknown>) => void;
  onRemoveBlock: (index: number) => void;
  onAddBlock: (block: Record<string, unknown>) => void;
  /** Controlled from the header button — set to a BlockType to open editor */
  pendingAddType?: BlockType | null;
  onPendingAddTypeClear?: () => void;
  validVariables?: string[];
}

export function BlockList({
  blocks,
  onUpdateBlock,
  onRemoveBlock,
  onAddBlock,
  pendingAddType,
  onPendingAddTypeClear,
  validVariables = [],
}: BlockListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const cancelAdd = () => {
    onPendingAddTypeClear?.();
  };

  const handleAdded = (block: Record<string, unknown>) => {
    onAddBlock(block);
    onPendingAddTypeClear?.();
  };

  const handleUpdated = (block: Record<string, unknown>) => {
    if (editingIndex === null) return;
    onUpdateBlock(editingIndex, block);
    setEditingIndex(null);
  };

  if (blocks.length === 0 && !pendingAddType) return null;

  return (
    <div className="flex flex-col gap-1 w-full">
      {blocks.map((block, i) =>
        editingIndex === i ? (
          <BlockEditor
            key={i}
            blockType={block.type as BlockType}
            initialValues={block as Record<string, string>}
            onConfirm={handleUpdated}
            onCancel={() => setEditingIndex(null)}
            isEdit
          />
        ) : (
          <BlockRow
            key={i}
            block={block}
            onEdit={() => setEditingIndex(i)}
            onRemove={() => onRemoveBlock(i)}
            validVariables={validVariables}
          />
        ),
      )}

      {/* Add editor — only shown when triggered from the header + button */}
      {pendingAddType != null && (
        <BlockEditor
          blockType={pendingAddType}
          onConfirm={handleAdded}
          onCancel={cancelAdd}
        />
      )}
    </div>
  );
}
