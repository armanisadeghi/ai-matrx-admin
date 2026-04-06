"use client";

import PageHeaderPortal from "@/features/shell/components/header/PageHeaderPortal";
import { FaIndent } from "react-icons/fa6";

export default function PromptsSSRHeader() {
  return (
    <PageHeaderPortal>
      <div className="flex items-center justify-center w-full">
        <div className="flex items-center gap-2">
          <FaIndent className="h-5 w-5 text-primary flex-shrink-0" />
          <h1 className="text-base font-bold text-foreground">Prompts</h1>
        </div>
      </div>
    </PageHeaderPortal>
  );
}
