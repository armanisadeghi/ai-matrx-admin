import { DataInputComponent } from "@/components/brokers/types";
import { Button, Input } from "@/components/ui";

// components/builder/BasicSettings.tsx
export const BasicSettings = ({ 
    componentData, 
    updateField 
}: { 
    componentData: DataInputComponent;
    updateField: <K extends keyof DataInputComponent>(field: K, value: DataInputComponent[K]) => void;
}) => {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                    Name
                </label>
                <Input
                    id="name"
                    value={componentData.name || ''}
                    onChange={e => updateField('name', e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                    Description
                </label>
                <Input
                    id="description"
                    value={componentData.description || ''}
                    onChange={e => updateField('description', e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="placeholder" className="text-sm font-medium">
                    Placeholder
                </label>
                <Input
                    id="placeholder"
                    value={componentData.placeholder || ''}
                    onChange={e => updateField('placeholder', e.target.value)}
                />
            </div>
        </div>
    );
};

// components/builder/StyleSettings.tsx
export const StyleSettings = ({ componentData, updateField }) => {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="containerClassName" className="text-sm font-medium">
                    Container Class
                </label>
                <Input
                    id="containerClassName"
                    value={componentData.containerClassName || ''}
                    onChange={e => updateField('containerClassName', e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="collapsibleClassName" className="text-sm font-medium">
                    Collapsible Class
                </label>
            <Input
                    id="collapsibleClassName"
                    value={componentData.collapsibleClassName || ''}
                    onChange={e => updateField('collapsibleClassName', e.target.value)}
                />
            </div>
            {/* Other className inputs */}
        </div>
    );
};

// components/builder/NumberSettings.tsx
export const NumberSettings = ({ componentData, updateField }) => {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label htmlFor="min" className="text-sm font-medium">
                    Min
                </label>
                <Input
                    id="min"
                    type="number"
                    value={componentData.min || ''}
                    onChange={e => updateField('min', parseFloat(e.target.value))}
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="max" className="text-sm font-medium">
                    Max
                </label>
                <Input
                    id="max"
                    type="number"
                    value={componentData.max || ''}
                    onChange={e => updateField('max', parseFloat(e.target.value))}
                />
            </div>
            <div className="space-y-2">
                <label htmlFor="step" className="text-sm font-medium">
                    Step
                </label>
                <Input
                    id="step"
                    type="number"
                    value={componentData.step || ''}
                    onChange={e => updateField('step', parseFloat(e.target.value))}
                />
            </div>
        </div>
    );
};

// components/builder/OptionsSettings.tsx
export const OptionsSettings = ({ 
    componentData, 
    updateField 
}: {
    componentData: DataInputComponent;
    updateField: <K extends keyof DataInputComponent>(field: K, value: DataInputComponent[K]) => void;
}) => {
    const handleOptionChange = (index: number, field: 'label' | 'value', value: string) => {
        const newOptions = [...(componentData.options || [])];
        newOptions[index] = {
            ...newOptions[index],
            [field]: value
        };
        updateField('options', newOptions);
    };

    return (
        <div className="space-y-4">
            {(componentData.options || []).map((option, index) => (
                <div key={index} className="flex gap-2">
                    <Input
                        value={option.label}
                        onChange={e => handleOptionChange(index, 'label', e.target.value)}
                        placeholder="Label"
                    />
                    <Input
                        value={option.value}
                        onChange={e => handleOptionChange(index, 'value', e.target.value)}
                        placeholder="Value"
                    />
                </div>
            ))}
            <Button
                onClick={() => updateField('options', [...(componentData.options || []), { label: '', value: '' }])}
            >
                Add Option
            </Button>
        </div>
    );
};