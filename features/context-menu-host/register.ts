/**
 * THE APP'S CONTEXT MENU HOST — registered once at boot (imported for its side
 * effect by providers/ChatHostAdapter.tsx).
 *
 * This file is shell-reachable, so it holds only what is already in the shell
 * (confirm, the manual-copy door, the listening home, the render-definition
 * selector). Everything heavier — the overlay openers behind `useBindings`, the
 * surface-manifest registry, the rich-document action handlers and the
 * document review — is `./on-open`, loaded by the engine WITH the menu body on
 * first open (`loadOnOpen`), never at boot.
 */
import "./host-types";
import { configureContextMenuHost } from "@ai-matrx/context-menu/engine";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { showManualCopy } from "@/components/dialogs/clipboard-fallback/manualCopyOpener";
import { LISTENING_HOME_SURFACE } from "@/features/audio/service/listeningConfig";
import { selectAllContentBlocksArray } from "@/features/agent-connections/redux/skl/content-block-compat";
import type { RootState } from "@/lib/redux/store";

configureContextMenuHost({
  confirm,
  showManualCopy,
  listeningHomeSurface: LISTENING_HOME_SURFACE,
  selectRenderDefinitions: (state) => selectAllContentBlocksArray(state as RootState),
  loadOnOpen: () => import("./on-open").then((m) => m.onOpenMembers),
});
