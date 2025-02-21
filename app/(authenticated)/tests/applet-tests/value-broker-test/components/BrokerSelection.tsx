import React from "react";

const BrokerSelection = ({ selectedId, setSelectedId, handleAddBroker, ALL_BROKER_IDS }) => {
    return (
        <div className="flex gap-4 mb-8">
            <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 p-2 border rounded shadow-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            >
                <option value="">Select a broker ID</option>
                {ALL_BROKER_IDS.map((id) => (
                    <option key={id} value={id}>
                        {id}
                    </option>
                ))}
            </select>
            <button
                onClick={handleAddBroker}
                disabled={!selectedId}
                className="px-4 py-2 bg-blue-500 text-white rounded shadow-sm hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Add Broker
            </button>
        </div>
    );
};

export default BrokerSelection;