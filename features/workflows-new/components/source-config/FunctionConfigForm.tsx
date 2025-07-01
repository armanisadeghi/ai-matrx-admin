import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { BrokerSourceConfig } from "./types";
import JsonEditor from "./JsonEditor";


interface FunctionConfigFormProps {
    config: BrokerSourceConfig;
    onChange: (config: BrokerSourceConfig) => void;
}

// Function Configuration Form
const FunctionConfigForm = ({ config, onChange }: FunctionConfigFormProps) => {
    const updateField = (field: string, value: any) => {
        onChange({
            ...config,
            function_config: { ...config.function_config, [field]: value },
        });
    };

    const functionConfig = config.function_config;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="function_id">Function ID *</Label>
                    <Input
                        id="function_id"
                        value={functionConfig.function_id}
                        onChange={(e) => updateField("function_id", e.target.value)}
                        placeholder="func_001"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="function_name">Function Name *</Label>
                    <Input
                        id="function_name"
                        value={functionConfig.function_name}
                        onChange={(e) => updateField("function_name", e.target.value)}
                        placeholder="process_user_data"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="async_execution"
                        checked={functionConfig.async_execution}
                        onCheckedChange={(checked) => updateField("async_execution", checked)}
                    />
                    <Label htmlFor="async_execution">Async Execution</Label>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Arguments (JSON)</Label>
                <JsonEditor
                    value={functionConfig.args}
                    onChange={(value) => updateField("args", value)}
                    placeholder='{"input_type": "json", "output_format": "csv"}'
                />
            </div>

            <div className="space-y-2">
                <Label>Execution Context (JSON)</Label>
                <JsonEditor
                    value={functionConfig.execution_context}
                    onChange={(value) => updateField("execution_context", value)}
                    placeholder='{"timeout": 30, "memory_limit": "512MB"}'
                />
            </div>
        </div>
    );
};



export default FunctionConfigForm;