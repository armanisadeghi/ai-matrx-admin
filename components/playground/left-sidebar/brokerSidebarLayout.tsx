"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { type ReactNode } from "react";

interface BrokerSidebarProps {
  children: ReactNode;
  topComponent?: ReactNode;
}

export default function BrokerSidebar({
  children,
  topComponent
}: BrokerSidebarProps) {
  return (
    <div className="flex flex-col h-full py-3">
      {topComponent}
      <ScrollArea className="flex-1">
        {children}
      </ScrollArea>
    </div>
  );
}
