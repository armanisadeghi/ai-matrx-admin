import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface JsonEditorProps {
    value: any;
    onChange: (value: any) => void;
    placeholder?: string;
}

export const JsonEditor = ({ value, onChange, placeholder = "Enter JSON..." }: JsonEditorProps) => {
    const [jsonString, setJsonString] = useState("");
    const [isValid, setIsValid] = useState(true);

    useEffect(() => {
        setJsonString(value ? JSON.stringify(value, null, 2) : "");
    }, [value]);

    const handleChange = (newValue) => {
        setJsonString(newValue);
        try {
            const parsed = newValue.trim() ? JSON.parse(newValue) : {};
            setIsValid(true);
            onChange(parsed);
        } catch (e) {
            setIsValid(false);
        }
    };

    return (
        <div className="space-y-2">
            <Textarea
                value={jsonString}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                className={`font-mono text-sm min-h-[100px] ${!isValid ? "border-red-500 dark:border-red-400" : ""}`}
            />
            {!isValid && <p className="text-sm text-red-500 dark:text-red-400">Invalid JSON format</p>}
        </div>
    );
};

export default JsonEditor;