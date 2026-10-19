// features/shell/shell-layout/shellLayoutSlice.ts — THE HELD LAYOUTS (custom-experience §5.3, local-first).
//
// What the shell renders from after the first frame: the person's stored layout and the stored layouts of
// her organizations, exactly as the boot seed / the store carry them (raw body text, never a resolved
// tree — the trees are derived by `useResolvedShellLayout`, so this slice stays tiny and the reducer chunk
// never pulls the nav data).
//
// Sources, in order of authority:
//   1. the server's pick — `(core)/layout.tsx` seeds this slice from `iam.core_boot_seed().shell`
//      (`status: "ready"`), so the first client render is the server's render (no hydration mismatch);
//   2. the warm cache (`shellLayoutPolicy`: IndexedDB + localStorage mirror) — applied ONLY while the
//      server did not answer (`status: "unknown"`, the seed missed its deadline);
//   3. `remote.fetch` (`iam.shell_layout_seed`) — revalidates on boot and on focus; its answer is the
//      truth and replaces what is held;
//   4. a save in this tab or another (`shellLayoutStored`, broadcast) — a newer version only.
// Persisted state boots after hydration (lib/sync/FEATURE.md § Hydration boundary): nothing here paints
// from local storage before React has hydrated.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { definePolicy } from "@/lib/sync/policies/define";
import { REHYDRATE_ACTION_TYPE, type RehydrateAction } from "@/lib/sync/engine/rehydrate";
import type { ShellBootSeed, StoredShellLayout } from "./contract";
import { parseShellBootSeed } from "./seed";

/** Whose layout a write is: the person's own, or the organization's. */
export type ShellLayoutTarget = "person" | "organization";

export interface ShellLayoutState {
  /** True only where the (core) layout seeded the slice: other route groups keep the built-in default. */
  enabled: boolean;
  /** `ready` = the server (or the store) answered; `unknown` = the seed missed its deadline. */
  status: "ready" | "unknown";
  /** The person's own layout (newest across her organizations), or none. */
  person: StoredShellLayout | null;
  /** Organization layouts by organization id (only organizations that have one). */
  organizations: Record<string, StoredShellLayout>;
  /** The organization whose layout applies (the server's predicted organization, then the tab's active one). */
  organizationId: string | null;
  /** The Standard view switch (`matrx_shell_view=standard`). */
  standardView: boolean;
  /** The server reserved the nav column (customized cookie + seed miss): render a skeleton until known. */
  reserved: boolean;
  /** The organization lets members use their own layout (knob `shell.members_may_customize`); false = locked. */
  personAllowed: boolean;
  /**
   * The open layout editor's draft (serialized body), shown by the real shell while the editor is open —
   * the live preview. This tab only: never persisted, never broadcast. null = no editor open.
   */
  previewBody: string | null;
  /**
   * When this tab (or a peer, by broadcast) last wrote a layout (`Date.now()`). A store answer REQUESTED
   * before it predates that write and is ignored — otherwise a read in flight during a Save lands after
   * it and repaints the editor and shell with the layout from before the save (2026-10-19 walk: the
   * editor flashed the default 354-page menu after Save until a reload). Never persisted.
   */
  localWriteAt: number;
}

export const initialShellLayoutState: ShellLayoutState = {
  enabled: false,
  status: "unknown",
  person: null,
  organizations: {},
  organizationId: null,
  standardView: false,
  reserved: false,
  personAllowed: true,
  previewBody: null,
  localWriteAt: 0,
};

/** True when anything is stored for this viewer (drives the `matrx_shell` cookie and the Standard view switch). */
export function holdsShellLayout(state: Pick<ShellLayoutState, "person" | "organizations" | "organizationId">): boolean {
  if (state.person) return true;
  return state.organizationId !== null && state.organizations[state.organizationId] !== undefined;
}

/** A stored row is replaced only by a newer version of the same record, or a different record. */
function newer(held: StoredShellLayout | null | undefined, next: StoredShellLayout): boolean {
  if (!held) return true;
  if (held.recordId !== next.recordId) return next.updatedAt >= held.updatedAt;
  return next.version > held.version;
}

