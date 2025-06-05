import { useContext, ReactNode, useState } from "react";
import { LucideIcon, Edit3, Save, X, ChevronDown, TestTube } from "lucide-react";
import { BrokerHighlightBadge, stepContainsBroker, WorkflowStepCardProps } from "../WorkflowStepsSection";
import { StatusDisplay } from "../common/StatusDisplay";
import { BrokerHighlightContext } from "../brokers/BrokerHighlightContext";
import { BrokerDisplay } from "../brokers/BrokerDisplay";
import StepTestOverlay from "@/features/old-deprecated-workflow-system-do-not-use/workflows/workflow-manager/common/StepTestOverlay";

// Utility function to convert snake_case to Title Case
function formatStepName(stepName: string): string {
    if (!stepName) return '';
    
    return stepName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

interface ColorTheme {
    gradientFrom: string;
    gradientTo: string;
    darkGradientFrom: string;
    darkGradientTo: string;
    borderColor: string;
    darkBorderColor: string;
    stepNumberBg: string;
    darkStepNumberBg: string;
    titleColor: string;
    darkTitleColor: string;
    stepNameColor: string;
    darkStepNameColor: string;
    expandIconColor: string;
    darkExpandIconColor: string;
}

const colorThemes: Record<string, ColorTheme> = {
    blue: {
        gradientFrom: "from-white via-blue-50",
        gradientTo: "to-indigo-50",
        darkGradientFrom: "dark:from-slate-800 dark:via-blue-900/20",
        darkGradientTo: "dark:to-indigo-950/20",
        borderColor: "border-blue-200/50",
        darkBorderColor: "dark:border-blue-700/50",
        stepNumberBg: "bg-gradient-to-br from-blue-500 to-blue-600",
        darkStepNumberBg: "dark:from-blue-600 dark:to-blue-700",
        titleColor: "text-blue-900",
        darkTitleColor: "dark:text-blue-100",
        stepNameColor: "text-blue-700",
        darkStepNameColor: "dark:text-blue-300",
        expandIconColor: "text-blue-600",
        darkExpandIconColor: "dark:text-blue-400"
    },
    green: {
        gradientFrom: "from-white via-green-50",
        gradientTo: "to-emerald-50",
        darkGradientFrom: "dark:from-slate-800 dark:via-green-900/20",
        darkGradientTo: "dark:to-emerald-950/20",
        borderColor: "border-green-200/50",
        darkBorderColor: "dark:border-green-700/50",
        stepNumberBg: "bg-gradient-to-br from-green-500 to-green-600",
        darkStepNumberBg: "dark:from-green-600 dark:to-green-700",
        titleColor: "text-green-900",
        darkTitleColor: "dark:text-green-100",
        stepNameColor: "text-green-700",
        darkStepNameColor: "dark:text-green-300",
        expandIconColor: "text-green-600",
        darkExpandIconColor: "dark:text-green-400"
    },
    orange: {
        gradientFrom: "from-white via-orange-50",
        gradientTo: "to-red-50",
        darkGradientFrom: "dark:from-slate-800 dark:via-orange-900/20",
        darkGradientTo: "dark:to-red-950/20",
        borderColor: "border-orange-200/50",
        darkBorderColor: "dark:border-orange-700/50",
        stepNumberBg: "bg-gradient-to-br from-orange-500 to-orange-600",
        darkStepNumberBg: "dark:from-orange-600 dark:to-orange-700",
        titleColor: "text-orange-900",
        darkTitleColor: "dark:text-orange-100",
        stepNameColor: "text-orange-700",
        darkStepNameColor: "dark:text-orange-300",
        expandIconColor: "text-orange-600",
        darkExpandIconColor: "dark:text-orange-400"
    },
    teal: {
        gradientFrom: "from-white via-teal-50",
        gradientTo: "to-cyan-50",
        darkGradientFrom: "dark:from-slate-800 dark:via-teal-900/20",
        darkGradientTo: "dark:to-cyan-950/20",
        borderColor: "border-teal-200/50",
        darkBorderColor: "dark:border-teal-700/50",
        stepNumberBg: "bg-gradient-to-br from-teal-500 to-teal-600",
        darkStepNumberBg: "dark:from-teal-600 dark:to-teal-700",
        titleColor: "text-teal-900",
        darkTitleColor: "dark:text-teal-100",
        stepNameColor: "text-teal-700",
        darkStepNameColor: "dark:text-teal-300",
        expandIconColor: "text-teal-600",
        darkExpandIconColor: "dark:text-teal-400"
    },
    amber: {
        gradientFrom: "from-white via-amber-50",
        gradientTo: "to-yellow-50",
        darkGradientFrom: "dark:from-slate-800 dark:via-amber-900/20",
        darkGradientTo: "dark:to-yellow-950/20",
        borderColor: "border-amber-200/50",
        darkBorderColor: "dark:border-amber-700/50",
        stepNumberBg: "bg-gradient-to-br from-amber-500 to-amber-600",
        darkStepNumberBg: "dark:from-amber-600 dark:to-amber-700",
        titleColor: "text-amber-900",
        darkTitleColor: "dark:text-amber-100",
        stepNameColor: "text-amber-700",
        darkStepNameColor: "dark:text-amber-300",
        expandIconColor: "text-amber-600",
        darkExpandIconColor: "dark:text-amber-400"
    },
    purple: {
        gradientFrom: "from-white via-purple-50",
        gradientTo: "to-violet-50",
        darkGradientFrom: "dark:from-slate-800 dark:via-purple-900/20",
        darkGradientTo: "dark:to-violet-950/20",
        borderColor: "border-purple-200/50",
        darkBorderColor: "dark:border-purple-700/50",
        stepNumberBg: "bg-gradient-to-br from-purple-500 to-purple-600",
        darkStepNumberBg: "dark:from-purple-600 dark:to-purple-700",
        titleColor: "text-purple-900",
        darkTitleColor: "dark:text-purple-100",
        stepNameColor: "text-purple-700",
        darkStepNameColor: "dark:text-purple-300",
        expandIconColor: "text-purple-600",
        darkExpandIconColor: "dark:text-purple-400"
    }
};

interface NodeWrapperProps extends Pick<WorkflowStepCardProps, 'step' | 'index' | 'isExpanded' | 'onToggle'> {
    title: string;
    icon: LucideIcon;
    colorTheme: keyof typeof colorThemes;
    children: ReactNode | ((props: { isEditing: boolean }) => ReactNode);
    showReturnBroker?: boolean;
    onEdit?: () => void;
    onSave?: () => void;
    onCancel?: () => void;
    allowEdit?: boolean;
    isEditing?: boolean; // External edit state - if provided, overrides internal state management
}

export function NodeWrapper({ 
    step, 
    index, 
    isExpanded, 
    onToggle, 
    title, 
    icon: Icon, 
    colorTheme,
    children,
    showReturnBroker = true,
    onEdit,
    onSave,
    onCancel,
    allowEdit = true,
    isEditing: externalIsEditing
}: NodeWrapperProps) {
    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const containsHighlightedBroker = highlightedBroker && stepContainsBroker(step, highlightedBroker);
    const theme = colorThemes[colorTheme];
    const [internalIsEditing, setInternalIsEditing] = useState(false);
    const [isTestOverlayOpen, setIsTestOverlayOpen] = useState(false);

    // Use external edit state if provided, otherwise use internal state
    const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;

    const handleEdit = () => {
        // If external control is used, don't update internal state
        if (externalIsEditing === undefined) {
            setInternalIsEditing(true);
        }
        onEdit?.();
    };

    const handleSave = () => {
        // If external control is used, don't update internal state
        if (externalIsEditing === undefined) {
            setInternalIsEditing(false);
        }
        onSave?.();
    };

    const handleCancel = () => {
        // If external control is used, don't update internal state
        if (externalIsEditing === undefined) {
            setInternalIsEditing(false);
        }
        onCancel?.();
    };

    const handleTestStep = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsTestOverlayOpen(true);
    };

    const formattedStepName = step.step_name ? formatStepName(step.step_name) : null;

    return (
        <>
            <div className={`border backdrop-blur-sm rounded-xl bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} ${theme.darkGradientFrom} ${theme.darkGradientTo} hover:shadow-lg transition-all duration-300 shadow-sm ${
                containsHighlightedBroker 
                    ? 'border-yellow-400/80 dark:border-yellow-500/80 shadow-yellow-300/60 dark:shadow-yellow-600/40 shadow-lg ring-2 ring-yellow-400/30 dark:ring-yellow-500/30' 
                    : `${theme.borderColor} ${theme.darkBorderColor}`
            } ${isEditing ? 'ring-2 ring-blue-500/50 dark:ring-blue-400/50 shadow-blue-200/50 dark:shadow-blue-900/30' : ''} ${
                isExpanded ? 'shadow-md' : ''
            }`}>
                {/* Compact Header */}
                <div 
                    className={`px-4 py-3 cursor-pointer select-none transition-all duration-200 ${
                        !isEditing ? 'hover:bg-white/30 dark:hover:bg-slate-700/30' : ''
                    } ${isExpanded ? 'border-b border-white/50 dark:border-slate-600/50' : ''}`}
                    onClick={isEditing ? undefined : onToggle}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-9 h-9 ${theme.stepNumberBg} ${theme.darkStepNumberBg} text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0`}>
                                {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className={`flex items-center gap-2 ${theme.titleColor} ${theme.darkTitleColor}`}>
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <h3 className="text-lg font-semibold truncate">
                                        {title}
                                    </h3>
                                </div>
                                {formattedStepName && (
                                    <p className={`text-sm ${theme.stepNameColor} ${theme.darkStepNameColor} font-medium truncate mt-0.5`}>
                                        {formattedStepName}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                            
                            {/* Test Button */}
                            <button
                                type="button"
                                onClick={handleTestStep}
                                className={`p-2 rounded-lg hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/50 dark:hover:to-blue-900/50 transition-all duration-200 hover:scale-110 text-purple-600 dark:text-purple-400 hover:shadow-md`}
                                title="Test this step via Socket.IO"
                            >
                                <TestTube className="w-4 h-4" />
                            </button>
                            {containsHighlightedBroker && <BrokerHighlightBadge />}
                            <StatusDisplay status={step.status} />
                            {/* Edit Controls */}
                            {allowEdit && !isEditing && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleEdit();
                                    }}
                                    className={`p-2 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all duration-200 hover:scale-110 ${theme.expandIconColor} ${theme.darkExpandIconColor}`}
                                    title="Edit node"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            )}
                            
                            {isEditing && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSave();
                                        }}
                                        className="p-2 rounded-lg hover:bg-green-100/80 dark:hover:bg-green-900/50 transition-all duration-200 hover:scale-110 text-green-600 dark:text-green-400 shadow-sm"
                                        title="Save changes"
                                    >
                                        <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleCancel();
                                        }}
                                        className="p-2 rounded-lg hover:bg-red-100/80 dark:hover:bg-red-900/50 transition-all duration-200 hover:scale-110 text-red-600 dark:text-red-400 shadow-sm"
                                        title="Cancel editing"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            
                            {!isEditing && (
                                <div className={`transition-all duration-300 ${theme.expandIconColor} ${theme.darkExpandIconColor} ${isExpanded ? 'rotate-180' : ''} hover:scale-110`}>
                                    <ChevronDown className="w-5 h-5" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expandable Content */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    (isExpanded || isEditing) ? 'opacity-100' : 'max-h-0 opacity-0'
                }`}>
                    <div className="px-4 pb-4">
                        {typeof children === 'function' ? children({ isEditing }) : children}
                        
                        {/* Return Broker */}
                        {showReturnBroker && (
                            <div className="mt-4 pt-3 border-t border-white/50 dark:border-slate-600/50">
                                <BrokerDisplay label="Return Broker" brokerId={step.override_data?.return_broker_override || 'None'} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Step Test Overlay */}
            <StepTestOverlay 
                step={step}
                isOpen={isTestOverlayOpen}
                onClose={() => setIsTestOverlayOpen(false)}
            />
        </>
    );
} 