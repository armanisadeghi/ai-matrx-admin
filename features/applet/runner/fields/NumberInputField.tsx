import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { FieldDefinition } from "@/types/customAppTypes";

const NumberInputField: React.FC<{
    field: FieldDefinition;
    appletId: string;
    isMobile?: boolean;
    source?: string;
    disabled?: boolean;
    className?: string; // Add this new prop
}> = ({ field, appletId, isMobile, source = "applet", disabled = false, className = "" }) => {
    const { id, placeholder, componentProps, required } = field;

    const { width, customContent, min, max, step } = componentProps;

    const safeWidthClass = ensureValidWidthClass(width);

    const dispatch = useAppDispatch();
    const stateValue = useAppSelector((state) => selectBrokerValue(state, source, id));

    // Make sure we're working with a number
    const numericValue = typeof stateValue === "number" ? stateValue : 0;

    // Handle increment
    const handleIncrement = () => {
        const newValue = Math.min(numericValue + (step || 1), max || Infinity);
        dispatch(
            updateBrokerValue({
                source: source,
                itemId: id,
                value: newValue,
            })
        );
    };

    // Handle decrement
    const handleDecrement = () => {
        const newValue = Math.max(numericValue - (step || 1), min || 0);
        dispatch(
            updateBrokerValue({
                source: source,
                itemId: id,
                value: newValue,
            })
        );
    };

    const displaySubtitle = placeholder;

    // Determine if buttons should be disabled
    const isDecrementDisabled = disabled || numericValue <= (min || 0);
    const isIncrementDisabled = disabled || numericValue >= (max || Infinity);

    // Fixed icon size since we don't have the prop anymore
    const iconSize = 16;

    // Render custom content if provided
    if (customContent) {
        return <>{customContent}</>;
    }

    return (
        <div className={`${safeWidthClass} ${className}`}>
            <div className="grid grid-cols-2 items-center">
                {/* Left side - always present */}
                <div className="flex flex-col">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{displaySubtitle}</span>
                </div>

                {/* Right side - always present */}
                <div className="flex items-center justify-end">
                    {/* Decrement button */}
                    <button
                        type="button"
                        onClick={handleDecrement}
                        disabled={isDecrementDisabled}
                        className={`flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 
              ${
                  isDecrementDisabled
                      ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                      : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
                        aria-label="Decrease value"
                    >
                        <svg
                            width={iconSize}
                            height={iconSize}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-600 dark:text-gray-300"
                        >
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>

                    {/* Value display */}
                    <div className="w-10 flex items-center justify-center">
                        <span className="text-base font-medium text-gray-900 dark:text-gray-100">{numericValue}</span>
                    </div>

                    {/* Increment button */}
                    <button
                        type="button"
                        onClick={handleIncrement}
                        disabled={isIncrementDisabled}
                        className={`flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 
              ${
                  isIncrementDisabled
                      ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                      : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
                        aria-label="Increase value"
                    >
                        <svg
                            width={iconSize}
                            height={iconSize}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-gray-600 dark:text-gray-300"
                        >
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NumberInputField;
