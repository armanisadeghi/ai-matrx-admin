"use client";

import React, { useCallback } from "react";
import { useBrokers, type Broker } from "@/providers/brokers/BrokersProvider";

interface BrokerActionButtonsProps {
  onBrokerCreate: (broker: Broker) => void;
  onBrokerConvert: (broker: Broker) => void;
  getSelectedText: () => string | null;
}

export const BrokerActionButtons: React.FC<BrokerActionButtonsProps> = ({
  onBrokerCreate,
  onBrokerConvert,
  getSelectedText,
}) => {
  console.log("BrokerActionButtons rendering");
  const { createBroker, convertSelectionToBroker } = useBrokers();
  console.log("BrokerActionButtons got brokers context");

  const handleCreateNewBroker = useCallback(() => {
    const broker = createBroker();
    onBrokerCreate(broker);
  }, [createBroker, onBrokerCreate]);

  const handleConvertToBroker = useCallback(() => {
    const selectedText =
      getSelectedText?.() || window.getSelection()?.toString();

    if (selectedText) {
      const broker = convertSelectionToBroker(selectedText);
      onBrokerConvert(broker);
    }
  }, [convertSelectionToBroker, getSelectedText, onBrokerConvert]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCreateNewBroker}
        className="px-3 py-1 rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
      >
        Insert New Broker
      </button>
      <button
        onClick={handleConvertToBroker}
        className="px-3 py-1 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700"
        disabled={!getSelectedText?.()}
      >
        Convert To Broker
      </button>
    </div>
  );
};

export default BrokerActionButtons;
