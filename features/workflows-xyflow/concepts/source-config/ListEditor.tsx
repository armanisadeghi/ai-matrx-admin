import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ListEditorProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}


// List Editor Component
export const ListEditor = ({ value = [], onChange, placeholder = "Add item..." }: ListEditorProps) => {
    const [newItem, setNewItem] = useState("");

    const addItem = () => {
        if (newItem.trim()) {
            onChange([...value, newItem.trim()]);
            setNewItem("");
        }
    };

    const removeItem = (index) => {
        onChange(value.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder={placeholder}
                    onKeyPress={(e) => e.key === "Enter" && addItem()}
                />
                <Button onClick={addItem} size="sm">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex flex-wrap gap-2">
                {value.map((item, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {item}
                        <button onClick={() => removeItem(index)} className="ml-1 hover:text-red-500 dark:hover:text-red-400">
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
        </div>
    );
};

export default ListEditor;