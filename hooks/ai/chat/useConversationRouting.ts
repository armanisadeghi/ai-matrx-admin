import { useCallback, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MatrxRecordId } from "@/types";
import { ChatMode } from "@/types/chat/chat.types";

interface UseConversationRoutingProps {
    initialModelId?: string;
    initialMode?: ChatMode;
}

export const useConversationRouting = ({ 
    initialModelId, 
    initialMode = "general",
}: UseConversationRoutingProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const paramsModelId = (searchParams.get("model") as string) || initialModelId;
    const paramsMode = (searchParams.get("mode") as ChatMode) || initialMode;
    
    const [currentModelId, setCurrentModelId] = useState<string>(paramsModelId);
    const [currentMode, setCurrentMode] = useState<ChatMode | undefined>(paramsMode);
    
    useEffect(() => {
        if (paramsMode) {
            setCurrentMode(paramsMode);
        }
    }, [paramsMode]);
    
    useEffect(() => {
        if (paramsModelId) {
            setCurrentModelId(paramsModelId);
        }
    }, [paramsModelId]);
    
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
            model: currentModelId,
            mode: currentMode,
        });
        // Update the URL without causing a navigation
        router.replace(`${pathname}?${queryString}`, { scroll: false });
    }, [currentModelId, currentMode, pathname, router, createQueryString]);
    
    // Navigate to a specific conversation while maintaining parameters
    const navigateToConversation = useCallback(
        (conversationId: string, overrides?: { model?: MatrxRecordId; mode?: ChatMode }) => {
            // Get current or overridden values
            const nextModel = overrides?.model || currentModelId;
            const nextMode = overrides?.mode || currentMode;
            
            // Create query string with current or overridden params
            const queryString = createQueryString({
                model: nextModel,
                mode: nextMode,
            });
            
            // Navigate to the new conversation
            router.push(`/chat/${conversationId}?${queryString}`);
        },
        [router, createQueryString, currentModelId, currentMode]
    );
    
    return {
        currentModelId,
        currentMode,
        setCurrentModelId,
        setCurrentMode,
        navigateToConversation,
    };
};

export type ConversationRoutingResult = ReturnType<typeof useConversationRouting>;
export default useConversationRouting;