"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBrokers } from "@/providers/brokers/BrokersProvider";
import EntityMultiSelectForms from "@/app/entities/forms/EntityMultiSelectForms";
import {
  getUnifiedLayoutProps,
  getUpdatedUnifiedLayoutProps,
} from "@/app/entities/layout/configs";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";

const initialLayoutProps = getUnifiedLayoutProps({
  entityKey: "broker",
  quickReferenceType: "LIST",
  isExpanded: true,
  handlers: {},
});

const layoutProps = getUpdatedUnifiedLayoutProps(initialLayoutProps, {
  dynamicStyleOptions: {
    density: "compact",
    size: "sm",
  },
  dynamicLayoutOptions: {
    formStyleOptions: {
      fieldFiltering: {
        excludeFields: ["id", "otherSourceParams"],
        defaultShownFields: [
          "displayName",
          "value",
          "dataType",
          "defaultSource",
          "defaultDestination",
        ],
      }
    }
  }
});


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
  const [internalSelectedBroker, setInternalSelectedBroker] = React.useState<
    QuickReferenceRecord | undefined
  >(initialSelectedBroker);

  const selectedBroker = externalSelectedBroker ?? internalSelectedBroker;
  const handleBrokerChange = (brokerQuickRef: QuickReferenceRecord) => {
    if (externalOnBrokerChange) {
      externalOnBrokerChange(brokerQuickRef);
    } else {
      setInternalSelectedBroker(brokerQuickRef);
    }
  };

  const { brokers, createBroker, updateBroker, deleteBroker } = useBrokers();

  return (
    <div className="flex flex-col h-full py-3">
      <ScrollArea className="flex-1">
        <AnimatePresence>
          <EntityMultiSelectForms {...layoutProps} entitiesToHide={[]} />
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}
