"use client";

// THE ONE DOORWAY of the new app frame into the browser (ROLLOUT-PLAN §1, "Keeping the frame out of
// everyone else's download"). Rendered only when the server picked the frame (FrameShell), so the
// frame's chunk downloads only for those requests. ONE split point at the edge, SSR on (the frame
// is in the first HTML), a skeleton while the chunk arrives on a client render, and an error
// boundary: if the frame fails, the page still renders in a plain scroller with a way back.
//
// This file is the ONLY new module in the classic eager graph's reach; keep it tiny.
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import dynamic from "next/dynamic";
import type { UserData } from "@/utils/userDataMapper";
import type { FrameInitialGeometry } from "@/features/shell/frame/geometry";
import type { CanvasChatState } from "@ai-matrx/chat/canvas/workspace/workspace-cookies";
import type { ComposerMode } from "@ai-matrx/chat/agents/components/inputs/smart-input/composer/composer-types";
// The lazy twin: the full menu loads only if the frame ever fails (this file is in every eager graph).
import { LazyErrorAlchemyMenu as ErrorAlchemyMenu } from "@/components/errors/LazyErrorAlchemyMenu";

export interface FrameHostProps {
  userData: UserData;
  isAuthenticated: boolean;
  initialGeometry: FrameInitialGeometry;
  /**
   * The server's read for the side chat: this page's home's remembered open / closed (the Side
   * Chat's one cookie, shared with the classic dock; null = never chosen) and the composer mode.
   */
  sideChat: { choice: CanvasChatState | null; mode: ComposerMode | null };
  children: ReactNode;
}

function FrameSkeleton() {
  return <div data-frame-skeleton="" aria-busy="true" className="h-dvh w-full bg-textured" />;
}

const FrameHostImpl = dynamic(() => import("./FrameHostImpl"), { loading: FrameSkeleton });

class FrameBoundary extends Component<{ children: ReactNode; page: ReactNode }, { failed: unknown }> {
  override state: { failed: unknown } = { failed: null };

  static getDerivedStateFromError(error: unknown): { failed: unknown } {
    return { failed: error ?? new Error("the frame failed") };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("[frame-host] the new app frame failed; the page renders without it. Remedy: open the page with ?frame=classic.", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.failed === null) return this.props.children;
    return (
      <div className="flex h-dvh flex-col">
        <div role="alert" className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 text-sm text-muted-foreground">
          The new layout could not load.
          <a className="text-foreground underline" href="?frame=classic">
            Use the classic layout
          </a>
          <ErrorAlchemyMenu error={this.state.failed} />
        </div>
        <main className="shell-main min-h-0 flex-1">{this.props.page}</main>
      </div>
    );
  }
}

export function FrameHostGate({ children, ...props }: FrameHostProps) {
  return (
    <FrameBoundary page={children}>
      <FrameHostImpl {...props}>{children}</FrameHostImpl>
    </FrameBoundary>
  );
}
