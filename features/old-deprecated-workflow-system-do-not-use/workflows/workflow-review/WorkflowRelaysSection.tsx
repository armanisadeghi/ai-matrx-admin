import { useContext, useState } from "react";
import { WorkflowRelays, SimpleRelay } from "../../../../types/customWorkflowTypes";
import { BrokerHighlightContext } from "./WorkflowDetailContent";

// Clickable broker component that handles highlighting
function ClickableBroker({ brokerId, className = "" }: { brokerId: string; className?: string }) {
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

interface WorkflowRelaysSectionProps {
    workflowRelays?: WorkflowRelays;
}

export function WorkflowRelaysSection({ workflowRelays }: WorkflowRelaysSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const simpleRelays = workflowRelays?.simple_relays || [];
    const relayChains = workflowRelays?.relay_chains || [];
    const bidirectionalRelays = workflowRelays?.bidirectional_relays || [];
    
    const totalRelays = simpleRelays.length + relayChains.length + bidirectionalRelays.length;

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="border-2 border-emerald-200 dark:border-emerald-700 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 hover:shadow-md transition-all duration-200">
            {/* Clickable Header */}
            <div 
                className="p-4 cursor-pointer select-none"
                onClick={toggleExpanded}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500 dark:bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            🔗
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                                Workflow Relays
                            </h3>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                                {totalRelays} {totalRelays === 1 ? 'relay' : 'relays'} configured
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                            {totalRelays}
                        </div>
                        <div className={`transition-transform duration-200 text-emerald-600 dark:text-emerald-400 ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="px-4 pb-4">
                    <div className="space-y-4">
                        {/* Simple Relays - Always show */}
                        <div>
                            <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-3">
                                Simple Relays ({simpleRelays.length})
                            </h4>
                            {simpleRelays.length > 0 ? (
                                <div className="space-y-3">
                                    {simpleRelays.map((relay, index) => (
                                        <SimpleRelayCard key={index} relay={relay} index={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-textured rounded-lg border border-emerald-200 dark:border-emerald-600">
                                    <div className="text-lg mb-1">🔗</div>
                                    <p className="text-xs">No simple relays configured</p>
                                </div>
                            )}
                        </div>

                        {/* Bidirectional Relays - Always show */}
                        <div>
                            <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-3">
                                Bidirectional Relays ({bidirectionalRelays.length})
                            </h4>
                            {bidirectionalRelays.length > 0 ? (
                                <div className="space-y-3">
                                    {bidirectionalRelays.map((relay, index) => (
                                        <BidirectionalRelayCard key={index} relay={relay} index={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-textured rounded-lg border border-emerald-200 dark:border-emerald-600">
                                    <div className="text-lg mb-1">↔️</div>
                                    <p className="text-xs">No bidirectional relays configured</p>
                                </div>
                            )}
                        </div>

                        {/* Relay Chains - Always show */}
                        <div>
                            <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-3">
                                Relay Chains ({relayChains.length})
                            </h4>
                            {relayChains.length > 0 ? (
                                <div className="space-y-3">
                                    {relayChains.map((chain, index) => (
                                        <RelayChainCard key={index} chain={chain} index={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-textured rounded-lg border border-emerald-200 dark:border-emerald-600">
                                    <div className="text-lg mb-1">⛓️</div>
                                    <p className="text-xs">No relay chains configured</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface SimpleRelayCardProps {
    relay: SimpleRelay;
    index: number;
}

function SimpleRelayCard({ relay, index }: SimpleRelayCardProps) {
    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const isSourceHighlighted = highlightedBroker === relay.source;
    const isAnyTargetHighlighted = relay.targets.some(target => highlightedBroker === target);
    const isHighlighted = isSourceHighlighted || isAnyTargetHighlighted;

    return (
        <div className={`bg-textured rounded-lg p-3 border border-orange-200 dark:border-orange-700 transition-all duration-200 ${
            isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600' : ''
        }`}>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                </div>
                <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                    Simple Relay
                </span>
            </div>
            
            <div className="space-y-3">
                <div>
                    <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">Source:</span>
                    <div className="text-sm font-mono text-orange-900 dark:text-orange-100 mt-1 bg-orange-50 dark:bg-orange-900/30 rounded p-2 border border-orange-200 dark:border-orange-600">
                        <ClickableBroker brokerId={relay.source} />
                    </div>
                </div>
                
                <div>
                    <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                        Targets ({relay.targets.length}):
                    </span>
                    <div className="mt-2 space-y-2">
                        {relay.targets.map((target, idx) => (
                            <div key={idx} className="text-sm font-mono text-orange-900 dark:text-orange-100 bg-orange-50 dark:bg-orange-900/30 rounded p-2 border border-orange-200 dark:border-orange-600">
                                <ClickableBroker brokerId={target} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface BidirectionalRelayCardProps {
    relay: {
        broker_a: string;
        broker_b: string;
    };
    index: number;
}

function BidirectionalRelayCard({ relay, index }: BidirectionalRelayCardProps) {
    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const isBrokerAHighlighted = highlightedBroker === relay.broker_a;
    const isBrokerBHighlighted = highlightedBroker === relay.broker_b;
    const isHighlighted = isBrokerAHighlighted || isBrokerBHighlighted;

    return (
        <div className={`bg-textured rounded-lg p-3 border border-blue-200 dark:border-blue-700 transition-all duration-200 ${
            isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600' : ''
        }`}>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                </div>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Bidirectional Relay
                </span>
            </div>
            
            <div className="space-y-3">
                <div>
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Broker A:</span>
                    <div className="text-sm font-mono text-blue-900 dark:text-blue-100 mt-1 bg-blue-50 dark:bg-blue-900/30 rounded p-2 border border-blue-200 dark:border-blue-600">
                        <ClickableBroker brokerId={relay.broker_a} />
                    </div>
                </div>
                
                <div>
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Broker B:</span>
                    <div className="text-sm font-mono text-blue-900 dark:text-blue-100 mt-1 bg-blue-50 dark:bg-blue-900/30 rounded p-2 border border-blue-200 dark:border-blue-600">
                        <ClickableBroker brokerId={relay.broker_b} />
                    </div>
                </div>
            </div>
            
            {/* Visual Flow */}
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-mono text-center">
                    <ClickableBroker brokerId={relay.broker_a} /> ↔ <ClickableBroker brokerId={relay.broker_b} />
                </div>
            </div>
        </div>
    );
}

interface RelayChainCardProps {
    chain: any[];
    index: number;
}

function RelayChainCard({ chain, index }: RelayChainCardProps) {
    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const chainBrokers = Array.isArray(chain) ? chain.flat().filter(item => typeof item === 'string') : [];
    const isHighlighted = chainBrokers.some(broker => highlightedBroker === broker);

    return (
        <div className={`bg-textured rounded-lg p-3 border border-purple-200 dark:border-purple-700 transition-all duration-200 ${
            isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600' : ''
        }`}>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                </div>
                <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                    Relay Chain ({chain.length} steps)
                </span>
            </div>
            
            <div className="space-y-2">
                {chain.map((step, idx) => (
                    <div key={idx} className="text-sm font-mono text-purple-900 dark:text-purple-100 bg-purple-50 dark:bg-purple-900/30 rounded p-2 border border-purple-200 dark:border-purple-600">
                        <span className="text-xs text-purple-600 dark:text-purple-400">Step {idx + 1}: </span>
                        {typeof step === 'string' ? (
                            <ClickableBroker brokerId={step} />
                        ) : (
                            <span>{JSON.stringify(step)}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
} 