const shellLayoutSlice = createSlice({
  name: "shellLayout",
  initialState: initialShellLayoutState,
  reducers: {
    /** A save (here or in another tab): the stored row after the write. */
    shellLayoutStored: {
      reducer(state, action: PayloadAction<{ target: ShellLayoutTarget; stored: StoredShellLayout; at: number }>) {
        const { stored, target, at } = action.payload;
        if (target === "person") {
          if (newer(state.person, stored)) state.person = stored;
        } else if (newer(state.organizations[stored.organizationId], stored)) {
          state.organizations[stored.organizationId] = stored;
        }
        state.status = "ready";
        state.reserved = false;
        state.localWriteAt = Math.max(state.localWriteAt, at);
      },
      prepare: (payload: { target: ShellLayoutTarget; stored: StoredShellLayout; at?: number }) => ({
        payload: { ...payload, at: payload.at ?? Date.now() },
      }),
    },
    /** A layout was archived (cleared): the default (or the organization's) applies again. */
    shellLayoutCleared: {
      reducer(state, action: PayloadAction<{ target: ShellLayoutTarget; organizationId: string; at: number }>) {
        if (action.payload.target === "person") state.person = null;
        else delete state.organizations[action.payload.organizationId];
        state.localWriteAt = Math.max(state.localWriteAt, action.payload.at);
      },
      prepare: (payload: { target: ShellLayoutTarget; organizationId: string; at?: number }) => ({
        payload: { ...payload, at: payload.at ?? Date.now() },
      }),
    },
    /**
     * The store's answer (a revalidation, a late streamed seed): replaces what is held — unless it was
     * requested before this tab's last write (`requestedAt` < `localWriteAt`), when it is older than what
     * is held and is dropped. `requestedAt` absent = an answer with no request time (the boot seed).
     */
    shellLayoutLoaded: {
      reducer(state, action: PayloadAction<{ seed: ShellBootSeed | null; requestedAt: number | null }>) {
        const { seed, requestedAt } = action.payload;
        if (requestedAt !== null && requestedAt < state.localWriteAt) return;
        state.person = seed?.person ?? null;
        state.organizations = seed?.organizations ?? {};
        state.status = "ready";
        state.reserved = false;
      },
      prepare: (seed: ShellBootSeed | null, requestedAt?: number) => ({ payload: { seed, requestedAt: requestedAt ?? null } }),
    },
    shellLayoutOrganizationChanged(state, action: PayloadAction<string | null>) {
      state.organizationId = action.payload;
    },
    shellStandardViewChanged(state, action: PayloadAction<boolean>) {
      state.standardView = action.payload;
    },
    /** The organization's "Members may customize" knob, as this tab reads it for the applied organization. */
    shellPersonAllowedChanged(state, action: PayloadAction<boolean>) {
      state.personAllowed = action.payload;
    },
    /** The layout editor's live preview (its draft), or null when it closes. */
    shellLayoutPreviewChanged(state, action: PayloadAction<string | null>) {
      state.previewBody = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE_ACTION_TYPE, (state, action: RehydrateAction) => {
      if (action.payload.sliceName !== "shellLayout" || !state.enabled) return;
      const body = action.payload.state as Partial<ShellLayoutState> & { fromServer?: boolean; requestedAt?: number };
      if (body.fromServer) {
        // Asked before this tab's last write: the answer predates it (see `localWriteAt`).
        if (typeof body.requestedAt === "number" && body.requestedAt < state.localWriteAt) return;
        state.person = body.person ?? null;
        state.organizations = body.organizations ?? {};
        state.status = "ready";
        state.reserved = false;
        return;
      }
      // The device copy only fills a gap the server left (the seed missed its deadline): it never
      // overrides the server's fresher answer, and never resurrects a layout the server says is gone.
      if (state.status === "ready") return;
      state.person = body.person ?? null;
      state.organizations = body.organizations ?? {};
      state.status = "ready";
      state.reserved = false;
    });
  },
});

