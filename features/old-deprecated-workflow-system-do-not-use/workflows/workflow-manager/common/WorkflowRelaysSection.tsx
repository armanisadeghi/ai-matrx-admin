import { useContext, useState } from "react";
import { WorkflowRelays, SimpleRelay } from "@/types/customWorkflowTypes";
import { BrokerHighlightContext } from "@/features/old-deprecated-workflow-system-do-not-use/workflows/workflow-manager/brokers/BrokerHighlightContext";
import { Link, ChevronDown, ArrowLeftRight, Cable, Target, ArrowRight } from "lucide-react";

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
        <div className="border border-emerald-200 dark:border-emerald-700 rounded-xl bg-gradient-to-br from-white via-emerald-50 to-teal-50 dark:from-slate-900 dark:via-emerald-900/20 dark:to-teal-950/20 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            {/* Clickable Header */}
            <div 
                className="p-6 cursor-pointer select-none hover:bg-gradient-to-br hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-emerald-800/30 dark:hover:to-teal-950/30 transition-all duration-200"
                onClick={toggleExpanded}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white rounded-xl flex items-center justify-center shadow-sm">
                                <Link className="w-6 h-6" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                <Cable className="w-2 h-2 text-white" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                                Workflow Relays
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-300">
                                <div className="flex items-center gap-1">
                                    <Target className="w-4 h-4" />
                                    <span>{totalRelays} {totalRelays === 1 ? 'relay' : 'relays'}</span>
                                </div>
                                {totalRelays > 0 && (
                                    <>
                                        <div className="w-1 h-1 bg-emerald-400 rounded-full"></div>
                                        <span>configured</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700">
                            {totalRelays}
                        </div>
                        <div className={`transition-transform duration-300 text-emerald-500 dark:text-emerald-400 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExpanded ? 'opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="px-6 pb-6">
                    <div className="space-y-6">
                        {/* Simple Relays */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <h4 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                                    Simple Relays ({simpleRelays.length})
                                </h4>
                            </div>
                            {simpleRelays.length > 0 ? (
                                <div className="space-y-4">
                                    {simpleRelays.map((relay, index) => (
                                        <SimpleRelayCard key={index} relay={relay} index={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-emerald-200/50 dark:border-emerald-600/50">
                                    <ArrowRight className="w-8 h-8 mx-auto mb-3 text-emerald-300 dark:text-emerald-600" />
                                    <p className="text-sm font-medium">No simple relays configured</p>
                                </div>
                            )}
                        </div>

                        {/* Bidirectional Relays */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <ArrowLeftRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <h4 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                                    Bidirectional Relays ({bidirectionalRelays.length})
                                </h4>
                            </div>
                            {bidirectionalRelays.length > 0 ? (
                                <div className="space-y-4">
                                    {bidirectionalRelays.map((relay, index) => (
                                        <BidirectionalRelayCard key={index} relay={relay} index={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-emerald-200/50 dark:border-emerald-600/50">
                                    <ArrowLeftRight className="w-8 h-8 mx-auto mb-3 text-emerald-300 dark:text-emerald-600" />
                                    <p className="text-sm font-medium">No bidirectional relays configured</p>
                                </div>
                            )}
                        </div>

                        {/* Relay Chains */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Cable className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <h4 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                                    Relay Chains ({relayChains.length})
                                </h4>
                            </div>
                            {relayChains.length > 0 ? (
                                <div className="space-y-4">
                                    {relayChains.map((chain, index) => (
                                        <RelayChainCard key={index} chain={chain} index={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-emerald-200/50 dark:border-emerald-600/50">
                                    <Cable className="w-8 h-8 mx-auto mb-3 text-emerald-300 dark:text-emerald-600" />
                                    <p className="text-sm font-medium">No relay chains configured</p>
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
        <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-orange-200/50 dark:border-orange-700/50 shadow-sm transition-all duration-200 ${
            isHighlighted ? 'bg-yellow-100/90 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-600' : ''
        }`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
                    {index + 1}
                </div>
                <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-base font-semibold text-orange-800 dark:text-orange-300">
                        Simple Relay
                    </span>
                </div>
            </div>
            
            <div className="space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">Source</span>
                    </div>
                    <div className="text-sm font-mono bg-orange-50/80 dark:bg-orange-900/30 backdrop-blur-sm rounded-lg p-3 border border-orange-200/50 dark:border-orange-600/50">
                        <ClickableBroker brokerId={relay.source} />
                    </div>
                </div>
                
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                            Targets ({relay.targets.length})
                        </span>
                    </div>
                    <div className="space-y-2">
                        {relay.targets.map((target, idx) => (
                            <div key={idx} className="text-sm font-mono bg-orange-50/80 dark:bg-orange-900/30 backdrop-blur-sm rounded-lg p-3 border border-orange-200/50 dark:border-orange-600/50">
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
        <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50 shadow-sm transition-all duration-200 ${
            isHighlighted ? 'bg-yellow-100/90 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-600' : ''
        }`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
                    {index + 1}
                </div>
                <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-base font-semibold text-blue-800 dark:text-blue-300">
                        Bidirectional Relay
                    </span>
                </div>
            </div>
            
            <div className="space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Broker A</span>
                    </div>
                    <div className="text-sm font-mono bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm rounded-lg p-3 border border-blue-200/50 dark:border-blue-600/50">
                        <ClickableBroker brokerId={relay.broker_a} />
                    </div>
                </div>
                
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Broker B</span>
                    </div>
                    <div className="text-sm font-mono bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm rounded-lg p-3 border border-blue-200/50 dark:border-blue-600/50">
                        <ClickableBroker brokerId={relay.broker_b} />
                    </div>
                </div>
            </div>
            
            {/* Visual Flow */}
            <div className="mt-4 pt-4 border-t border-blue-200/50 dark:border-blue-700/50">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-mono text-center bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200/30 dark:border-blue-600/30">
                    <div className="flex items-center justify-center gap-3">
                        <ClickableBroker brokerId={relay.broker_a} />
                        <ArrowLeftRight className="w-4 h-4" />
                        <ClickableBroker brokerId={relay.broker_b} />
                    </div>
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
        <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/50 shadow-sm transition-all duration-200 ${
            isHighlighted ? 'bg-yellow-100/90 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-600' : ''
        }`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 dark:from-purple-500 dark:to-purple-600 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
                    {index + 1}
                </div>
                <div className="flex items-center gap-2">
                    <Cable className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-base font-semibold text-purple-800 dark:text-purple-300">
                        Relay Chain ({chain.length} steps)
                    </span>
                </div>
            </div>
            
            <div className="space-y-3">
                {chain.map((step, idx) => (
                    <div key={idx} className="bg-purple-50/80 dark:bg-purple-900/30 backdrop-blur-sm rounded-lg p-3 border border-purple-200/50 dark:border-purple-600/50">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 rounded-full flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                            </div>
                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Step {idx + 1}</span>
                        </div>
                        <div className="text-sm font-mono text-purple-900 dark:text-purple-100 ml-7">
                            {typeof step === 'string' ? (
                                <ClickableBroker brokerId={step} />
                            ) : (
                                <span>{JSON.stringify(step)}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 