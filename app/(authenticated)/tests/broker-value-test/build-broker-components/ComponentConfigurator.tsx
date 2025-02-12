import React from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { BrokerComponentType } from '@/components/brokers/value-components';
import { COMPONENT_SCHEMAS } from './component-schemas';

interface ComponentConfiguratorProps {
    selectedComponent: BrokerComponentType;
    config: any;
    onChange: (newConfig: any) => void;
}

const ComponentConfigurator: React.FC<ComponentConfiguratorProps> = ({
    selectedComponent,
    config,
    onChange
}) => {
    const renderField = (key: string, type: any) => {
        if (typeof type === 'string') {
            switch (type) {
                case 'number':
                    return (
                        <div key={key} className="space-y-2">
                            <label className="text-sm font-medium">{key}</label>
                            <Input
                                type="number"
                                value={config[key] || ''}
                                onChange={(e) => onChange({
                                    ...config,
                                    [key]: parseFloat(e.target.value)
                                })}
                            />
                        </div>
                    );
                    
                case 'string':
                    return (
                        <div key={key} className="space-y-2">
                            <label className="text-sm font-medium">{key}</label>
                            <Input
                                value={config[key] || ''}
                                onChange={(e) => onChange({
                                    ...config,
                                    [key]: e.target.value
                                })}
                            />
                        </div>
                    );
                    
                case 'boolean':
                    return (
                        <div key={key} className="flex items-center justify-between">
                            <label className="text-sm font-medium">{key}</label>
                            <Switch
                                checked={config[key] || false}
                                onCheckedChange={(checked) => onChange({
                                    ...config,
                                    [key]: checked
                                })}
                            />
                        </div>
                    );
                    
                case 'options':
                    return (
                        <div key={key} className="space-y-2">
                            <label className="text-sm font-medium">{key}</label>
                            <div className="space-y-2">
                                {(config[key] || []).map((option: any, index: number) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            value={option.label}
                                            onChange={(e) => {
                                                const newOptions = [...config[key]];
                                                newOptions[index] = {
                                                    ...option,
                                                    label: e.target.value
                                                };
                                                onChange({
                                                    ...config,
                                                    [key]: newOptions
                                                });
                                            }}
                                            placeholder="Label"
                                        />
                                        <Input
                                            value={option.value}
                                            onChange={(e) => {
                                                const newOptions = [...config[key]];
                                                newOptions[index] = {
                                                    ...option,
                                                    value: e.target.value
                                                };
                                                onChange({
                                                    ...config,
                                                    [key]: newOptions
                                                });
                                            }}
                                            placeholder="Value"
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={() => {
                                        const newOptions = [...(config[key] || []), { label: '', value: '' }];
                                        onChange({
                                            ...config,
                                            [key]: newOptions
                                        });
                                    }}
                                    className="text-sm text-blue-500"
                                >
                                    Add Option
                                </button>
                            </div>
                        </div>
                    );
                    
                case 'orientation':
                    return (
                        <div key={key} className="space-y-2">
                            <label className="text-sm font-medium">{key}</label>
                            <Select
                                value={config[key] || 'default'}
                                onValueChange={(value) => onChange({
                                    ...config,
                                    [key]: value
                                })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default</SelectItem>
                                    <SelectItem value="horizontal">Horizontal</SelectItem>
                                    <SelectItem value="vertical">Vertical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    );
            }
        } else if (type.type === 'object') {
            return (
                <Card key={key} className="p-4">
                    <h3 className="text-sm font-medium mb-2">{key}</h3>
                    <div className="space-y-4">
                        {Object.entries(type.properties).map(([propKey, propType]) => 
                            renderField(propKey, propType)
                        )}
                    </div>
                </Card>
            );
        }
    };

    const renderDesignControls = () => (
        <Card className="p-4">
            <h3 className="text-sm font-medium mb-4">Design Controls</h3>
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Container Class</label>
                    <Input
                        value={config.containerClassName || ''}
                        onChange={(e) => onChange({
                            ...config,
                            containerClassName: e.target.value
                        })}
                        placeholder="container class names"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Collapsible Class</label>
                    <Input
                        value={config.collapsibleClassName || ''}
                        onChange={(e) => onChange({
                            ...config,
                            collapsibleClassName: e.target.value
                        })}
                        placeholder="collapsible class names"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Label Class</label>
                    <Input
                        value={config.labelClassName || ''}
                        onChange={(e) => onChange({
                            ...config,
                            labelClassName: e.target.value
                        })}
                        placeholder="label class names"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Description Class</label>
                    <Input
                        value={config.descriptionClassName || ''}
                        onChange={(e) => onChange({
                            ...config,
                            descriptionClassName: e.target.value
                        })}
                        placeholder="description class names"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Component Class</label>
                    <Input
                        value={config.componentClassName || ''}
                        onChange={(e) => onChange({
                            ...config,
                            componentClassName: e.target.value
                        })}
                        placeholder="component class names"
                    />
                </div>
            </div>
        </Card>
    );

    const schema = COMPONENT_SCHEMAS[selectedComponent];
    if (!schema) return null;

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <h3 className="text-sm font-medium mb-4">Basic Settings</h3>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                            value={config.name || ''}
                            onChange={(e) => onChange({ ...config, name: e.target.value })}
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Input
                            value={config.description || ''}
                            onChange={(e) => onChange({ ...config, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Placeholder</label>
                        <Input
                            value={config.placeholder || ''}
                            onChange={(e) => onChange({ ...config, placeholder: e.target.value })}
                        />
                    </div>
                </div>
            </Card>

            {renderDesignControls()}

            <Card className="p-4">
                <h3 className="text-sm font-medium mb-4">Component Settings</h3>
                <div className="space-y-4">
                    {Object.entries(schema).map(([key, type]) => renderField(key, type))}
                </div>
            </Card>
        </div>
    );
};

export default ComponentConfigurator;