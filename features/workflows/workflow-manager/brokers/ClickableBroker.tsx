import { useContext } from "react";
import { BrokerHighlightContext } from "./BrokerHighlightContext";

// Clickable broker component that handles highlighting
export function ClickableBroker({ brokerId, className = "" }: { brokerId: string; className?: string }) {
    const { highlightedBroker, setHighlightedBroker } = useContext(BrokerHighlightContext);
    const isHighlighted = highlightedBroker === brokerId;
    
    return (
        <span
            className={`cursor-pointer transition-all duration-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 px-1 rounded ${
                isHighlighted ? 'bg-yellow-300 dark:bg-yellow-600 ring-2 ring-yellow-400 dark:ring-yellow-500' : ''
            } ${className}`}
            onClick={() => setHighlightedBroker(isHighlighted ? null : brokerId)}
            title={`Click to highlight all occurrences of broker: ${brokerId}`}
        >
            {brokerId}
        </span>
    );
}