export const {
  shellLayoutStored,
  shellLayoutCleared,
  shellLayoutLoaded,
  shellLayoutOrganizationChanged,
  shellStandardViewChanged,
  shellPersonAllowedChanged,
  shellLayoutPreviewChanged,
} = shellLayoutSlice.actions;

export default shellLayoutSlice.reducer;

/** The server's seed → this slice's initial state (the (core) layout's `initialReduxState.shellLayout`). */
export function seedShellLayoutState(input: {
  seed: ShellBootSeed | null;
  /** The seed answered (false = it missed the first-byte deadline). */
  seedLanded: boolean;
  organizationId: string | null;
  standardView: boolean;
  reserved: boolean;
  /** The server's read of `shell.members_may_customize` (absent = allowed). */
  personAllowed?: boolean;
}): ShellLayoutState {
  return {
    enabled: true,
    status: input.seedLanded ? "ready" : "unknown",
    person: input.seed?.person ?? null,
    organizations: input.seed?.organizations ?? {},
    organizationId: input.organizationId,
    standardView: input.standardView,
    reserved: input.reserved,
    personAllowed: input.personAllowed !== false,
    previewBody: null,
    localWriteAt: 0,
  };
}

/** The store's answer for the held layouts (`iam.shell_layout_seed`, every organization of the caller). */
export async function fetchShellLayoutSeed(signal?: AbortSignal): Promise<ShellBootSeed | null | "failed"> {
  const { createClient } = await import("@/utils/supabase/client");
  const rpc = (createClient().schema("iam") as unknown as {
    rpc(name: string, args?: Record<string, unknown>): {
      abortSignal(signal: AbortSignal): PromiseLike<{ data: unknown; error: { message: string } | null }>;
    };
  }).rpc("shell_layout_seed", { p_organization_ids: null });
  const answer = await rpc.abortSignal(signal ?? new AbortController().signal);
  if (answer.error) {
    console.warn(`[shell-layout] iam.shell_layout_seed failed: ${answer.error.message}`);
    return "failed";
  }
  return parseShellBootSeed(answer.data, "iam.shell_layout_seed()");
}

export const shellLayoutPolicy = definePolicy<ShellLayoutState>({
  sliceName: "shellLayout",
  preset: "warm-cache",
  version: 1,
  identityScoped: true,
  broadcast: {
    actions: [
      "shellLayout/shellLayoutStored",
      "shellLayout/shellLayoutCleared",
      "shellLayout/shellLayoutLoaded",
      "shellLayout/shellStandardViewChanged",
    ],
  },
  storageKey: "matrx:shellLayout",
  partialize: ["person", "organizations"],
  // Only a known answer is stored: an `unknown` slice (seed missed, nothing loaded yet) must never
  // overwrite the device copy with "no layout".
  persistWhen: (state) => state.enabled && state.status === "ready",
  serialize: (state) => ({ person: state.person, organizations: state.organizations }),
  deserialize: (raw) => {
    if (!raw || typeof raw !== "object") return {};
    const r = raw as Record<string, unknown>;
    const seed = parseShellBootSeed({ person: r.person ?? null, organizations: r.organizations ?? {} }, "shellLayout cache");
    return {
      person: seed?.person ?? null,
      organizations: seed?.organizations ?? {},
      ...(r.fromServer === true ? ({ fromServer: true } as Partial<ShellLayoutState>) : {}),
      ...(typeof r.requestedAt === "number" ? ({ requestedAt: r.requestedAt } as Partial<ShellLayoutState>) : {}),
    };
  },
  remote: {
    // The version in hand is compared by the reducer; a fetch is one small RPC and only on boot / focus.
    fetch: async ({ signal, identity }) => {
      if (identity.type !== "auth") return null; // guests have no layouts and never call the store
      const requestedAt = Date.now();
      const seed = await fetchShellLayoutSeed(signal);
      if (seed === "failed") return null;
      return { fromServer: true, requestedAt, person: seed?.person ?? null, organizations: seed?.organizations ?? {} } as Partial<ShellLayoutState>;
    },
    cachePaintsOnly: true,
    revalidateOnFocus: true,
    revalidateOnFocusAfterMs: 60_000,
  },
});
