import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrokerSourceConfig, ScopeType } from "./types";
import JsonEditor from "./JsonEditor";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { useEffect, useState, useMemo } from "react";

type SimpleBroker = {
    id: string;
    name: string;
    isPublic?: boolean;
    dataType?: "str" | "bool" | "dict" | "float" | "int" | "list" | "url";
    defaultValue?: string;
    outputComponent?: string;
    inputComponent?: string;
    color?: string;
    fieldComponentId?: string;
    defaultScope?: string;
}

interface BaseConfigFormProps {
    config: BrokerSourceConfig;
    onChange: (config: BrokerSourceConfig) => void;
}

// Base Configuration Form
const BaseConfigForm = ({ config, onChange }: BaseConfigFormProps) => {
    const { dataBrokerRecordsById, fetchDataBrokerAll } = useDataBrokerWithFetch();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (Object.keys(dataBrokerRecordsById).length === 0) {
            fetchDataBrokerAll();
        }
    }, [dataBrokerRecordsById, fetchDataBrokerAll]);

    // Convert broker records to searchable format
    const brokerOptions = useMemo(() => {
        return Object.values(dataBrokerRecordsById).map(broker => ({
            value: broker.id,
            label: broker.name,
            searchText: `${broker.name} ${broker.id}`
        }));
    }, [dataBrokerRecordsById]);

    // Get selected broker info
    const selectedBroker = useMemo(() => {
        return brokerOptions.find(broker => broker.value === config.broker_id);
    }, [brokerOptions, config.broker_id]);

    const updateField = (field: string, value: any) => {
        onChange({ ...config, [field]: value });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="broker_id">Broker *</Label>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between text-left font-normal"
                        >
                            {selectedBroker ? selectedBroker.label : "Select broker..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Search brokers by name or ID..." />
                            <CommandList>
                                <CommandEmpty>No brokers found.</CommandEmpty>
                                <CommandGroup>
                                    {brokerOptions.map((broker) => (
                                        <CommandItem
                                            key={broker.value}
                                            value={broker.searchText}
                                            onSelect={() => {
                                                updateField("broker_id", broker.value);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedBroker?.value === broker.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {broker.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <Label htmlFor="cache_policy">Cache Policy</Label>
                <Select value={config.cache_policy} onValueChange={(value) => updateField("cache_policy", value)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(ScopeType).map(([key, value]) => (
                            <SelectItem key={value} value={value}>
                                {key.toLowerCase()}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox id="required" checked={config.required} onCheckedChange={(checked) => updateField("required", checked)} />
                <Label htmlFor="required">Required</Label>
            </div>

            <div className="space-y-2">
                <Label htmlFor="default_value">Default Value</Label>
                <Input
                    id="default_value"
                    value={config.default_value || ""}
                    onChange={(e) => updateField("default_value", e.target.value || null)}
                    placeholder="Enter default value..."
                />
            </div>

            <div className="md:col-span-2 space-y-2">
                <Label>Validation Rules (JSON)</Label>
                <JsonEditor
                    value={config.validation_rules}
                    onChange={(value) => updateField("validation_rules", value)}
                    placeholder='{"min_length": 5, "pattern": "^[A-Z].*"}'
                />
            </div>
        </div>
    );
};

export default BaseConfigForm;