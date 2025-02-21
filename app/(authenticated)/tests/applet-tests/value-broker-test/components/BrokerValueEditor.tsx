import { BrokerValueInfo } from "@/hooks/applets/useCreateAssociatedValueBrokers";
import React from "react";

interface BrokerValueEditorProps {
  brokerToValueAssociation: Map<string, BrokerValueInfo>;
  currentValue: (brokerId: string) => any;
  setValue: (brokerId: string, newValue: any) => void;
}


const BrokerValueEditor = ({ 
  brokerToValueAssociation,
  currentValue, 
  setValue 
}) => {
  if (!brokerToValueAssociation || brokerToValueAssociation.size === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Broker Value Editor</h2>
        <p className="text-gray-600 dark:text-gray-400 italic">No broker values to edit</p>
      </div>
    );
  }

  const handleValueChange = (brokerId, newValue) => {
    setValue(brokerId, newValue);
  };

  const renderInputForType = (brokerId, brokerInfo) => {
    const { dataType, value } = brokerInfo;
    
    switch (dataType) {
      case "str":
        return (
          <input
            type="text"
            value={currentValue(brokerId) ?? ""}
            onChange={(e) => handleValueChange(brokerId, e.target.value)}
            className="w-full p-2 border rounded shadow-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          />
        );
      
      case "bool":
        return (
          <div className="flex items-center">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={currentValue(brokerId) === true}
                onChange={(e) => handleValueChange(brokerId, e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                {currentValue(brokerId) ? "True" : "False"}
              </span>
            </label>
          </div>
        );
      
      case "int":
        return (
          <input
            type="number"
            value={currentValue(brokerId) ?? 0}
            onChange={(e) => handleValueChange(brokerId, parseInt(e.target.value, 10) || 0)}
            className="w-full p-2 border rounded shadow-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          />
        );
      
      default:
        return (
          <div className="text-amber-600 dark:text-amber-400">
            Unsupported data type: {dataType}
          </div>
        );
    }
  };
  
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Broker Value Editor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from(brokerToValueAssociation.entries()).map(([brokerId, brokerInfo]) => (
          <div key={brokerId} className="border rounded p-4 bg-white dark:bg-gray-800 shadow-sm">
            <div className="mb-2 font-medium text-gray-700 dark:text-gray-300">
              Broker ID: <span className="text-blue-600 dark:text-blue-400">{brokerId.substring(0, 12)}...</span>
            </div>
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              Type: <span className="font-mono">{brokerInfo.dataType}</span>
            </div>
            <div className="mb-4">
              {renderInputForType(brokerId, brokerInfo)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Current value: <pre className="inline font-mono">{JSON.stringify(currentValue(brokerId))}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrokerValueEditor;