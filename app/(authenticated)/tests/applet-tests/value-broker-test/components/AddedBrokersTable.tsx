import React from "react";

const AddedBrokersTable = ({ initializedRecords }) => {
    return (
        <div className="mb-8">
            <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Added Brokers</h2>
            {initializedRecords && initializedRecords.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Record ID
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    User ID
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Data Broker
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Data Value
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {initializedRecords.map((record, index) => (
                                <tr key={`record-${index}`} className="border-b border-gray-300 dark:border-gray-600">
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {record ? record.id || "N/A" : "N/A"}
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {record && record.userId ? record.userId : "N/A"}
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {record && record.dataBroker ? record.dataBroker : "N/A"}
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {record && record.data ? (
                                            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(record.data, null, 2)}</pre>
                                        ) : (
                                            "N/A"
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-600 dark:text-gray-400 italic">No brokers added yet</p>
            )}
        </div>
    );
};

export default AddedBrokersTable;