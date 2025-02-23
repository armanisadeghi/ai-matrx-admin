// hooks/useJSONConverter.ts
import { useState } from "react";
import { Row } from "../types";

export const useJSONConverter = () => {
    const [errors, setErrors] = useState<Map<string, string>>(new Map());

    const convertToJSON = (rows: Row[]): { data: any; isValid: boolean; errors: Map<string, string> } => {
        const newErrors = new Map<string, string>();
        let result: any = {};

        const setNestedValue = (obj: any, path: string[], value: any) => {
            let current = obj;
            for (let i = 0; i < path.length - 1; i++) {
                if (!(path[i] in current)) {
                    current[path[i]] = {};
                }
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;
        };

        // Build path structure and validate
        const pathStructure = new Map<string, { depth: number; parent: string | null }>();
        let lastParentByDepth: (string | null)[] = [null];

        rows.forEach((row) => {
            while (lastParentByDepth.length - 1 > row.depth) lastParentByDepth.pop();
            while (lastParentByDepth.length - 1 < row.depth) {
                lastParentByDepth.push(lastParentByDepth[lastParentByDepth.length - 1]);
            }

            pathStructure.set(row.id, {
                depth: row.depth,
                parent: lastParentByDepth[row.depth],
            });
            lastParentByDepth[row.depth + 1] = row.id;

            // Validation
            if (!row.key.trim() && (row.value.trim() || row.listValues.some((v) => v.trim()))) {
                newErrors.set(row.id, "Key is required when value is present");
            }

            if (row.type === "number") {
                const validateNumber = (value: string) => value && isNaN(Number(value));
                if (row.isList) {
                    if (row.listValues.some(validateNumber)) {
                        newErrors.set(row.id, "Invalid number in list");
                    }
                } else if (validateNumber(row.value)) {
                    newErrors.set(row.id, "Invalid number");
                }
            }
        });

        if (newErrors.size === 0) {
            // Convert to JSON structure
            const convertValue = (value: string, type: Row["type"]) => {
                switch (type) {
                    case "number":
                        return Number(value);
                    case "boolean":
                        return value.toLowerCase() === "true";
                    case "array":
                        return value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean);
                    case "object":
                        return {};
                    default:
                        return value;
                }
            };

            rows.forEach((row) => {
                if (!row.key.trim() && !row.value.trim() && !row.listValues.some((v) => v.trim())) return;

                const path: string[] = [];
                let current: string | null = row.id;

                while (current !== null) {
                    const parentInfo = pathStructure.get(current);
                    if (!parentInfo) break;

                    const currentRow = rows.find((r) => r.id === current);
                    if (currentRow?.key.trim()) {
                        path.unshift(currentRow.key.trim());
                    }
                    current = parentInfo.parent;
                }

                const value = row.isList
                    ? row.listValues.map((v) => convertValue(v, row.type)).filter((v) => v !== "")
                    : convertValue(row.value, row.type);

                if (path.length === 0 && row.key.trim()) {
                    result[row.key.trim()] = value;
                } else if (path.length > 0) {
                    setNestedValue(result, path, value);
                }
            });
        }

        return { data: result, isValid: newErrors.size === 0, errors: newErrors };
    };

    return { convertToJSON, errors, setErrors };
};
