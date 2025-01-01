// components/BrokerChip.tsx
"use client";

import React, { useCallback } from "react";
import { X, Edit2 } from "lucide-react";
import { useBrokers, BrokersProvider, type Broker } from '@/providers/brokers/BrokersProvider';

interface BrokerChipProps {
  broker: Broker;
  onRemoveRequest: () => void;
  className?: string;
}

export const BrokerChip: React.FC<BrokerChipProps> = ({
  broker,
  onRemoveRequest,
  className = ""
}) => {
  const { updateBroker } = useBrokers();

  const handleEdit = useCallback(() => {
    const newName = prompt('Enter new name:', broker.displayName);
    if (newName && newName !== broker.displayName) {
      updateBroker(broker.id, { displayName: newName });
    }
  }, [broker.id, broker.displayName, updateBroker]);

  return (
    <span
      contentEditable={false}
      className={`inline-flex items-center gap-1 px-2 py-1 m-1 text-sm rounded-full 
                 ${broker.color.light} ${broker.color.dark}
                 text-gray-900 dark:text-gray-100
                 select-none cursor-default ${className}`}
      data-chip
      data-broker-id={broker.id}
    >
      <span 
        className="chip-content"
        onDoubleClick={handleEdit}
      >
        {broker.displayName}
      </span>
      <div className="flex gap-1">
        <button
          onClick={handleEdit}
          className="inline-flex items-center hover:opacity-75
                     focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full"
          type="button"
          aria-label="Edit name"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={onRemoveRequest}
          className="inline-flex items-center hover:opacity-75
                     focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-full"
          type="button"
          aria-label="Remove"
        >
          <X size={14} />
        </button>
      </div>
    </span>
  );
};

export default BrokerChip;