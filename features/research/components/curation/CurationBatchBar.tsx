"use client";

import { Eye, EyeOff, Tags, Plus, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  tags: { id: string; name: string }[];
  onInclude: () => void;
  onExclude: () => void;
  onAddTag: (tagId: string) => void;
  onCreateTag: () => void;
  busy?: boolean;
}

/**
 * Batch action bar for the curation table. Beyond include/exclude it offers
 * **Add to tag** (existing tag or create-new) — the engine of the
 * select → tag workflow that builds new dimensions over the source set.
 * Actions keep the selection so the user can chain (tag, then exclude, etc.).
 * Drawn inside the table's own selection bar, which owns the count and Clear.
 */
export function CurationBatchBar({
  tags,
  onInclude,
  onExclude,
  onAddTag,
  onCreateTag,
  busy,
}: Props) {
  return (
    <>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      <Button
        icon={<Eye className="text-green-500" />}
        variant="quiet"
        onClick={onInclude}
        disabled={busy}
      >
        Include
      </Button>
      <Button
        icon={<EyeOff />}
        variant="quiet"
        onClick={onExclude}
        disabled={busy}
      >
        Exclude
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            icon={<Tags className="text-primary" />} iconEnd={<ChevronDown className="opacity-60" />}
            variant="quiet"
            disabled={busy}
          >
            Add to tag
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="max-h-72 overflow-y-auto"
        >
          <DropdownMenuItem onClick={onCreateTag}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create new tag…
          </DropdownMenuItem>
          {tags.length > 0 && <DropdownMenuSeparator />}
          {tags.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => onAddTag(t.id)}>
              <Tags className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <span className="truncate max-w-[14rem]">{t.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
