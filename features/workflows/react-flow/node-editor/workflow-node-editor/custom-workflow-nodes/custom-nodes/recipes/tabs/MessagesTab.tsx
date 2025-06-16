import React, { useState } from "react";
import { NeededBroker, RecipeSimpleMessage } from "@/features/workflows/service/recipe-service";
import { replaceMatrxPatternsWithBrokerNames } from "@/features/rich-text-editor/utils/patternUtils";
import { estimateTokens, estimateTotalTokens } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils/token-estimator";
import { EnrichedBroker } from '@/features/workflows/utils/data-flow-manager';

interface MessagesTabProps {
    messages: RecipeSimpleMessage[];
    neededBrokers?: NeededBroker[];
    enrichedBrokers: EnrichedBroker[];
}

const MessagesTab: React.FC<MessagesTabProps> = ({ messages, neededBrokers, enrichedBrokers }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    if (!messages || messages.length === 0) {
        return (
            <div className="p-4">
                <div className="text-gray-500 dark:text-gray-400 text-sm italic">No messages found in this recipe.</div>
            </div>
        );
    }

    // Function to copy broker ID to clipboard
    const copyToClipboard = async (brokerId: string, event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        
        try {
            await navigator.clipboard.writeText(brokerId);
            setCopiedId(brokerId);
            // Clear the copied state after 2 seconds
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = brokerId;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedId(brokerId);
                setTimeout(() => setCopiedId(null), 2000);
            } catch (fallbackErr) {
                console.error('Failed to copy to clipboard:', fallbackErr);
            }
            document.body.removeChild(textArea);
        }
    };

        // Function to format broker names in double brackets with custom styling
    const formatBrokerNames = (content: string) => {
        if (!content) return content;
        
        // Pattern to match [[Broker Name Broker|broker-id]] format
        const brokerPattern = /\[\[([^|]+)(?:\|([^\]]+))?\]\]/g;
        
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = brokerPattern.exec(content)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(content.slice(lastIndex, match.index));
            }
            
            const brokerName = match[1];
            const brokerId = match[2];
            const isCopied = copiedId === brokerId;
            
            // Add the formatted broker name with tooltip and click handler
            parts.push(
                <span 
                    key={`broker-${match.index}`}
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border transition-all duration-200 ${
                        isCopied 
                            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' 
                            : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/40 cursor-pointer'
                    }`}
                    title={brokerId ? `${isCopied ? 'Copied!' : 'Click to copy'} Broker ID: ${brokerId}` : undefined}
                    onClick={brokerId ? (e) => copyToClipboard(brokerId, e) : undefined}
                >
                    {brokerName}
                    {isCopied && (
                        <svg 
                            className="ml-1 w-3 h-3" 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                        >
                            <path 
                                fillRule="evenodd" 
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                clipRule="evenodd" 
                            />
                        </svg>
                    )}
                </span>
            );
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text after the last match
        if (lastIndex < content.length) {
            parts.push(content.slice(lastIndex));
        }
        
        return parts.length > 1 ? parts : content;
    };

    const getRoleStyles = (role: string) => {
        switch (role.toLowerCase()) {
            case "system":
                return {
                    border: "border-blue-600 dark:border-blue-400",
                    roleBg: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
                };
            case "user":
                return {
                    border: "border-green-600 dark:border-green-400",
                    roleBg: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
                };
            case "assistant":
                return {
                    border: "border-purple-600 dark:border-purple-400",
                    roleBg: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
                };
            case "tool":
                return {
                    border: "border-orange-600 dark:border-orange-400",
                    roleBg: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
                };
            default:
                return {
                    border: "border-gray-600 dark:border-gray-400",
                    roleBg: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800",
                };
        }
    };

    const estimatedTotalTokens = estimateTotalTokens(messages);

    const updatedMessages = replaceMatrxPatternsWithBrokerNames(messages, neededBrokers || []);

    return (
        <div className="p-2 space-y-2">
            {updatedMessages.map((message, index) => {
                const styles = getRoleStyles(message.role);
                const capitalizedRole = message.role.charAt(0).toUpperCase() + message.role.slice(1);
                const formattedContent = formatBrokerNames(message.content);

                return (
                    <div key={index} className={`border rounded-md ${styles.border}`}>
                        {message.content && message.content.length > 200 ? (
                            <details open className="cursor-pointer">
                                <summary className={`px-2 py-1 text-xs font-medium ${styles.roleBg} rounded-t-md hover:opacity-80`}>
                                    {capitalizedRole} ({message.content.length} chars) (Approx. {estimateTokens(message.content)} tokens)
                                </summary>
                                <div className="p-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                                    {formattedContent}
                                </div>
                            </details>
                        ) : (
                            <>
                                <div className={`px-2 py-1 text-xs font-medium ${styles.roleBg} rounded-t-md`}>
                                    {capitalizedRole} {message.content ? `(${message.content.length} chars) (Approx. ${estimateTokens(message.content)} tokens)` : ""}
                                </div>
                                <div className="p-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {message.content ? (
                                        <div className="whitespace-pre-wrap break-words">{formattedContent}</div>
                                    ) : (
                                        <span className="italic text-gray-500 dark:text-gray-400">No content</span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}

            {messages.length > 10 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    Showing all {messages.length} messages
                </div>
            )}

            {/* Token and Cost Summary */}
            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                            Input Tokens: <span className="text-blue-600 dark:text-blue-400">{estimatedTotalTokens.toLocaleString()}</span>
                        </span>
                        <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400">
                            <span>1 run: <span className="text-gray-700 dark:text-gray-300">$--</span></span>
                            <span>100 runs: <span className="text-gray-700 dark:text-gray-300">$--</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessagesTab;
