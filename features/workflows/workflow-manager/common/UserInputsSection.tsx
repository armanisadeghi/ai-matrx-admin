import { useContext, useState } from "react";
import { UserInput } from "@/types/customWorkflowTypes";
import { BrokerHighlightContext } from "@/features/workflows/workflow-manager/brokers/BrokerHighlightContext";
import { Edit3, ChevronDown, FileText, Hash, ToggleLeft, List, Box, HelpCircle, Save, X, Check } from "lucide-react";

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
    onUpdate?: (userInputs: UserInput[]) => void;
}

export function UserInputsSection({ userInputs, onUpdate }: UserInputsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const handleInputUpdate = (index: number, updatedInput: UserInput) => {
        if (onUpdate) {
            const newInputs = [...userInputs];
            newInputs[index] = updatedInput;
            onUpdate(newInputs);
        }
    };

    const handleInputDelete = (index: number) => {
        if (onUpdate) {
            const newInputs = userInputs.filter((_, i) => i !== index);
            onUpdate(newInputs);
        }
    };

    return (
        <div className="border border-indigo-200 dark:border-indigo-700 rounded-xl bg-gradient-to-br from-white via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-indigo-900/20 dark:to-purple-950/20 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
            {/* Clickable Header */}
            <div 
                className="p-6 cursor-pointer select-none hover:bg-gradient-to-br hover:from-indigo-50/50 hover:to-purple-50/50 dark:hover:from-indigo-800/30 dark:hover:to-purple-950/30 transition-all duration-200"
                onClick={toggleExpanded}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 text-white rounded-xl flex items-center justify-center shadow-sm">
                                <Edit3 className="w-6 h-6" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                                <FileText className="w-2 h-2 text-white" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 mb-1">
                                User Inputs
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-indigo-700 dark:text-indigo-300">
                                <div className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    <span>{userInputs.length} {userInputs.length === 1 ? 'input' : 'inputs'}</span>
                                </div>
                                {userInputs.length > 0 && (
                                    <>
                                        <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                                        <span>defined</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-700">
                            {userInputs.length}
                        </div>
                        <div className={`transition-transform duration-300 text-indigo-500 dark:text-indigo-400 ${isExpanded ? 'rotate-180' : ''}`}>
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
                    {userInputs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl border border-indigo-200/50 dark:border-indigo-600/50">
                            <Edit3 className="w-12 h-12 mx-auto mb-4 text-indigo-300 dark:text-indigo-600" />
                            <p className="text-base font-medium">No user inputs defined</p>
                            <p className="text-sm mt-1 text-gray-400">User inputs will appear here when configured</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {userInputs.map((input, index) => (
                                <UserInputCard 
                                    key={index} 
                                    input={input} 
                                    index={index}
                                    onUpdate={(updatedInput) => handleInputUpdate(index, updatedInput)}
                                    onDelete={() => handleInputDelete(index)}
                                />
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
    onUpdate?: (input: UserInput) => void;
    onDelete?: () => void;
}

function UserInputCard({ input, index, onUpdate, onDelete }: UserInputCardProps) {
    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const isHighlighted = highlightedBroker === input.broker_id;
    
    const [isEditing, setIsEditing] = useState(false);
    const [editedValue, setEditedValue] = useState(input.value);

    const formatValue = (value: any): string => {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    };

    const parseValue = (valueString: string, originalType: string): any => {
        if (originalType === 'Number') {
            const num = Number(valueString);
            return isNaN(num) ? valueString : num;
        }
        if (originalType === 'Boolean') {
            return valueString.toLowerCase() === 'true';
        }
        if (originalType === 'Array' || originalType === 'Object') {
            try {
                return JSON.parse(valueString);
            } catch {
                return valueString;
            }
        }
        return valueString;
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
                return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
            case 'Number':
                return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
            case 'Boolean':
                return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700';
            case 'Array':
                return 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700';
            case 'Object':
                return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
            default:
                return 'bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Text':
                return <FileText className="w-3 h-3" />;
            case 'Number':
                return <Hash className="w-3 h-3" />;
            case 'Boolean':
                return <ToggleLeft className="w-3 h-3" />;
            case 'Array':
                return <List className="w-3 h-3" />;
            case 'Object':
                return <Box className="w-3 h-3" />;
            default:
                return <HelpCircle className="w-3 h-3" />;
        }
    };

    const valueType = getValueType(input.value);
    const formattedValue = formatValue(input.value);

    const handleSave = () => {
        if (onUpdate) {
            const parsedValue = parseValue(editedValue, valueType);
            onUpdate({
                ...input,
                value: parsedValue
            });
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedValue(input.value);
        setIsEditing(false);
    };

    const startEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditedValue(formatValue(input.value));
        setIsEditing(true);
    };

    return (
        <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-indigo-200/50 dark:border-indigo-600/50 shadow-sm transition-all duration-200 ${
            isHighlighted ? 'bg-yellow-100/90 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-600' : ''
        }`}>
            {/* Header with Input number, broker ID, type, and actions */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-500 dark:from-indigo-500 dark:to-indigo-600 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">
                        {index + 1}
                    </div>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                            Input:
                        </span>
                        <ClickableBroker 
                            brokerId={input.broker_id} 
                            className="font-mono text-sm bg-indigo-50/80 dark:bg-indigo-900/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-indigo-200/50 dark:border-indigo-600/50 min-w-0" 
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border ${getTypeColor(valueType)}`}>
                        {getTypeIcon(valueType)}
                        <span>{valueType}</span>
                    </div>
                    {isEditing ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleSave}
                                className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                title="Save changes"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleCancel}
                                className="p-1.5 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
                                title="Cancel changes"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={startEditing}
                                className="p-1.5 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                title="Edit value"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                            {onDelete && (
                                <button
                                    onClick={onDelete}
                                    className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="Delete input"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Value Display */}
            <div className="bg-gray-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200/50 dark:border-gray-600/50">
                {isEditing ? (
                    <div className="space-y-3">
                        {valueType === 'Object' || valueType === 'Array' ? (
                            <textarea
                                value={editedValue}
                                onChange={(e) => setEditedValue(e.target.value)}
                                className="w-full h-32 text-xs font-mono bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 resize-y focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter JSON..."
                            />
                        ) : valueType === 'Boolean' ? (
                            <select
                                value={editedValue.toString()}
                                onChange={(e) => setEditedValue(e.target.value)}
                                className="w-full text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="true">true</option>
                                <option value="false">false</option>
                            </select>
                        ) : (
                            <input
                                type={valueType === 'Number' ? 'number' : 'text'}
                                value={editedValue}
                                onChange={(e) => setEditedValue(e.target.value)}
                                className="w-full text-sm bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        )}
                    </div>
                ) : (
                    <>
                        {valueType === 'Object' || valueType === 'Array' ? (
                            <pre className="whitespace-pre-wrap font-mono text-xs text-gray-900 dark:text-gray-100 overflow-x-auto">
                                {formattedValue}
                            </pre>
                        ) : (
                            <div className="text-sm text-gray-900 dark:text-gray-100 break-words">
                                {formattedValue}
                            </div>
                        )}
                        
                        {/* Statistics for complex types */}
                        {(valueType === 'Object' || valueType === 'Array') && (
                            <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/50">
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    {valueType === 'Array' && Array.isArray(input.value) && (
                                        <div className="flex items-center gap-1">
                                            <List className="w-3 h-3" />
                                            <span>{input.value.length} items</span>
                                        </div>
                                    )}
                                    {valueType === 'Object' && typeof input.value === 'object' && input.value !== null && (
                                        <div className="flex items-center gap-1">
                                            <Box className="w-3 h-3" />
                                            <span>{Object.keys(input.value).length} properties</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        <span>{formattedValue.length} characters</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}