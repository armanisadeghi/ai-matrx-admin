import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { BrokerSourceConfig } from "./types";
import JsonEditor from "./JsonEditor";
import ListEditor from "./ListEditor";

interface ComputedConfigFormProps {
    config: BrokerSourceConfig;
    onChange: (config: BrokerSourceConfig) => void;
}

const ComputedConfigForm = ({ config, onChange }: ComputedConfigFormProps) => {
    const updateField = (field, value) => {
        onChange({
            ...config,
            computed_config: { ...config.computed_config, [field]: value },
        });
    };

    const computedConfig = config.computed_config;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="computation_function">Computation Function *</Label>
                    <Input
                        id="computation_function"
                        value={computedConfig.computation_function}
                        onChange={(e) => updateField("computation_function", e.target.value)}
                        placeholder="calculate_user_score"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="cache_result"
                        checked={computedConfig.cache_result}
                        onCheckedChange={(checked) => updateField("cache_result", checked)}
                    />
                    <Label htmlFor="cache_result">Cache Result</Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="recompute_on_dependency_change"
                        checked={computedConfig.recompute_on_dependency_change}
                        onCheckedChange={(checked) => updateField("recompute_on_dependency_change", checked)}
                    />
                    <Label htmlFor="recompute_on_dependency_change">Recompute on Dependency Change</Label>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Input Sources (Broker IDs)</Label>
                <ListEditor
                    value={computedConfig.input_sources}
                    onChange={(value) => updateField("input_sources", value)}
                    placeholder="user_data_broker"
                />
            </div>

            <div className="space-y-2">
                <Label>Computation Arguments (JSON)</Label>
                <JsonEditor
                    value={computedConfig.computation_args}
                    onChange={(value) => updateField("computation_args", value)}
                    placeholder='{"weight": 1.5, "threshold": 0.8}'
                />
            </div>
        </div>
    );
};

export default ComputedConfigForm;