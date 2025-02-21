import React from "react";

const HookStatusDisplay = ({ isInitialized, addedBrokers, isReady = undefined }) => {
    return (
        <div className="mb-6 p-4 border rounded bg-gray-50 dark:bg-gray-700">
            <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Hook Status</h2>
            <div className="flex items-center gap-2">
                <span className="text-gray-700 dark:text-gray-300">Initialization Status:</span>
                <span
                    className={`font-medium ${
                        isInitialized ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                >
                    {isInitialized ? "Initialized" : "Initializing..."}
                </span>
            </div>
            {isReady !== undefined && (
                <div className="mt-2">
                    <span className="text-gray-700 dark:text-gray-300">Ready Status: </span>
                <span className={`font-medium ${isReady ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                >
                    {isReady ? "Ready" : "Not Ready"}
                    </span>
                </div>
            )}
            <div className="mt-2">
                <span className="text-gray-700 dark:text-gray-300">Added Broker IDs:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                    {addedBrokers.map((brokerId, index) => (
                        <span
                            key={`added-${brokerId}-${index}`}
                            className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded"
                        >
                            {brokerId.substring(0, 12)}...
                        </span>
                    ))}
                    {addedBrokers.length === 0 && <span className="text-gray-500 dark:text-gray-400 italic">None yet</span>}
                </div>
            </div>
        </div>
    );
};

export default HookStatusDisplay;