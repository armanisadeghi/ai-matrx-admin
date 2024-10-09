"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Card } from "@/components/ui"; // Assuming these are shadcn/ui components
import { cn } from "@/lib/utils";

interface JsonViewerProps {
    data: any;
    maxHeight?: string;
    initialExpanded?: boolean;
    className?: string;
}

const MiniJsonViewer: React.FC<JsonViewerProps> = ({
                                                   data,
                                                   maxHeight = "400px",
                                                   initialExpanded = false,
                                                   className,
                                               }) => {
    const [expanded, setExpanded] = useState(initialExpanded);
    const [copyFeedback, setCopyFeedback] = useState(false);

    const toggleExpand = () => setExpanded(!expanded);
    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    };

    const renderValue = (value: any) => {
        if (typeof value === "string") {
            return <span className="text-blue-500">"{value}"</span>;
        } else if (typeof value === "number") {
            return <span className="text-green-500">{value}</span>;
        } else if (typeof value === "boolean") {
            return <span className="text-red-500">{value ? "true" : "false"}</span>;
        } else if (Array.isArray(value)) {
            return (
                <span className="text-purple-500">[{value.length} items]</span>
            );
        } else if (typeof value === "object" && value !== null) {
            return <span className="text-gray-500">{"{...}"}</span>;
        }
        return <span>{String(value)}</span>;
    };

    const renderObject = (obj: any, parentKey: string = "") => {
        return Object.entries(obj).map(([key, value]) => {
            const isObject = typeof value === "object" && value !== null;
            return (
                <div key={parentKey + key} className="ml-4">
                    <div className="flex items-center">
                        {isObject && (
                            <button onClick={toggleExpand} className="mr-2">
                                {expanded ? "▼" : "►"}
                            </button>
                        )}
                        <span className="font-semibold">{key}:</span> {renderValue(value)}
                    </div>
                    {isObject && expanded && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="pl-4">{renderObject(value, key)}</div>
                        </motion.div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className={cn("overflow-y-auto", className)} style={{ maxHeight }}>
            <Button onClick={handleCopy} className="mb-2">
                {copyFeedback ? "Copied!" : "Copy to Clipboard"}
            </Button>
            <div>{renderObject(data)}</div>
        </div>
    );
};

export default MiniJsonViewer;
