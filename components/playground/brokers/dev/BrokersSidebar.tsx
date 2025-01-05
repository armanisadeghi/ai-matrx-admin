"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { broker as brokerSchema } from "@/utils/schema/initialTableSchemas";
import { ScrollArea } from "@/components/ui/scroll-area";
import BrokerEditor from "./BrokerEditor";
import QuickRefSearchableSelect from "@/app/entities/quick-reference/dynamic-quick-ref/QuickRefSearchableSelect";
import { BrokerData } from "@/types/AutomationSchemaTypes";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import MatrxSelectFloatinglabel from "@/components/matrx/MatrxSelectFloatingLabel";

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


  return (
    <div className="flex flex-col h-full py-3 space-y-3">
      <QuickRefSearchableSelect
        entityKey="broker"
        initialSelectedRecord={selectedBroker}
        onRecordChange={handleBrokerChange}
      />

      <ScrollArea className="flex-1">
        <AnimatePresence>
          {Object.values(brokers)
            .filter((b) => !b.isDeleted)
            .map((variable) => (
              <BrokerEditor
                key={variable.id}
                data={variable}
                onChange={(data) => updateBroker(variable.id, data)}
                onDelete={() => deleteBroker(variable.id)}
              />
            ))}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}