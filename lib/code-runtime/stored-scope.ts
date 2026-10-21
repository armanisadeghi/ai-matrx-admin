/**
 * The app-owned modules a STORED component's scope needs (kind components,
 * Applets, tool and emit renderers), handed to `@ai-matrx/code-runtime`'s ONE
 * documented registry. Nothing here decides what stored code may import — the
 * package's registry does — this only says where each host-owned module lives.
 *
 * `@/components/ui/*` are supplied from the app's own files so stored code
 * renders exactly as the app's screens do (most re-export the design system;
 * the eight that still wrap it fold into the design system later).
 *
 * Shared by the page and the kind sandbox frame: the frame's esbuild aliases
 * swap MarkdownStream and CopyForAiButton for frame-safe twins at
 * bundle time, so this file never knows which world it is in. It must stay
 * free of async `import()` (the frame bundle has no code splitting).
 */
import * as KindKit from "@ai-matrx/content-ir/kind-kit";
import * as Recharts from "recharts";
// Stored code may name ANY lucide icon and compiles synchronously, so this scope
// supplies the full set up front — exactly what @ai-matrx/code-runtime did itself
// before it made lucide lazy (2026-10-16). Moving this to an awaited prepare step
// is the follow-up that takes the set off these paths.
import * as Lucide from "lucide-react";
import { provideScopeModules, type ScopeModuleLoader } from "@ai-matrx/code-runtime/scope";
import "./kind-kit-host";

let provided = false;

/** Idempotent: call before any compile. */
export function provideStoredComponentScopeModules(): void {
  if (provided) return;
  provided = true;
  provideScopeModules(webScopeTwins());
}

/**
 * This app's own twins, under the same specifiers, of modules @ai-matrx/rich-content's one kind
 * component scope (`provideKindComponentScope`) also supplies: the page hands them to it as
 * replacements (app-scope.ts); the kind sandbox frame, which cannot carry that scope's async
 * loaders, registers them directly. Every other specifier comes from the shared scope.
 */
export function webScopeTwins(): Readonly<Record<string, ScopeModuleLoader>> {
  // Packages (kind-kit, recharts) are static ESM imports, never `require`: a
  // require resolves a package's CommonJS build, which drags a second (CJS)
  // copy of it — and of the design system — into the frame bundle beside the
  // ESM one (measured: 6.5 MB with require, 5.7 MB with these imports).
  const kindKit = () => KindKit;
  const markdown = () => require("@ai-matrx/chat/ui/markdown-stream/MarkdownStream");
  return {
    "@/components/MarkdownStream": markdown,
    "@/components/Markdown": markdown,
    "@/components/markdown": markdown,
    "@/components/mardown": markdown,
    "@/components/agent-copy/CopyButtons": () => require("@/components/agent-copy/CopyButtons"),
    "@/components/agent-copy/CopyForAiButton": () => require("@/components/agent-copy/CopyForAiButton"),
    // kind-kit lives in @ai-matrx/content-ir/react; its copy bar and read
    // notices are this app's (kind-kit-host.ts, registered above).
    "@/components/kind-kit/SortableList": kindKit,
    "@/components/kind-kit/KindPanelGrid": kindKit,
    "@/components/kind-kit/KindPanel": kindKit,
    "@/components/kind-kit/KindHeaderBar": kindKit,
    "@/components/kind-kit/KindActionButton": kindKit,
    "@/components/kind-kit/KindImage": kindKit,
    "@/components/kind-kit/KindFile": kindKit,
    "@/components/kind-kit/KindVideo": kindKit,
    "@/components/kind-kit/KindAudio": kindKit,
    "@/components/kind-kit/KindEmbed": kindKit,
    "@/components/kind-kit/KindLocale": kindKit,
    "@/components/kind-kit/StreamingSkeleton": kindKit,
    "@/components/kind-kit/TagList": kindKit,
    "@/lib/utils": () => require("@/lib/utils"),
    "@/components/ui/button": () => require("@/components/ui/button"),
    "@/components/ui/textarea": () => require("@/components/ui/textarea"),
    "@/components/ui/card": () => require("@/components/ui/card"),
    "@/components/ui/label": () => require("@/components/ui/label"),
    "@/components/ui/select": () => require("@/components/ui/select"),
    "@/components/ui/slider": () => require("@/components/ui/slider"),
    "@/components/ui/switch": () => require("@/components/ui/switch"),
    "@/components/ui/tabs": () => require("@/components/ui/tabs"),
    "@/components/ui/badge": () => require("@/components/ui/badge"),
    "@/components/ui/tooltip": () => require("@/components/ui/tooltip"),
    "@/components/ui/accordion": () => require("@/components/ui/accordion"),
    "@/components/ui/collapsible": () => require("@/components/ui/collapsible"),
    "@/components/ui/progress": () => require("@/components/ui/progress"),
    "@/components/ui/separator": () => require("@/components/ui/separator"),
    "@/components/ui/scroll-area": () => require("@/components/ui/scroll-area"),
    "@/components/ui/dialog": () => require("@/components/ui/dialog"),
    "@/components/ui/dropdown-menu": () => require("@/components/ui/dropdown-menu"),
    "@/components/ui/table": () => require("@/components/ui/table"),
    "@/components/ui/checkbox": () => require("@/components/ui/checkbox"),
    "@/components/ui/radio-group": () => require("@/components/ui/radio-group"),
    "@/components/ui/avatar": () => require("@/components/ui/avatar"),
    "@/components/ui/alert": () => require("@/components/ui/alert"),
    // input, sheet, popover and skeleton have no app export of that name: the
    // package's design-system default serves them (as the old registry did).
    recharts: () => Recharts,
    "lucide-react": () => Lucide,
  };
}
