// components/EditorRow.tsx
import React, { useRef } from "react";
import { Plus, ListPlus } from "lucide-react";
import { Row } from "../types";
import { TypeSelector } from "./TypeSelector";
import { RowControls } from "./RowControls";
import { ListValues } from "./ListValues";

interface EditorRowProps {
    row: Row;
    isLast: boolean;
    onChangeDepth: (id: string, delta: number) => void;
    onMove: (id: string, direction: "up" | "down") => void;
    onTypeChange: (id: string, type: Row["type"]) => void;
    onToggleList: (id: string) => void;
    onChange: (id: string, field: "key" | "value", value: string) => void;
    onAddRow: (afterId: string) => void;
    onChangeListValue: (id: string, index: number, value: string) => void;
    onAddListValue: (id: string) => void;
    error?: string;
}

export const EditorRow: React.FC<EditorRowProps> = ({
    row,
    isLast,
    onChangeDepth,
    onMove,
    onTypeChange,
    onToggleList,
    onChange,
    onAddRow,
    onChangeListValue,
    onAddListValue,
    error,
}) => {
    const keyInputRef = useRef<HTMLInputElement>(null);
    const valueInputRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <div className="group relative flex items-center gap-1 py-1" style={{ marginLeft: `${row.depth * 24}px` }}>
                <RowControls
                    depth={row.depth}
                    onChangeDepth={(delta) => onChangeDepth(row.id, delta)}
                    onMove={(direction) => onMove(row.id, direction)}
                />

                <input
                    ref={keyInputRef}
                    type="text"
                    value={row.key}
                    placeholder="Enter name..."
                    onChange={(e) => onChange(row.id, "key", e.target.value)}
                    className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 
                    bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100
                    placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />

                <TypeSelector type={row.type} onChange={(type) => onTypeChange(row.id, type)} />

                {(!row.type || !["object", "array"].includes(row.type)) && !row.isList && (
                    <input
                        ref={valueInputRef}
                        type="text"
                        value={row.value}
                        placeholder="Enter value..."
                        onChange={(e) => onChange(row.id, "value", e.target.value)}
                        className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 
                      bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                      placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                )}

                <button
                    onClick={() => onAddRow(row.id)}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-blue-500"
                    title="Add new row"
                >
                    <Plus className="w-4 h-4" />
                </button>

                <div className="relative group">
                    <button
                        onClick={() => onToggleList(row.id)}
                        className={`p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded 
                      ${row.isList ? "text-blue-500" : "text-gray-500 dark:text-gray-400"}`}
                    >
                        <ListPlus className="w-4 h-4" />
                    </button>
                    <div
                        className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                         hidden group-hover:block whitespace-nowrap"
                    >
                        <div className="bg-gray-800 text-white text-sm px-2 py-1 rounded">
                            {row.isList ? "Convert to single value" : "Convert to list (allows multiple values)"}
                        </div>
                    </div>
                </div>

                {error && <span className="text-red-500 text-sm">{error}</span>}
            </div>

            {row.isList && (
                <ListValues
                    values={row.listValues}
                    onChange={(index, value) => onChangeListValue(row.id, index, value)}
                    onAdd={() => onAddListValue(row.id)}
                />
            )}
        </div>
    );
};
