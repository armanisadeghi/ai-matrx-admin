import React from "react";

const RawDataDisplay = ({ initializedRecords, brokerToValueAssociation, dataBrokerRecords }) => {
    return (
        <div className="mt-16 border-t pt-8 border-gray-300 dark:border-gray-600">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Raw Data Objects</h2>

            {/* Initialized Records Raw Data */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Initialized Records</h3>
                {initializedRecords && initializedRecords.length > 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                        <pre className="whitespace-pre-wrap text-sm overflow-x-auto">{JSON.stringify(initializedRecords, null, 2)}</pre>
                    </div>
                ) : (
                    <p className="text-gray-600 dark:text-gray-400 italic">No data available</p>
                )}
            </div>

            {/* Broker to Value Association Raw Data */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Broker to Value Association</h3>
                {brokerToValueAssociation && brokerToValueAssociation.size > 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                        <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
                            {JSON.stringify(Object.fromEntries(brokerToValueAssociation), null, 2)}
                        </pre>
                    </div>
                ) : (
                    <p className="text-gray-600 dark:text-gray-400 italic">No data available</p>
                )}
            </div>

            {/* Data Broker Records Raw Data */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Data Broker Records</h3>
                {dataBrokerRecords && Object.keys(dataBrokerRecords).length > 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
                        <pre className="whitespace-pre-wrap text-sm overflow-x-auto">{JSON.stringify(dataBrokerRecords, null, 2)}</pre>
                    </div>
                ) : (
                    <p className="text-gray-600 dark:text-gray-400 italic">No data available</p>
                )}
            </div>
        </div>
    );
};

export default RawDataDisplay;