"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveSession,
  selectFetchStatus,
} from "../redux/selectors";
import { ActiveSessionView } from "./ActiveSessionView";
import { EmptySessionState } from "./EmptySessionState";
import { StudioSidebar } from "./StudioSidebar";

interface StudioLayoutProps {
  className?: string;
  showSidebar?: boolean;
  defaultColumnLayout?: Record<string, number>;
}

export function StudioLayout({
  className,
  showSidebar = true,
  defaultColumnLayout,
}: StudioLayoutProps) {
  const activeSession = useAppSelector(selectActiveSession);
  const fetchStatus = useAppSelector(selectFetchStatus);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <div
      className={cn(
        "flex h-page min-h-0 w-full overflow-hidden",
        className,
      )}
    >
      {showSidebar && (
        <aside className="hidden w-72 shrink-0 md:flex">
          <StudioSidebar
            className="w-full"
            onPickSession={closeMobileSidebar}
            onCreateSession={closeMobileSidebar}
          />
        </aside>
      )}

      <main className="flex flex-1 min-w-0 flex-col">
        {showSidebar && (
          <div className="flex shrink-0 items-center border-b border-border bg-textured h-9 md:hidden">
            <Sheet
              open={mobileSidebarOpen}
              onOpenChange={setMobileSidebarOpen}
            >
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="m-1 h-7 w-7"
                  aria-label="Open studio sidebar"
                >
                  <Menu className="h-3.5 w-3.5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0 pb-safe">
                <StudioSidebar
                  className="h-full"
                  onPickSession={closeMobileSidebar}
                  onCreateSession={closeMobileSidebar}
                />
              </SheetContent>
            </Sheet>
            {activeSession && (
              <div className="flex-1 truncate px-2 text-xs font-medium text-foreground">
                {activeSession.title}
              </div>
            )}
          </div>
        )}

        {fetchStatus === "loading" && !activeSession ? (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            Loading sessions…
          </div>
        ) : activeSession ? (
          <ActiveSessionView
            session={activeSession}
            defaultColumnLayout={defaultColumnLayout}
          />
        ) : (
          <EmptySessionState />
        )}
      </main>
    </div>
  );
}
