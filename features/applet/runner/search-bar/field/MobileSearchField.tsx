// MobileSearchField.tsx
import React from "react";
import { ContainerRenderProps } from "../../layouts/core/AppletInputLayoutManager";


const MobileSearchField: React.FC<ContainerRenderProps> = ({
    id,
    label,
    description,
    isActive,
    onClick,
    onOpenChange,
    isLast = false,
    actionButton = null,
    children,
    className = "",
    preventClose = false,
}) => {
    // Never close the field when interacting with its content if preventClose is true
    const handleOutsideClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling
        // We don't close the section in mobile view
        if (preventClose) return;
        
        if (isActive) {
            onOpenChange(false);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling
        onClick(id);
    };


    // If active, only show the expanded content, not the button
    if (isActive) {
        return (
            <div className="field-container relative w-full">
                <div 
                    className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fadeIn"
                    onClick={handleOutsideClick}
                >
                    <div className="p-2 pl-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="font-bold text-2xl text-gray-800 dark:text-gray-200">{label}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
                    </div>
                    {children}
                </div>
            </div>
        );
    }

    // If inactive, show only the button
    return (
        <button
            className={`w-full text-left py-3 px-6 rounded-full focus:outline-none transition-colors duration-150
                bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 hover:shadow-md ${className}`}
            onClick={handleClick}
        >
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">{label}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
                </div>
                {actionButton && <div>{actionButton}</div>}
            </div>
        </button>
    );
};

export default MobileSearchField;