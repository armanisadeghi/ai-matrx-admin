// QuickReferenceSection.tsx
import React from "react";
import { CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedCard } from "../../parts/EnhancedCard";
import { LayoutHeader } from "../../parts/LayoutHeader";
import { UnifiedLayoutProps } from "@/components/matrx/Entity/prewired-components/layouts/types";

export const QuickReferenceSection: React.FC<UnifiedLayoutProps> = (
  unifiedLayoutProps,
) => {
  const rightColumnRef = unifiedLayoutProps.layoutState.rightColumnRef;
  const quickRefRef = unifiedLayoutProps.layoutState.quickRefRef;
  const density = unifiedLayoutProps.dynamicStyleOptions.density || "normal";
  const QuickReferenceComponent = unifiedLayoutProps.QuickReferenceComponent;

  return (
    <div className="flex-1 min-h-0 mt-4">
      <EnhancedCard className="h-full" ref={rightColumnRef}>
        <LayoutHeader
          title="Quick Reference"
          tooltip="Quickly select or create records"
          density={density}
        />
        <CardContent className="p-0">
          <div ref={quickRefRef}>
            <ScrollArea>{QuickReferenceComponent}</ScrollArea>
          </div>
        </CardContent>
      </EnhancedCard>
    </div>
  );
};
