import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import JsonEditor from "./JsonEditor";

// API Configuration Form
const APIConfigForm = ({ config, onChange }) => {
    const updateField = (field, value) => {
        onChange({
            ...config,
            api_config: { ...config.api_config, [field]: value },
        });
    };

    const apiConfig = config.api_config;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="endpoint">Endpoint *</Label>
                    <Input
                        id="endpoint"
                        value={apiConfig.endpoint}
                        onChange={(e) => updateField("endpoint", e.target.value)}
                        placeholder="https://api.example.com/users"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="method">Method</Label>
                    <Select value={apiConfig.method} onValueChange={(value) => updateField("method", value)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="timeout_seconds">Timeout (seconds)</Label>
                    <Input
                        id="timeout_seconds"
                        type="number"
                        value={apiConfig.timeout_seconds}
                        onChange={(e) => updateField("timeout_seconds", parseInt(e.target.value))}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="retry_attempts">Retry Attempts</Label>
                    <Input
                        id="retry_attempts"
                        type="number"
                        value={apiConfig.retry_attempts}
                        onChange={(e) => updateField("retry_attempts", parseInt(e.target.value))}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="cache_duration">Cache Duration (seconds)</Label>
                    <Input
                        id="cache_duration"
                        type="number"
                        value={apiConfig.cache_duration_seconds}
                        onChange={(e) => updateField("cache_duration_seconds", parseInt(e.target.value))}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Parameters (JSON)</Label>
                <JsonEditor
                    value={apiConfig.params}
                    onChange={(value) => updateField("params", value)}
                    placeholder='{"page": 1, "limit": 50}'
                />
            </div>

            <div className="space-y-2">
                <Label>Headers (JSON)</Label>
                <JsonEditor
                    value={apiConfig.headers}
                    onChange={(value) => updateField("headers", value)}
                    placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                />
            </div>

            <div className="space-y-2">
                <Label>Auth Config (JSON)</Label>
                <JsonEditor
                    value={apiConfig.auth_config}
                    onChange={(value) => updateField("auth_config", value)}
                    placeholder='{"type": "bearer", "token": "your_token"}'
                />
            </div>
        </div>
    );
};

export default APIConfigForm;