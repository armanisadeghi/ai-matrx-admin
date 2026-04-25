// components/RowControls.tsx
import React from "react";
import { ChevronDown, ChevronUp, ArrowRight, ArrowLeft } from "lucide-react";

interface RowControlsProps {
    depth: number;
    onChangeDepth: (delta: number) => void;
    onMove: (direction: "up" | "down") => void;
}

export const RowControls: React.FC<RowControlsProps> = ({ depth, onChangeDepth, onMove }) => (
    <div className="flex items-center gap-0.5">
        <button
            onClick={() => onChangeDepth(-1)}
            disabled={depth === 0}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded 
                text-gray-500 dark:text-gray-400 disabled:opacity-50"
        >
            <ArrowLeft className="w-4 h-4" />
        </button>
        <button
            onClick={() => onChangeDepth(1)}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded 
                text-gray-500 dark:text-gray-400"
        >
            <ArrowRight className="w-4 h-4" />
        </button>
        <button
            onClick={() => onMove("up")}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded 
                text-gray-500 dark:text-gray-400"
        >
            <ChevronUp className="w-4 h-4" />
        </button>
        <button
            onClick={() => onMove("down")}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded 
                text-gray-500 dark:text-gray-400"
        >
            <ChevronDown className="w-4 h-4" />
        </button>
    </div>
);
