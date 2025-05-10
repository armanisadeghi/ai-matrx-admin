import { ALL_BROKER_IDS } from "@/features/applet/a-old-depricated-do-not-use/depricated-do-not-use-sample-mock-data/constants";
import React, { useState } from "react";

export const MultiBrokerAdder = ({ onAddBrokers }) => {
  const [selectedBrokers, setSelectedBrokers] = useState([]);

  const toggleBroker = (brokerId) => {
    if (selectedBrokers.includes(brokerId)) {
      setSelectedBrokers(selectedBrokers.filter(id => id !== brokerId));
    } else {
      setSelectedBrokers([...selectedBrokers, brokerId]);
    }
  };

  const handleAddAll = () => {
    if (selectedBrokers.length > 0) {
      onAddBrokers(selectedBrokers);
      setSelectedBrokers([]);
    }
  };

  return (
    <div className="mb-8 p-4 border rounded bg-gray-50 dark:bg-gray-700">
      <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Add Multiple Brokers</h2>
      
      <div className="mb-4 flex flex-wrap gap-2">
        {ALL_BROKER_IDS.map((brokerId) => (
          <label 
            key={brokerId}
            className={`
              inline-flex items-center gap-2 px-3 py-2 rounded cursor-pointer
              ${selectedBrokers.includes(brokerId) 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700' 
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'}
              border
            `}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={selectedBrokers.includes(brokerId)}
              onChange={() => toggleBroker(brokerId)}
            />
            <span className="text-xs font-medium">{brokerId.substring(0, 8)}...</span>
          </label>
        ))}
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {selectedBrokers.length} broker{selectedBrokers.length !== 1 ? 's' : ''} selected
        </span>
        <button
          onClick={handleAddAll}
          disabled={selectedBrokers.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded shadow-sm hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Add Selected Brokers
        </button>
      </div>
    </div>
  );
};

export default MultiBrokerAdder;