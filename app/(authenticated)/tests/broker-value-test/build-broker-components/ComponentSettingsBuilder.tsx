import { DataInputComponent } from "@/components/brokers/types";

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
            <Input
                label="Name"
                value={componentData.name || ''}
                onChange={e => updateField('name', e.target.value)}
            />
            <Input
                label="Description"
                value={componentData.description || ''}
                onChange={e => updateField('description', e.target.value)}
            />
            <Input
                label="Placeholder"
                value={componentData.placeholder || ''}
                onChange={e => updateField('placeholder', e.target.value)}
            />
        </div>
    );
};

// components/builder/StyleSettings.tsx
export const StyleSettings = ({ componentData, updateField }) => {
    return (
        <div className="space-y-4">
            <Input
                label="Container Class"
                value={componentData.containerClassName || ''}
                onChange={e => updateField('containerClassName', e.target.value)}
            />
            {/* Other className inputs */}
        </div>
    );
};

// components/builder/NumberSettings.tsx
export const NumberSettings = ({ componentData, updateField }) => {
    return (
        <div className="space-y-4">
            <Input
                type="number"
                label="Min"
                value={componentData.min || ''}
                onChange={e => updateField('min', parseFloat(e.target.value))}
            />
            <Input
                type="number"
                label="Max"
                value={componentData.max || ''}
                onChange={e => updateField('max', parseFloat(e.target.value))}
            />
            <Input
                type="number"
                label="Step"
                value={componentData.step || ''}
                onChange={e => updateField('step', parseFloat(e.target.value))}
            />
        </div>
    );
};

// components/builder/OptionsSettings.tsx
export const OptionsSettings = ({ componentData, updateField }) => {
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