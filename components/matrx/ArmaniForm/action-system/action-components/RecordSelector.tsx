import React from "react";
import {Button} from "@/components/ui";


const RecordSelector = ({field, value, onChange, onSearch, records = [], loading = false}) => {
    const [searchTerm, setSearchTerm] = React.useState('');

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        onSearch?.(e.target.value);
                    }}
                    className="flex-1 p-2 bg-input border border-border rounded-md"
                    placeholder="Search records..."
                />
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {loading ? (
                    <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : records.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No records found</div>
                ) : (
                        records.map(record => (
                            <Button
                                key={record.id}
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => onChange({target: {value: record.id}})}
                            >
                                {record.displayName}
                            </Button>
                        ))
                    )}
            </div>
        </div>
    );
};

export default RecordSelector;
