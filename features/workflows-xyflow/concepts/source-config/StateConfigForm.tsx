import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { BrokerSourceConfig } from "./types";

interface StateConfigFormProps {
    config: BrokerSourceConfig;
    onChange: (config: BrokerSourceConfig) => void;
}

const StateConfigForm = ({ config, onChange }: StateConfigFormProps) => {
    const updateField = (field: string, value: any) => {
        onChange({
            ...config,
            state_config: { ...config.state_config, [field]: value },
        });
    };

    const stateConfig = config.state_config;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="scope">Scope *</Label>
                    <Input
                        id="scope"
                        value={stateConfig.scope}
                        onChange={(e) => updateField("scope", e.target.value)}
                        placeholder="user_session"
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="iterations"
                        checked={stateConfig.iterations}
                        onCheckedChange={(checked) => updateField("iterations", checked)}
                    />
                    <Label htmlFor="iterations">Create Iterations</Label>
                </div>
            </div>
        </div>
    );
};

export default StateConfigForm;
