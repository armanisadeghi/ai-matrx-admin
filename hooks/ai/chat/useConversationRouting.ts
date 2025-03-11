import { useCallback, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MatrxRecordId } from "@/types";
import { ChatMode } from "@/types/chat/chat.types";

interface UseConversationRoutingProps {
    initialModelKey?: MatrxRecordId;
    initialMode?: ChatMode;
    defaultMode?: ChatMode;
}

export const useConversationRouting = ({ 
    initialModelKey, 
    initialMode, 
    defaultMode = "general",
}: UseConversationRoutingProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const paramsModelKey = (searchParams.get("model") as MatrxRecordId) || initialModelKey;
    const paramsMode = (searchParams.get("mode") as ChatMode) || initialMode || defaultMode;
    
    const [modelKey, setModelKey] = useState<MatrxRecordId>(paramsModelKey);
    const [currentMode, setCurrentMode] = useState<ChatMode | undefined>(paramsMode);
    
    useEffect(() => {
        if (paramsMode) {
            setCurrentMode(paramsMode);
        }
    }, [paramsMode]);
    
    useEffect(() => {
        if (paramsModelKey) {
            setModelKey(paramsModelKey);
        }
    }, [paramsModelKey]);
    
    // Function to update search params
    const createQueryString = useCallback(
        (updates: Record<string, string | undefined>) => {
            const params = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([name, value]) => {
                if (value) {
                    params.set(name, value);
                } else {
                    params.delete(name);
                }
            });
            return params.toString();
        },
        [searchParams]
    );
    
    // Update URL when model or mode changes without navigation
    useEffect(() => {
        const queryString = createQueryString({
            model: modelKey,
            mode: currentMode,
        });
        // Update the URL without causing a navigation
        router.replace(`${pathname}?${queryString}`, { scroll: false });
    }, [modelKey, currentMode, pathname, router, createQueryString]);
    
    // Navigate to a specific conversation while maintaining parameters
    const navigateToConversation = useCallback(
        (conversationId: string, overrides?: { model?: MatrxRecordId; mode?: ChatMode }) => {
            // Get current or overridden values
            const nextModel = overrides?.model || modelKey;
            const nextMode = overrides?.mode || currentMode;
            
            // Create query string with current or overridden params
            const queryString = createQueryString({
                model: nextModel,
                mode: nextMode,
            });
            
            // Navigate to the new conversation
            router.push(`/chat/${conversationId}?${queryString}`);
        },
        [router, createQueryString, modelKey, currentMode]
    );
    
    return {
        modelKey,
        currentMode,
        setModelKey,
        setCurrentMode,
        createQueryString,
        navigateToConversation,
    };
};

export type ConversationRoutingResult = ReturnType<typeof useConversationRouting>;
export default useConversationRouting;