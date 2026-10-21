// FrameShell — the NEW app frame as the (core) shell, for a request the server picked it for
// (frameMode.server.ts; admins who opted in with `?frame=new`). Same props as AppShell; the
// (core) layout chooses between the two at its one render.
//
// Server Component. What it shares with AppShell is listed in FRAME_SHARED_SHELL_PARTS and a
// test keeps the two files in step (__tests__/frame-shell-parity.test.ts). The frame itself
// reaches the browser through ONE split point, FrameHostGate's dynamic() — so a classic page
// never downloads it (Fragmentation Law rule 3; guard `check:shell-eager-graph`).
//
// The CSS is imported HERE, on the server, so the frame paints styled with the first HTML:
// frame.css (every rule scoped to [data-matrx-frame]) and legacy-contracts.css (scoped to
// [data-matrx-frame-host]). The classic shell's stylesheets come too — pages and their header
// content are still written against them.
import "@/styles/shell.css";
import "@/features/shell/components/header/variants/header-variants.css";
import "@/features/shell/shell-layout/shell-looks.css";
import "@/features/shell/frame/frame.css";
import "./legacy-contracts.css";
import { Providers } from "@/app/Providers";
import VisualViewportSync from "@/features/shell/components/VisualViewportSync";
import FloatingClearanceSync from "@/features/shell/components/FloatingClearanceSync";
import ShellLayoutSync from "@/features/shell/shell-layout/ShellLayoutSync";
import DeferredIslands from "@/features/shell/islands/DeferredIslands";
import { SettingsRouteProvider } from "@/features/settings/route-shell/SettingsRouteProvider";
import type { UserData } from "@/utils/userDataMapper";
import type { BaseReduxState } from "@/types/reduxTypes";
import { readFrameGeometry } from "./frameGeometry.server";
import { FrameHostGate } from "./FrameHostGate";
// What this file shares with AppShell: FRAME_SHARED_SHELL_PARTS (./frameShellParts), kept in step by a test.


interface FrameShellProps {
  children: React.ReactNode;
  initialReduxState: BaseReduxState;
  userData: UserData;
  isAuthenticated: boolean;
  pathname: string;
  /** Unused by the frame (it remembers its own sidebar); kept so the props match AppShell's. */
  sidebarExpanded?: boolean;
}

export default async function FrameShell({ children, initialReduxState, userData, isAuthenticated, pathname }: FrameShellProps) {
  const initialGeometry = await readFrameGeometry(pathname);
  return (
    <Providers initialReduxState={initialReduxState}>
      <SettingsRouteProvider>
        <div data-matrx-frame-host="" data-pathname={pathname}>
          <FrameHostGate userData={userData} isAuthenticated={isAuthenticated} initialGeometry={initialGeometry}>
            {children}
          </FrameHostGate>
        </div>
      </SettingsRouteProvider>
      <VisualViewportSync />
      <FloatingClearanceSync />
      <ShellLayoutSync />
      <DeferredIslands />
    </Providers>
  );
}
