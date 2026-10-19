"use client";

// AddRecordRow — "Record…" in the layout editors: any record the person can open, found with the
// platform's ONE universal record picker (UniversalAssociationPicker), becomes a row that opens it. The
// row's address is the record type's own screen when the registry knows one, else the one address that
// opens any id (`openPath`, /o/<id>) — never a dead end. Picking a record already placed removes it.
import { useState } from "react";
import { FileText } from "lucide-react";
import { UniversalAssociationPicker, attachedKey } from "@ai-matrx/associations/react";
import type { EntityTypeToken } from "@ai-matrx/associations";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { listableTokens, tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { openPath } from "@/lib/deep-link/openPath";

export interface PickedRecord {
  token: string;
  id: string;
  label: string;
  href: string;
}

/** The address a record row opens: its type's screen, else the open-any-id page. */
export function recordRowHref(token: string, id: string): string {
  return tryGetEntityInfo(token)?.hrefFor?.(id) ?? openPath(id);
}

export function AddRecordRow({
  placed,
  onAdd,
  onRemove,
}: {
  /** `${token}:${id}` of the records already in this region. */
  placed: Set<string>;
  onAdd: (record: PickedRecord) => boolean;
  onRemove: (token: string, id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" icon={<FileText />}>
          Record…
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-2">
        {open ? (
          <UniversalAssociationPicker
            tokens={listableTokens() as EntityTypeToken[]}
            attachedKeys={placed}
            onAttach={async (token, id, title) => {
              const added = onAdd({ token, id, label: title || "Record", href: recordRowHref(token, id) });
              if (added) setOpen(false);
              return added ? { ok: true } : { ok: false, error: "There is no room for it here" };
            }}
            onDetach={async (token, id) => {
              onRemove(token, id);
              return { ok: true };
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export { attachedKey as recordKey };
