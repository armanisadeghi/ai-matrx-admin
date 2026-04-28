/**
 * features/files/virtual-sources/adapt-library-source.ts
 *
 * Adapt-up shim: lifts an old `LibrarySourceAdapter` into the new
 * `VirtualSourceAdapter` contract. Old adapters cover only list/load/save,
 * so the resulting capabilities are conservative — rename / move / delete /
 * versions are all flagged unsupported. The point of the shim is to keep the
 * `/code` workspace running while the new contract takes over piece by piece;
 * each old adapter eventually gets a native re-implementation that flips the
 * remaining capability flags on.
 */

import type { LibrarySourceAdapter } from "@/features/code/library-sources/types";
import type {
  ListArgs,
  RenameArgs,
  VirtualNode,
  VirtualSourceAdapter,
  WriteArgs,
} from "./types";
import { VirtualSourceError } from "./errors";

export function liftLibrarySourceAdapter(
  old: LibrarySourceAdapter,
): VirtualSourceAdapter {
  return {
    sourceId: old.sourceId,
    label: old.label,
    icon: old.icon,
    capabilities: {
      list: true,
      read: true,
      write: true,
      rename: false,
      delete: false,
      move: false,
      folders: old.multiField, // multi-field rows render as folder-per-row
      binary: false,
      versions: false,
      multiField: old.multiField,
    },
    dnd: { acceptsOwn: false },
    pathPrefix: `/${old.label}`,
    makeTabId: old.makeTabId,
    // Old contract uses `rowId` for the row PK; new contract calls it `id`.
    // Translate at the boundary so callers see the new shape.
    parseTabId(tabId: string) {
      const parsed = old.parseTabId(tabId);
      return parsed ? { id: parsed.rowId, fieldId: parsed.fieldId } : null;
    },

    async list(supabase, userId, args: ListArgs): Promise<VirtualNode[]> {
      // Old adapters don't have `parentId` semantics — they always return a
      // flat list of rows. We surface the rows under the adapter root and,
      // for multi-field rows, populate `fields[]` so the UI can render the
      // folder-per-row layout.
      if (args.parentId !== null) return [];
      const entries = await old.list(supabase, userId);
      return entries.map((entry) => ({
        id: entry.rowId,
        kind: old.multiField ? "folder" : "file",
        name: entry.name,
        parentId: null,
        badge: entry.badge,
        updatedAt: entry.updatedAt,
        fields: entry.fields?.map((field) => ({
          fieldId: field.fieldId,
          label: field.label,
          extension: field.extension,
          language: field.language,
          hasContent: field.hasContent,
        })),
      }));
    },

    async read(supabase, _userId, id, fieldId) {
      const loaded = await old.load(supabase, id, fieldId);
      return {
        id: loaded.rowId,
        fieldId: loaded.fieldId,
        name: loaded.name,
        path: loaded.path,
        language: loaded.language,
        // No mime type in the old contract — pick a safe text default.
        mimeType: "text/plain",
        content: loaded.content,
        updatedAt: loaded.updatedAt,
      };
    },

    async write(supabase, _userId, args: WriteArgs) {
      const result = await old.save(supabase, {
        rowId: args.id,
        content: args.content,
        fieldId: args.fieldId,
        expectedUpdatedAt: args.expectedUpdatedAt,
      });
      return { updatedAt: result.updatedAt };
    },

    async rename(_supabase, _userId, _args: RenameArgs) {
      throw new VirtualSourceError("not_supported", "rename");
    },

    async delete() {
      throw new VirtualSourceError("not_supported", "delete");
    },
  };
}
