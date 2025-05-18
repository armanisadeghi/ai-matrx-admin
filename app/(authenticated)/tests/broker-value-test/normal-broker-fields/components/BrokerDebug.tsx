import { brokerSelectors } from "@/lib/redux/brokerSlice";
import { useAppSelector } from "@/lib/redux";
import { BrokerIdentifier } from "@/lib/redux/brokerSlice/types";

function BrokerDebug({ brokerMappedItems }: { brokerMappedItems: Record<string, BrokerIdentifier> }) {
  const brokerMap = useAppSelector(brokerSelectors.selectMap);
  
  const brokerMappingDetails = Object.entries(brokerMappedItems).map(([key, brokerMappedItem]) => {
    let mapEntry = null;
    if (brokerMappedItem.source && brokerMappedItem.id) {
      const mapKey = `${brokerMappedItem.source}:${brokerMappedItem.id}`;
      mapEntry = brokerMap[mapKey];
    }
    return { key, brokerMappedItem, mapEntry };
  });

  const brokerValues = useAppSelector(state => {
    const result: Record<string, any> = {};
    Object.entries(brokerMappedItems).forEach(([key, brokerMappedItem]) => {
      result[key] = brokerSelectors.selectValueWithoutBrokerId(state, brokerMappedItem);
    });
    return result;
  });

  const brokerHasValues = useAppSelector(state => {
    const result: Record<string, boolean> = {};
    Object.entries(brokerMappedItems).forEach(([key, brokerMappedItem]) => {
      result[key] = brokerSelectors.selectHasValue(state, brokerMappedItem);
    });
    return result;
  });

  const getValueStatus = (key: string) => {
    if (!brokerHasValues[key]) return "Not set";
    if (brokerValues[key] === null) return "Explicitly null";
    if (brokerValues[key] === "") return "Empty string";
    return "Set";
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-auto">
      <table className="w-full text-sm text-left text-gray-800 dark:text-gray-300">
        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-2">Mapping Key</th>
            <th className="px-4 py-2">Mapping Details</th>
            <th className="px-4 py-2">Value Status</th>
            <th className="px-4 py-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {brokerMappingDetails.map(({ key, brokerMappedItem, mapEntry }) => (
            <tr key={key} className="border-b border-gray-200 dark:border-gray-700">
              <td className="px-4 py-2 font-medium">{key}</td>
              <td className="px-4 py-2 font-mono text-xs">
                {brokerMappedItem.brokerId ? (
                  <span>brokerId: {brokerMappedItem.brokerId}</span>
                ) : (
                  <span>
                    source: {brokerMappedItem.source}, id: {brokerMappedItem.id}
                    {mapEntry && <div className="mt-1 text-gray-500 dark:text-gray-400">mapped to: {mapEntry.brokerId}</div>}
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                <span 
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${getValueStatus(key) === "Not set" 
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300" 
                      : getValueStatus(key) === "Explicitly null" 
                      ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300"
                      : getValueStatus(key) === "Empty string"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300"
                      : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
                    }`}
                >
                  {getValueStatus(key)}
                </span>
              </td>
              <td className="px-4 py-2 font-mono">
                {brokerHasValues[key] ? (
                  <div className="max-w-xs truncate">
                    {JSON.stringify(brokerValues[key])}
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">undefined</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BrokerDebug;