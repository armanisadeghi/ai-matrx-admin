import { useContext, useState } from "react";
import { UserInput } from "../../../../types/customWorkflowTypes";
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

interface UserInputsSectionProps {
    userInputs: UserInput[];
}

export function UserInputsSection({ userInputs }: UserInputsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="border-2 border-indigo-200 dark:border-indigo-700 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 hover:shadow-md transition-all duration-200">
            {/* Clickable Header */}
            <div 
                className="p-4 cursor-pointer select-none"
                onClick={toggleExpanded}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 dark:bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                            📝
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                                User Inputs
                            </h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                                {userInputs.length} {userInputs.length === 1 ? 'input' : 'inputs'} defined
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                            {userInputs.length}
                        </div>
                        <div className={`transition-transform duration-200 text-indigo-600 dark:text-indigo-400 ${isExpanded ? 'rotate-180' : ''}`}>
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
                    {userInputs.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <div className="text-2xl mb-2">📝</div>
                            <p className="text-sm">No user inputs defined</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {userInputs.map((input, index) => (
                                <UserInputCard key={index} input={input} index={index} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface UserInputCardProps {
    input: UserInput;
    index: number;
}

function UserInputCard({ input, index }: UserInputCardProps) {
    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const isHighlighted = highlightedBroker === input.broker_id;

    const formatValue = (value: any): string => {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    };

    const getValueType = (value: any): string => {
        if (typeof value === 'string') return 'Text';
        if (typeof value === 'number') return 'Number';
        if (typeof value === 'boolean') return 'Boolean';
        if (Array.isArray(value)) return 'Array';
        if (typeof value === 'object' && value !== null) return 'Object';
        return 'Unknown';
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'Text':
                return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
            case 'Number':
                return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
            case 'Boolean':
                return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
            case 'Array':
                return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200';
            case 'Object':
                return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
            default:
                return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
        }
    };

    const valueType = getValueType(input.value);
    const formattedValue = formatValue(input.value);

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg p-3 border border-indigo-200 dark:border-indigo-600 transition-all duration-200 ${
            isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600' : ''
        }`}>
            {/* Compact Header - Input number, broker ID, and type in one line */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                        Input {index + 1}:
                    </span>
                    <ClickableBroker 
                        brokerId={input.broker_id} 
                        className="font-mono text-sm text-indigo-900 dark:text-indigo-100 bg-indigo-50 dark:bg-indigo-900 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-600" 
                    />
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getTypeColor(valueType)}`}>
                    {valueType}
                </div>
            </div>

            {/* Value - takes full width below */}
            <div className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 rounded p-3 border border-gray-200 dark:border-gray-600">
                {valueType === 'Object' || valueType === 'Array' ? (
                    <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                        {formattedValue}
                    </pre>
                ) : (
                    <div className="break-words">
                        {formattedValue}
                    </div>
                )}
                
                {/* Inline stats for complex types */}
                {(valueType === 'Object' || valueType === 'Array') && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                        {valueType === 'Array' && Array.isArray(input.value) && (
                            <span>{input.value.length} items</span>
                        )}
                        {valueType === 'Object' && typeof input.value === 'object' && input.value !== null && (
                            <span>{Object.keys(input.value).length} properties</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}