"use client";

/**
 * VaultContextMenu — the ONE right-click menu for the Vault, and the supplier of the
 * `matrx-user/vault` surface values (credential count, labels, providers) to every
 * agent opened on the vault, from the right-click menu or the Agents menu.
 *
 * 🚨 THE VAULT MENU NEVER CARRIES A SECRET. A revealed value is plaintext in the
 * DOM, so the menu is given `getApplicationScope`, which wins outright over the
 * shell's DOM-text fallback; `selection` is forced empty; no `entity` is passed
 * (a credential is not agent context and has no share door). The scope itself is
 * built by `@ai-matrx/vault`'s `vaultInventoryScope` from item metadata only —
 * names, type, provider, website hosts, tags and field KEYS, never a value, a
 * note, a description or a custom field's value.
 *
 * Mounted by `WebVault`, so the `/vault` page, the floating Vault window and the
 * organization page's vault each get their own menu (a window never delegates
 * to the page under it). The clicked row is read off `data-item`, which every
 * list row in the package carries.
 */

import { useCallback, useState, type ReactNode } from "react";
import { Copy, KeyRound, PanelRightOpen, Star, Type } from "lucide-react";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import type {
  ContextMenuExtraSection,
  ResolvedContextMenuContext,
} from "@ai-matrx/context-menu/engine";
import type { ApplicationScope } from "@ai-matrx/chat/agents/types/scope.types";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  itemIdAt,
  rowMenuEntriesAt,
  vaultInventoryScope,
  type RowMenuEntry,
  type VaultInventory,
} from "@ai-matrx/vault";
import { copyToClipboard } from "@/lib/clipboard/copy";
import { createVaultScope } from "@/features/surfaces/manifests/vault.manifest";

export const VAULT_SURFACE_NAME = "matrx-user/vault";

const EMPTY: VaultInventory = { items: [], definitions: [] };

/**
 * The inventory the workspace reports (`VaultApp onInventory`) and the scope
 * builders read from it. Each returned function is SAMPLED when an agent runs.
 */
export function useVaultInventory() {
  const [inventory, setInventory] = useState<VaultInventory>(EMPTY);
  const getSurfaceScope = useCallback(
    (): SurfaceScopePayload => {
      const scope = vaultInventoryScope(inventory);
      return createVaultScope({
        credential_count: scope.credential_count,
        credential_labels: scope.credential_labels,
        credential_providers: scope.credential_providers,
        selection: "",
        context: { surface: "credential vault", viewing: "the credential list" },
      });
    },
    [inventory],
  );
  return { inventory, onInventory: setInventory, getSurfaceScope };
}

export interface VaultContextMenuProps {
  inventory: VaultInventory;
  getSurfaceScope: () => SurfaceScopePayload;
  /** Open an item in this placement (the row menu's door — no dead ends). */
  onOpenItem: (id: string) => void;
  children: ReactNode;
}

export function VaultContextMenu({
  inventory,
  getSurfaceScope,
  onOpenItem,
  children,
}: VaultContextMenuProps) {
  // The right-clicked item. STATE, so the extra items label themselves before
  // MenuContent mounts (`resolveContextOnOpen` fires first).
  const [clickedId, setClickedId] = useState<string | null>(null);
  // The row's own copy entries and star, read from the package (`rowMenuEntriesAt`): the same
  // entries the row's More menu shows, never a second copy of them here.
  const [rowEntries, setRowEntries] = useState<readonly RowMenuEntry[]>([]);
  const clicked = clickedId
    ? (inventory.items.find((i) => i.id === clickedId) ?? null)
    : null;

  const getApplicationScope = (): ApplicationScope => {
    const scope = vaultInventoryScope(inventory, clicked);
    return {
      content: scope.content,
      // Forced empty: on this surface DOM text can be a revealed credential.
      selection: "",
      text_before: "",
      text_after: "",
      context: {
        surface: "credential vault",
        viewing: clicked ? clicked.name : "the credential list",
      },
      credential_count: scope.credential_count,
      credential_labels: scope.credential_labels,
      credential_providers: scope.credential_providers,
    };
  };

  const section: ContextMenuExtraSection = {
    id: "vault",
    label: "Item",
    icon: KeyRound,
    items: [
      ...rowEntries
        .filter((e) => e.kind === "copy" || e.kind === "favorite")
        .map((e, i) => ({
          kind: "item" as const,
          id: `vault-row-${e.id ?? i}`,
          label: e.label,
          icon: e.kind === "favorite" ? Star : Copy,
          ...(e.disabled ? { disabled: true } : {}),
          onSelect: e.onSelect,
        })),
      {
        kind: "item",
        id: "vault-open",
        label: clicked ? `Open "${clicked.name}"` : "Open item",
        icon: PanelRightOpen,
        ...(clicked ? {} : { description: "Right-click an item" }),
        disabled: !clicked,
        onSelect: () => {
          if (clicked) onOpenItem(clicked.id);
        },
      },
      {
        kind: "item",
        id: "vault-copy-name",
        label: "Copy name",
        icon: Type,
        ...(clicked ? {} : { description: "Right-click an item" }),
        disabled: !clicked,
        onSelect: () => {
          if (clicked) void copyToClipboard(clicked.name, "Name copied");
        },
      },
    ],
  };

  return (
    <SurfaceRuntimeProvider
      surfaceName={VAULT_SURFACE_NAME}
      getScope={getSurfaceScope}
      isEditable={false}
    >
      <NonEditableContextMenu
        sourceFeature="system"
        surfaceName={VAULT_SURFACE_NAME}
        contentSource={{ type: "raw" }}
        getApplicationScope={getApplicationScope}
        resolveContextOnOpen={(target): ResolvedContextMenuContext | null => {
          setClickedId(itemIdAt(target));
          setRowEntries(rowMenuEntriesAt(target));
          // Values come from getApplicationScope; null keeps the entity key absent.
          return null;
        }}
        extraSections={[section]}
      >
        {children}
      </NonEditableContextMenu>
    </SurfaceRuntimeProvider>
  );
}
