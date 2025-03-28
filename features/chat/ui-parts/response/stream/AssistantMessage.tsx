import React from "react";
import ChatStreamDisplay from "./ChatStreamDisplay";

interface AssistantStreamProps {
    eventName: string;
}

const AssistantStream: React.FC<AssistantStreamProps> = ({ eventName }) => {
    return (
        <div className="flex">
            <div className="max-w-full w-full relative">
                <ChatStreamDisplay key={eventName} eventName={eventName} className="bg-transparent dark:bg-transparent" />
            </div>
        </div>
    );
};

export default AssistantStream;
