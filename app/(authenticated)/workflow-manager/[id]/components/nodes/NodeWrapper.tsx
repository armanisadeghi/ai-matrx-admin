import { useContext, ReactNode, useState } from "react";
import { LucideIcon, Edit3, Save, X } from "lucide-react";
import { BrokerHighlightContext } from "../../WorkflowDetailContent";
import { BrokerDisplay, BrokerHighlightBadge, stepContainsBroker, WorkflowStepCardProps } from "../WorkflowStepsSection";
import { StatusDisplay } from "./StatusDisplay";

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
        gradientFrom: "from-blue-50",
        gradientTo: "to-indigo-50",
        darkGradientFrom: "dark:from-blue-900/20",
        darkGradientTo: "dark:to-indigo-900/20",
        borderColor: "border-blue-200",
        darkBorderColor: "dark:border-blue-700",
        stepNumberBg: "bg-blue-500",
        darkStepNumberBg: "dark:bg-blue-600",
        titleColor: "text-blue-900",
        darkTitleColor: "dark:text-blue-100",
        stepNameColor: "text-blue-700",
        darkStepNameColor: "dark:text-blue-300",
        expandIconColor: "text-blue-600",
        darkExpandIconColor: "dark:text-blue-400"
    },
    green: {
        gradientFrom: "from-green-50",
        gradientTo: "to-emerald-50",
        darkGradientFrom: "dark:from-green-900/20",
        darkGradientTo: "dark:to-emerald-900/20",
        borderColor: "border-green-200",
        darkBorderColor: "dark:border-green-700",
        stepNumberBg: "bg-green-500",
        darkStepNumberBg: "dark:bg-green-600",
        titleColor: "text-green-900",
        darkTitleColor: "dark:text-green-100",
        stepNameColor: "text-green-700",
        darkStepNameColor: "dark:text-green-300",
        expandIconColor: "text-green-600",
        darkExpandIconColor: "dark:text-green-400"
    },
    orange: {
        gradientFrom: "from-orange-50",
        gradientTo: "to-red-50",
        darkGradientFrom: "dark:from-orange-900/20",
        darkGradientTo: "dark:to-red-900/20",
        borderColor: "border-orange-200",
        darkBorderColor: "dark:border-orange-700",
        stepNumberBg: "bg-orange-500",
        darkStepNumberBg: "dark:bg-orange-600",
        titleColor: "text-orange-900",
        darkTitleColor: "dark:text-orange-100",
        stepNameColor: "text-orange-700",
        darkStepNameColor: "dark:text-orange-300",
        expandIconColor: "text-orange-600",
        darkExpandIconColor: "dark:text-orange-400"
    },
    teal: {
        gradientFrom: "from-teal-50",
        gradientTo: "to-cyan-50",
        darkGradientFrom: "dark:from-teal-900/20",
        darkGradientTo: "dark:to-cyan-900/20",
        borderColor: "border-teal-200",
        darkBorderColor: "dark:border-teal-700",
        stepNumberBg: "bg-teal-500",
        darkStepNumberBg: "dark:bg-teal-600",
        titleColor: "text-teal-900",
        darkTitleColor: "dark:text-teal-100",
        stepNameColor: "text-teal-700",
        darkStepNameColor: "dark:text-teal-300",
        expandIconColor: "text-teal-600",
        darkExpandIconColor: "dark:text-teal-400"
    },
    amber: {
        gradientFrom: "from-amber-50",
        gradientTo: "to-yellow-50",
        darkGradientFrom: "dark:from-amber-900/20",
        darkGradientTo: "dark:to-yellow-900/20",
        borderColor: "border-amber-200",
        darkBorderColor: "dark:border-amber-700",
        stepNumberBg: "bg-amber-500",
        darkStepNumberBg: "dark:bg-amber-600",
        titleColor: "text-amber-900",
        darkTitleColor: "dark:text-amber-100",
        stepNameColor: "text-amber-700",
        darkStepNameColor: "dark:text-amber-300",
        expandIconColor: "text-amber-600",
        darkExpandIconColor: "dark:text-amber-400"
    },
    purple: {
        gradientFrom: "from-purple-50",
        gradientTo: "to-violet-50",
        darkGradientFrom: "dark:from-purple-900/20",
        darkGradientTo: "dark:to-violet-900/20",
        borderColor: "border-purple-200",
        darkBorderColor: "dark:border-purple-700",
        stepNumberBg: "bg-purple-500",
        darkStepNumberBg: "dark:bg-purple-600",
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
    allowEdit = true
}: NodeWrapperProps) {
    const { highlightedBroker } = useContext(BrokerHighlightContext);
    const containsHighlightedBroker = highlightedBroker && stepContainsBroker(step, highlightedBroker);
    const theme = colorThemes[colorTheme];
    const [isEditing, setIsEditing] = useState(false);

    const handleEdit = () => {
        setIsEditing(true);
        onEdit?.();
    };

    const handleSave = () => {
        setIsEditing(false);
        onSave?.();
    };

    const handleCancel = () => {
        setIsEditing(false);
        onCancel?.();
    };

    return (
        <div className={`border-2 rounded-lg bg-gradient-to-br ${theme.gradientFrom} ${theme.gradientTo} ${theme.darkGradientFrom} ${theme.darkGradientTo} hover:shadow-md transition-all duration-200 ${
            containsHighlightedBroker 
                ? 'border-yellow-400 dark:border-yellow-500 shadow-lg shadow-yellow-200 dark:shadow-yellow-900/50' 
                : `${theme.borderColor} ${theme.darkBorderColor}`
        } ${isEditing ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}>
            {/* Clickable Header */}
            <div 
                className="p-4 cursor-pointer select-none"
                onClick={isEditing ? undefined : onToggle}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${theme.stepNumberBg} ${theme.darkStepNumberBg} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                            {index + 1}
                        </div>
                        <div>
                            <h3 className={`text-xl font-bold ${theme.titleColor} ${theme.darkTitleColor} flex items-center gap-2`}>
                                <Icon className="w-5 h-5" />
                                {title}
                            </h3>
                            {step.step_name && (
                                <p className={`text-sm ${theme.stepNameColor} ${theme.darkStepNameColor} font-medium`}>
                                    {step.step_name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {containsHighlightedBroker && <BrokerHighlightBadge />}
                        <StatusDisplay status={step.status} />
                        
                        {/* Edit Controls */}
                        {allowEdit && !isEditing && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit();
                                }}
                                className={`p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors ${theme.expandIconColor} ${theme.darkExpandIconColor}`}
                                title="Edit node"
                            >
                                <Edit3 className="w-4 h-4" />
                            </button>
                        )}
                        
                        {isEditing && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSave();
                                    }}
                                    className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors text-green-600 dark:text-green-400"
                                    title="Save changes"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancel();
                                    }}
                                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-red-600 dark:text-red-400"
                                    title="Cancel editing"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        
                        {!isEditing && (
                            <div className={`transition-transform duration-200 ${theme.expandIconColor} ${theme.darkExpandIconColor} ${isExpanded ? 'rotate-180' : ''}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Expandable Content */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                (isExpanded || isEditing) ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
            }`}>
                <div className="px-4 pb-4">
                    {typeof children === 'function' ? children({ isEditing }) : children}
                    
                    {/* Return Broker */}
                    {showReturnBroker && (
                        <div className="mt-3">
                            <BrokerDisplay label="Return Broker" brokerId={step.override_data?.return_broker_override || 'None'} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 