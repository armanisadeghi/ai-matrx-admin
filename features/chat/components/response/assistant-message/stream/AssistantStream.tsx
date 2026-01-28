import React, { useRef, useEffect, useState } from "react";
import ChatStreamDisplay from "./ChatStreamDisplay";
import { ChevronsDown } from "lucide-react";

interface AssistantStreamProps {
    taskId: string;
    handleVisibility?: (isVisible: boolean) => void;
    scrollToBottom?: () => void;
}

const AssistantStream: React.FC<AssistantStreamProps> = ({ taskId, handleVisibility, scrollToBottom }) => {
    const observerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isInvisible, setIsInvisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                handleVisibility?.(entry.isIntersecting);
                setIsInvisible(!entry.isIntersecting);
            },
            {
                root: null,
                threshold: 0,
            }
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => {
            if (observerRef.current) {
                observer.unobserve(observerRef.current);
            }
        };
    }, [handleVisibility]);

    return (
        <div className="flex">
            <div ref={containerRef} className="max-w-full w-full relative">
                <ChatStreamDisplay key={taskId} taskId={taskId} className="bg-transparent dark:bg-transparent"/>
                {isInvisible && (
                    <button
                        onClick={scrollToBottom}
                        className="fixed bottom-0 z-7 p-2 bg-blue-500 dark:bg-opacity-25 text-white rounded-full hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-opacity duration-300"
                        style={{ 
                            marginBottom: "170px",
                            left: "calc(50% + 385px)" // This is a hard-coded value that places the button at the right edge of a centered container
                        }}
                        aria-label="Scroll to bottom"
                    >
                        <ChevronsDown className="w-5 h-5" />
                    </button>
                )}
                <div ref={observerRef} className="h-48 w-full absolute bottom-[-1px] opacity-0 pointer-events-none" />
            </div>
        </div>
    );
};

export default AssistantStream;