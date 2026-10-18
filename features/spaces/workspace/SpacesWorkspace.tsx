"use client";

// features/spaces/workspace/SpacesWorkspace.tsx — sidebar + page, the Notion frame (§D, L2).
//
// Desktop: a resizable sidebar (drag its edge), Cmd+\ collapses it, and while collapsed the left edge
// reveals it on hover. Phone: the sidebar is a drawer (the same tree at every width; CSS hides the sidebar).

import { useIsMobile } from "@ai-matrx/kit/media-query";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";

import { DatabaseDesignerHost } from "../ai/DatabaseDesigner";
import { MoveInHost } from "../ai/MoveIn";
import { NotionImportHost } from "../io/NotionImport";
import { SpaceBuilderHost } from "../ai/SpaceBuilder";
import { QuickFind } from "../nav/QuickFind";
import { SpacesSidebarContent } from "../sidebar/SpacesSidebar";
import { SpacesProvider, useSpaces } from "../state/SpacesProvider";
import { useSpacesSidebarShortcut } from "./useSpacesSidebarShortcut";

const WIDTH_KEY = "spaces:sidebar-width";
const MIN = 200;
const MAX = 480;

export function SpacesFrame({ children }: { children: ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useSpaces();
  const isMobile = useIsMobile();
  const [width, setWidth] = useState(240);
  const [dragging, setDragging] = useState(false);
  const [peek, setPeek] = useState(false);
  const start = useRef<{ x: number; w: number } | null>(null);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(WIDTH_KEY));
    if (saved >= MIN && saved <= MAX) setWidth(saved);
  }, []);

  useSpacesSidebarShortcut(() => {
    setSidebarCollapsed(!sidebarCollapsed);
    setPeek(false);
  });

  return (
    <div className="spaces-frame" style={{ "--spaces-sidebar-w": `${width}px` } as React.CSSProperties}>
      {/* ONE TREE AT EVERY WIDTH (SPACES-REDRAW): the drawer, the sidebar and the page sit in the same places
          whatever the width, so the phone check answering after hydration (the server can only guess the
          width) never moves the page to another place in the tree — that remounted the whole page body and
          redrew it from scratch at phone widths. The width decides with CSS (spaces.css hides the sidebar
          under 768px); the phone check only opens the drawer and makes the hidden sidebar inert. */}
      <Drawer open={isMobile && mobileSidebarOpen} onOpenChange={setMobileSidebarOpen} direction="left">
        <DrawerContent className="spaces-drawer">
          <DrawerTitle className="sr-only">Spaces</DrawerTitle>
          <SpacesSidebarContent />
        </DrawerContent>
      </Drawer>
      <aside
        className="spaces-sidebar"
        data-collapsed={sidebarCollapsed ? "true" : undefined}
        data-peek={sidebarCollapsed && peek ? "true" : undefined}
        data-dragging={dragging ? "true" : undefined}
        inert={isMobile || (sidebarCollapsed && !peek)}
        onMouseLeave={() => setPeek(false)}
      >
        <SpacesSidebarContent onCollapse={() => setSidebarCollapsed(true)} />
        {!sidebarCollapsed ? (
          <div
            className="spaces-sidebar-resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              start.current = { x: e.clientX, w: width };
              setDragging(true);
            }}
            onPointerMove={(e) => {
              if (!start.current) return;
              setWidth(Math.min(MAX, Math.max(MIN, start.current.w + e.clientX - start.current.x)));
            }}
            onPointerUp={() => {
              start.current = null;
              setDragging(false);
              window.localStorage.setItem(WIDTH_KEY, String(width));
            }}
            onDoubleClick={() => {
              setWidth(240);
              window.localStorage.setItem(WIDTH_KEY, "240");
            }}
          />
        ) : null}
      </aside>
      {sidebarCollapsed ? <div className="spaces-peek-zone" onMouseEnter={() => setPeek(true)} aria-hidden /> : null}
      <main className="spaces-main">{children}</main>
      <QuickFind />
    </div>
  );
}

export function SpacesWorkspace({ children }: { children: ReactNode }) {
  const userId = useAppSelector(selectUserId);
  return (
    <SpacesProvider>
      <SpaceBuilderHost>
        <DatabaseDesignerHost userId={userId}>
          <MoveInHost userId={userId}>
            <NotionImportHost>
              <SpacesFrame>{children}</SpacesFrame>
            </NotionImportHost>
          </MoveInHost>
        </DatabaseDesignerHost>
      </SpaceBuilderHost>
    </SpacesProvider>
  );
}
