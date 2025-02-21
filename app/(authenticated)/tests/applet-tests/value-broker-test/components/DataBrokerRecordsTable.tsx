import React from "react";
import { DataBrokerData } from "@/types";

const DataBrokerRecordsTable = ({ dataBrokerRecords }: { dataBrokerRecords: Record<string, DataBrokerData> }) => {
    return (
        <div className="mb-8">
            <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Data Broker Records</h2>
            {dataBrokerRecords && Object.keys(dataBrokerRecords).length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Broker ID
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Name
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Data Type
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Default Value
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Input Component
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(dataBrokerRecords).map(([id, data], index) => (
                                <tr key={`data-broker-${id}-${index}`} className="border-b border-gray-300 dark:border-gray-600">
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {id}
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {data.name || "N/A"}
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {data.dataType || "N/A"}
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data.defaultValue, null, 2)}</pre>
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {data.inputComponent || "N/A"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-600 dark:text-gray-400 italic">No data broker records available</p>
            )}
        </div>
    );
};

export default DataBrokerRecordsTable;