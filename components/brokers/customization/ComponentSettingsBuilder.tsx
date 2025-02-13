import { FieldValue } from "@/app/entities/hooks/unsaved-records/useUnsavedRecord";
import { Button, Input, Switch } from "@/components/ui";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { DataInputComponent } from "@/components/brokers/types";
import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const OrientationSettings = ({
    updateField,
    initialData,
}: {
    updateField: (fieldName: string, value: string) => void;
    initialData: DataInputComponent;
}) => {
    return (
        <div className="">
            <Separator className="my-4" />
            <h3 className="text-sm font-medium">Display Orientation</h3>
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <RadioGroup
                        defaultValue={initialData.orientation || "horizontal"}
                        onValueChange={(value) => updateField("orientation", value)}
                        className="grid grid-cols-2 gap-4 pt-2"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="horizontal" id="horizontal" />
                            <Label htmlFor="horizontal">Horizontal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="vertical" id="vertical" />
                            <Label htmlFor="vertical">Vertical</Label>
                        </div>
                    </RadioGroup>
                </div>
            </div>
        </div>
    );
};


export const BasicSettings = ({
    updateField,
    initialData,
}: {
    updateField: (fieldName: string, value: FieldValue) => void;
    initialData: DataInputComponent;
}) => {
    return (
        <div className="space-y-6">
            <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input 
                    id="name" 
                    value={initialData.name || ''}
                    onChange={(e) => updateField("name", e.target.value)} 
                    className="w-full" 
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input 
                    id="description" 
                    value={initialData.description || ''}
                    onChange={(e) => updateField("description", e.target.value)} 
                    className="w-full" 
                />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="placeholder">Placeholder</Label>
                <Input 
                    id="placeholder" 
                    value={initialData.placeholder || ''}
                    onChange={(e) => updateField("placeholder", e.target.value)} 
                    className="w-full" 
                />
            </div>
        </div>
    );
};
export const StyleSettings = ({
    updateField,
    initialData,
}: {
    updateField: (fieldName: string, value: FieldValue) => void;
    initialData: DataInputComponent;
}) => {
    return (
        <div className="space-y-6">
            <Separator className="my-4" />
            <h3 className="text-sm font-medium">Style Settings</h3>
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="containerClassName">Container Class</Label>
                    <Input
                        id="containerClassName"
                        value={initialData.containerClassName}
                        onChange={(e) => updateField("containerClassName", e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="collapsibleClassName">Collapsible Class</Label>
                    <Input
                        id="collapsibleClassName"
                        value={initialData.collapsibleClassName}
                        onChange={(e) => updateField("collapsibleClassName", e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="labelClassName">Label Class</Label>
                    <Input
                        id="labelClassName"
                        value={initialData.labelClassName}
                        onChange={(e) => updateField("labelClassName", e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="descriptionClassName">Description Class</Label>
                    <Input
                        id="descriptionClassName"
                        value={initialData.descriptionClassName}
                        onChange={(e) => updateField("descriptionClassName", e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="componentClassName">Component Class</Label>
                    <Input
                        id="componentClassName"
                        value={initialData.componentClassName}
                        onChange={(e) => updateField("componentClassName", e.target.value)}
                        className="w-full"
                    />
                </div>
            </div>
        </div>
    );
};
export const NumberSettings = ({
    updateField,
    initialData,
}: {
    updateField: (fieldName: string, value: FieldValue) => void;
    initialData: DataInputComponent;
}) => {
    return (
        <div className="">
            <Separator className="my-4" />
            <h3 className="text-sm font-medium">Number Settings</h3>
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="min">Min</Label>
                    <Input
                        id="min"
                        type="number"
                        value={initialData.min}
                        onChange={(e) => updateField("min", parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="max">Max</Label>
                    <Input
                        id="max"
                        type="number"
                        value={initialData.max}
                        onChange={(e) => updateField("max", parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="step">Step</Label>
                    <Input
                        id="step"
                        type="number"
                        value={initialData.step}
                        onChange={(e) => updateField("step", parseFloat(e.target.value))}
                        className="w-full"
                    />
                </div>
            </div>
        </div>
    );
};



export const OptionsSettings = ({
    updateField,
    initialData,
}: {
    updateField: (fieldName: string, value: any) => void;
    initialData: DataInputComponent;
}) => {
    // Create a memoized version of options with temporary IDs for React keys
    const optionsWithIds = useMemo(() => 
        initialData.options.map((option, index) => ({
            value: option,
            tempId: `option-${index}`
        })),
        [initialData.options]
    );

    const handleOptionChange = (tempId: string, newValue: string) => {
        const index = optionsWithIds.findIndex(opt => opt.tempId === tempId);
        const newOptions = [...initialData.options];
        newOptions[index] = newValue;
        updateField("options", newOptions);
    };

    const handleAddOption = () => {
        const newOption = `Option ${initialData.options.length + 1}`;
        updateField("options", [...initialData.options, newOption]);
    };

    const handleRemoveOption = (tempId: string) => {
        const index = optionsWithIds.findIndex(opt => opt.tempId === tempId);
        const newOptions = initialData.options.filter((_, i) => i !== index);
        updateField("options", newOptions);
    };

    const handleIncludeOtherChange = (checked: boolean) => {
        updateField("includeOther", checked);
    };

    const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        input.select();
    };

    return (
        <div className="space-y-6">
            <Separator className="my-4" />
            <h3 className="text-sm font-medium">Options Settings</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Include "Other" Option</Label>
                    <Switch 
                        checked={initialData.includeOther} 
                        onCheckedChange={handleIncludeOtherChange} 
                    />
                </div>

                <div className="space-y-2">
                    {optionsWithIds.map((option) => (
                        <div key={option.tempId} className="flex items-center gap-2">
                            <Input
                                id={`option-${option.tempId}`}
                                className="flex-1"
                                value={option.value}
                                onChange={(e) => handleOptionChange(option.tempId, e.target.value)}
                                onClick={handleInputClick}
                                placeholder="Option"
                            />
                            <Button 
                                onClick={() => handleRemoveOption(option.tempId)} 
                                variant="ghost" 
                                size="icon" 
                                className="shrink-0"
                                id={`button-remove-option-${option.tempId}`}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button 
                        onClick={handleAddOption} 
                        variant="secondary" 
                        size="sm" 
                        className="w-full mt-2"
                    >
                        Add Option
                    </Button>
                </div>
            </div>
        </div>
    );
};
