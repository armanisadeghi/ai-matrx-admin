import React from "react";

interface HighlightedTextProps {
    text: string;
    validVariables?: string[];
}

// Helper component to render text with highlighted variables
// Valid variables are shown in green, invalid ones in red
export const HighlightedText = ({ text, validVariables = [] }: HighlightedTextProps) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g);

    return (
        <>
            {parts.map((part, idx) => {
                const variableMatch = part.match(/^\{\{([^}]+)\}\}$/);
                if (variableMatch) {
                    const variableName = variableMatch[1];
                    const isValid = validVariables.includes(variableName);
                    
                    return (
                        <span
                            key={idx}
                            className={
                                isValid 
                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-md px-1 py-0.5 font-medium"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md px-1 py-0.5 font-medium"
                            }
                            title={isValid ? `Variable: ${variableName}` : `Undefined variable: ${variableName}`}
                        >
                            {part}
                        </span>
                    );
                }
                return <span key={idx}>{part}</span>;
            })}
        </>
    );
};

