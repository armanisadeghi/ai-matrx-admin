import { useContext } from "react";
import { BrokerHighlightContext } from "./BrokerHighlightContext";
import { ClickableBroker } from "./ClickableBroker";

// Unified broker display component
export function BrokerDisplay({ label, brokerId }: { label: string; brokerId: string | string[] }) {
    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const formattedBrokerId = Array.isArray(brokerId) ? brokerId.join(', ') : brokerId || 'None';
    const brokerIds = Array.isArray(brokerId) ? brokerId : [brokerId].filter(Boolean);
    const isAnyHighlighted = brokerIds.some(id => highlightedBroker === id);
    
    return (
        <div className={`flex items-center justify-between py-2 border-b border-green-200 dark:border-green-700/50 ${
            isAnyHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''
        }`}>
            <span className="text-sm font-semibold text-green-800 dark:text-green-200">{label}:</span>
            <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 dark:text-green-400">🔗</span>
                {brokerIds.length > 0 && brokerIds[0] !== 'None' ? (
                    <div className="flex flex-wrap gap-1">
                        {brokerIds.map((id, index) => (
                            <ClickableBroker
                                key={index}
                                brokerId={id}
                                className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-green-200 dark:border-green-600"
                            />
                        ))}
                    </div>
                ) : (
                    <span className="text-sm font-mono text-green-900 dark:text-green-100 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-green-200 dark:border-green-600">
                        None
                    </span>
                )}
            </div>
        </div>
    );
}





