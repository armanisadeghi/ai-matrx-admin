"use client";

import React from "react";
import { AnimatePresence } from "motion/react";
import { broker as brokerSchema } from "@/utils/schema/initialTableSchemas";
import { ScrollArea } from "@/components/ui/scroll-area";
// @ts-ignore - BrokerEditor is commented out, file is not a module
import BrokerEditor from "./BrokerEditor";
// @ts-ignore - Provider doesn't exist yet, using placeholder
import { useBrokers } from "@/providers/brokers/BrokersProvider";
import { BrokerData } from "@/types/AutomationSchemaTypes";
import QuickRefMultiSelect from "@/app/entities/quick-reference/QuickRefMultiSelect";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";

interface BrokerRecord {
  id: string;
  isDeleted?: boolean;
  [key: string]: any;
}

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

  // @ts-ignore - Provider doesn't exist yet
  const { brokers, createBroker, updateBroker, deleteBroker } = useBrokers() as {
    brokers: Record<string, BrokerRecord>;
    createBroker: (data: any) => void;
    updateBroker: (id: string, data: any) => void;
    deleteBroker: (id: string) => void;
  };

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
