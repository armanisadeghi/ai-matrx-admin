import React from "react";

// Helper component to render text with highlighted variables
export const HighlightedText = ({ text }: { text: string }) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g);

    return (
        <>
            {parts.map((part, idx) => {
                if (part.match(/\{\{[^}]+\}\}/)) {
                    return (
                        <span
                            key={idx}
                            className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md px-1 py-0.5 font-medium"
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

