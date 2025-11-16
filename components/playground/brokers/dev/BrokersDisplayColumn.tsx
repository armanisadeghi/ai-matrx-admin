"use client";

import React from "react";
import { AnimatePresence } from "motion/react";
import { broker as brokerSchema } from "@/utils/schema/initialTableSchemas";
import { ScrollArea } from "@/components/ui/scroll-area";
import BrokerEditor from "./BrokerEditor";
import { useBrokers } from "@/providers/brokers/BrokersProvider";
import { BrokerData } from "@/types/AutomationSchemaTypes";
import QuickRefMultiSelect from "@/app/entities/quick-reference/QuickRefMultiSelect";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";

interface BrokersDisplayColumnProps {
  initialSelectedBrokers?: QuickReferenceRecord[];
}

export default function BrokersDisplayColumn({
  initialSelectedBrokers,
}: BrokersDisplayColumnProps) {
  const [selectedBrokers, setSelectedBrokers] = React.useState<
    QuickReferenceRecord[] | undefined
  >(initialSelectedBrokers);

  const handleBrokersChange = (brokerQuickRefs: QuickReferenceRecord[]) => {
    setSelectedBrokers(brokerQuickRefs);
  };

  const { brokers, createBroker, updateBroker, deleteBroker } = useBrokers();

  return (
    <div className="flex flex-col h-full py-3">
      <QuickRefMultiSelect
        entityKey="broker"
        initialSelectedRecords={selectedBrokers}
        onRecordsChange={handleBrokersChange}
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
