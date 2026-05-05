"use client";

import { ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/styles/themes/utils";
import type { ReactNode } from "react";

interface ModalContentFrameProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  children: ReactNode;
  className?: string;
}

export function ModalContentFrame({
  title,
  showBack,
  onBack,
  children,
  className,
}: ModalContentFrameProps) {
  return (
    <div className="flex h-full flex-col bg-[#111b21]">
      <div className="flex h-14 shrink-0 items-center gap-3 px-5">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#aebac1] hover:bg-[#2a3942]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : null}
        <h2 className="text-[20px] font-semibold text-[#e9edef]">{title}</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className={cn("px-5 pb-6", className)}>{children}</div>
      </ScrollArea>
    </div>
  );
}
