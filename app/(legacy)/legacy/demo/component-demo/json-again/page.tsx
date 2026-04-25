"use client";

import React, { useState } from "react";
import { Row } from "./types";
import { useJSONConverter } from "./hooks/useJSONConverter";
import { EditorRow } from "./components/EditorRow";

interface SmartJSONEditorProps {
    onSave?: (json: any) => void;
    className?: string;
}

const SmartJSONEditor: React.FC<SmartJSONEditorProps> = ({ onSave, className = "" }) => {
    const [rows, setRows] = useState<Row[]>([
        {
            id: "1",
            depth: 0,
            key: "",
            value: "",
            type: "text",
            isList: false,
            listValues: [],
        },
    ]);

    const { convertToJSON, errors, setErrors } = useJSONConverter();

    const handleAddRow = (afterId: string) => {
        const currentIndex = rows.findIndex((row) => row.id === afterId);
        const currentDepth = rows[currentIndex].depth;

        const newRow: Row = {
            id: Date.now().toString(),
            depth: currentDepth,
            key: "",
            value: "",
            type: "text",
            isList: false,
            listValues: [],
        };

        setRows((prevRows) => [...prevRows.slice(0, currentIndex + 1), newRow, ...prevRows.slice(currentIndex + 1)]);
    };

    const handleChangeDepth = (id: string, delta: number) => {
        setRows((prevRows) =>
            prevRows.map((row) => {
                if (row.id === id) {
                    const newDepth = Math.max(0, row.depth + delta);
                    return { ...row, depth: newDepth };
                }
                return row;
            })
        );
    };

    const handleMoveRow = (id: string, direction: "up" | "down") => {
        setRows((prevRows) => {
            const currentIndex = prevRows.findIndex((row) => row.id === id);
            if (direction === "up" && currentIndex > 0) {
                const newRows = [...prevRows];
                [newRows[currentIndex - 1], newRows[currentIndex]] = [newRows[currentIndex], newRows[currentIndex - 1]];
                return newRows;
            } else if (direction === "down" && currentIndex < prevRows.length - 1) {
                const newRows = [...prevRows];
                [newRows[currentIndex], newRows[currentIndex + 1]] = [newRows[currentIndex + 1], newRows[currentIndex]];
                return newRows;
            }
            return prevRows;
        });
    };

    const handleTypeChange = (id: string, type: Row["type"]) => {
        setRows((prevRows) => prevRows.map((row) => (row.id === id ? { ...row, type } : row)));
    };

    const handleToggleList = (id: string) => {
        setRows((prevRows) =>
            prevRows.map((row) =>
                row.id === id
                    ? {
                          ...row,
                          isList: !row.isList,
                          listValues: !row.isList ? [row.value] : [],
                      }
                    : row
            )
        );
    };

    const handleChange = (id: string, field: "key" | "value", newValue: string) => {
        setRows((prevRows) => prevRows.map((row) => (row.id === id ? { ...row, [field]: newValue } : row)));

        setErrors((prevErrors) => {
            const newErrors = new Map(prevErrors);
            newErrors.delete(id);
            return newErrors;
        });
    };

    const handleChangeListValue = (id: string, index: number, value: string) => {
        setRows((prevRows) =>
            prevRows.map((row) => {
                if (row.id === id) {
                    const newListValues = [...row.listValues];
                    newListValues[index] = value;
                    return {
                        ...row,
                        listValues: newListValues,
                    };
                }
                return row;
            })
        );
    };

    const handleAddListValue = (id: string) => {
        setRows((prevRows) =>
            prevRows.map((row) => {
                if (row.id === id) {
                    return {
                        ...row,
                        listValues: [...row.listValues, ""],
                    };
                }
                return row;
            })
        );
    };

    const handleSave = () => {
        const { data, isValid, errors: validationErrors } = convertToJSON(rows);
        if (isValid) {
            onSave?.(data);
        } else {
            setErrors(validationErrors);
        }
    };

    return (
        <div className={`p-4 rounded-lg bg-textured ${className}`}>
            {rows.map((row, index) => (
                <EditorRow
                    key={row.id}
                    row={row}
                    isLast={index === rows.length - 1}
                    onChangeDepth={handleChangeDepth}
                    onMove={handleMoveRow}
                    onTypeChange={handleTypeChange}
                    onToggleList={handleToggleList}
                    onChange={handleChange}
                    onAddRow={handleAddRow}
                    onChangeListValue={handleChangeListValue}
                    onAddListValue={handleAddListValue}
                    error={errors.get(row.id)}
                />
            ))}

            <div className="mt-4 flex justify-end gap-2">
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 
                    dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
                >
                    Save
                </button>
            </div>
        </div>
    );
};

export default SmartJSONEditor;
