import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import JsonEditor from "./JsonEditor";
import ListEditor from "./ListEditor";

// Database Configuration Form
const DatabaseConfigForm = ({ config, onChange }) => {
    const updateField = (field, value) => {
        onChange({
            ...config,
            database_config: { ...config.database_config, [field]: value },
        });
    };

    const dbConfig = config.database_config;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="table">Table *</Label>
                    <Input id="table" value={dbConfig.table} onChange={(e) => updateField("table", e.target.value)} placeholder="users" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="field">Field</Label>
                    <Input
                        id="field"
                        value={dbConfig.field || ""}
                        onChange={(e) => updateField("field", e.target.value || null)}
                        placeholder="email"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="connection_pool">Connection Pool</Label>
                    <Input
                        id="connection_pool"
                        value={dbConfig.connection_pool || ""}
                        onChange={(e) => updateField("connection_pool", e.target.value || null)}
                        placeholder="main_db"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="timeout_seconds">Timeout (seconds)</Label>
                    <Input
                        id="timeout_seconds"
                        type="number"
                        value={dbConfig.timeout_seconds}
                        onChange={(e) => updateField("timeout_seconds", parseInt(e.target.value))}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Query (JSON) *</Label>
                <JsonEditor
                    value={dbConfig.query}
                    onChange={(value) => updateField("query", value)}
                    placeholder='{"where": {"status": "active"}, "limit": 10}'
                />
            </div>

            <div className="space-y-2">
                <Label>Joins</Label>
                <ListEditor
                    value={dbConfig.joins}
                    onChange={(value) => updateField("joins", value)}
                    placeholder="LEFT JOIN profiles ON users.id = profiles.user_id"
                />
            </div>
        </div>
    );
};

export default DatabaseConfigForm;