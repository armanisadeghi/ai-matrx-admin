"use client";

import React from "react";
import { AnimatePresence } from "motion/react";
import { broker as brokerSchema } from "@/utils/schema/initialTableSchemas";
import { ScrollArea } from "@/components/ui/scroll-area";
// @ts-ignore - BrokerEditor is commented out, file is not a module
import BrokerEditor from "./BrokerEditor";
import QuickRefSearchableSelect from "@/app/entities/quick-reference/dynamic-quick-ref/QuickRefSearchableSelect";
import { BrokerData } from "@/types/AutomationSchemaTypes";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";

interface BrokerRecord {
  id: string;
  isDeleted?: boolean;
  [key: string]: any;
}

interface BrokerSidebarProps {
  selectedBroker?: QuickReferenceRecord;
  onBrokerChange?: (brokerQuickRef: QuickReferenceRecord) => void;
  initialSelectedBroker?: QuickReferenceRecord;
}

export default function BrokerSidebar({
  selectedBroker: externalSelectedBroker,
  onBrokerChange: externalOnBrokerChange,
  initialSelectedBroker,
}: BrokerSidebarProps) {
  const [internalSelectedBroker, setInternalSelectedBroker] = React.useState<QuickReferenceRecord | undefined>(
    initialSelectedBroker
  );

  const selectedBroker = externalSelectedBroker ?? internalSelectedBroker;
  const handleBrokerChange = (brokerQuickRef: QuickReferenceRecord) => {
    if (externalOnBrokerChange) {
      externalOnBrokerChange(brokerQuickRef);
    } else {
      setInternalSelectedBroker(brokerQuickRef);
    }
  };

  // TODO: Implement broker provider/hook
  // @ts-ignore - Missing broker provider implementation
  const brokers = {} as Record<string, BrokerRecord>;
  // @ts-ignore - Missing broker provider implementation
  const updateBroker = ((id: string, data: any) => {}) as any;
  // @ts-ignore - Missing broker provider implementation
  const deleteBroker = ((id: string) => {}) as any;

  return (
    <div className="flex flex-col h-full py-3">
      <QuickRefSearchableSelect
        entityKey="broker"
        initialSelectedRecord={selectedBroker}
        onRecordChange={handleBrokerChange}
      />

      <ScrollArea className="flex-1">
        <AnimatePresence>
          {Object.values(brokers)
            .filter((b: BrokerRecord) => !b.isDeleted)
            .map((variable: BrokerRecord) => (
              <BrokerEditor
                key={variable.id}
                data={variable}
                onChange={(data: any) => updateBroker(variable.id, data)}
                onDelete={() => deleteBroker(variable.id)}
              />
            ))}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}