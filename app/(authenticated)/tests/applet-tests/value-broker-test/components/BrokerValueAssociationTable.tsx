import React from "react";

const BrokerValueAssociationTable = ({ brokerToValueAssociation }) => {
    return (
        <div className="mb-8">
            <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Broker to Value Association</h2>
            {brokerToValueAssociation && brokerToValueAssociation.size > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Broker ID
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Temp ID
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Data Type
                                </th>
                                <th className="p-2 text-left border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white">
                                    Value
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from(brokerToValueAssociation.entries()).map(([id, association], index) => (
                                <tr key={`association-${id}-${index}`} className="border-b border-gray-300 dark:border-gray-600">
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {id}
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {association.tempId}
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        {association.dataType}
                                    </td>
                                    <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200">
                                        <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(association.value, null, 2)}</pre>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-600 dark:text-gray-400 italic">No broker to value associations available</p>
            )}
        </div>
    );
};

export default BrokerValueAssociationTable;