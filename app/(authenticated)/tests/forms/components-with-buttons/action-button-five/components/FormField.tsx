import React from 'react';
import {Label} from '@/components/ui/label';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {FormFieldProps, FormVariant} from '../types';
import ActionButton from "./ActionButton";
import ModalContent from "./ModalContent";
import FieldTooltip from "./FieldTooltip";
import OptionalField from "./OptionalField";
import FieldInput from "./FieldInput";
import DynamicFields from "./DynamicFields";  // Make sure to import DynamicFields

const FormField: React.FC<FormFieldProps> = (
    {
        label,
        type = 'text',
        description,
        optional = false,
        value,
        onChange,
        variant = 'default',
        singleLine = false,
        onAction,
        dynamicFields,
    }) => {
    const [isDialogOpen, setIsDialogOpen] = React.useState<boolean>(false);
    const [isFocused, setIsFocused] = React.useState<boolean>(false);
    const [showDynamicFields, setShowDynamicFields] = React.useState<boolean>(false);

    const handleAction = () => {
        if (onAction) {
            onAction();
        }
        setShowDynamicFields(true);
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    const getModalTitle = (): string => {
        const titles: Record<FormVariant, string> = {
            json: 'Edit JSON',
            record: 'Select Record',
            edit: 'Edit Content',
            file: 'Upload File',
            datetime: 'Select Date & Time',
            url: 'Edit URL',
            code: 'Edit Code',
            default: 'Edit Content'
        };
        return titles[variant];
    };

    return (
        <>
            <div className="mb-6">
                <div className="flex items-baseline mb-1">
                    <Label className="text-sm font-normal text-muted-foreground">{label}</Label>
                    <span className="text-xs text-muted ml-2">{type}</span>
                </div>

                <div className="relative">
                    <div className={`
                        ${singleLine ? 'h-10' : 'min-h-24'} 
                        w-full bg-input/50
                        border border-border rounded-md 
                        ${isFocused ? 'ring-2 ring-ring border-border' : ''}
                        transition-all duration-200 flex items-center
                    `}>
                        <FieldInput
                            singleLine={singleLine}
                            value={value || ''}
                            onChange={onChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                        />

                        {variant !== 'default' && (
                            <div className="absolute right-2 flex items-center h-full">
                                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                    <DialogTrigger asChild>
                                        <div onClick={handleAction}>
                                            <ActionButton variant={variant}/>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="bg-background text-foreground">
                                        <DialogHeader>
                                            <DialogTitle>{getModalTitle()}</DialogTitle>
                                        </DialogHeader>
                                        <ModalContent
                                            variant={variant}
                                            value={value}
                                            onChange={onChange}
                                        />
                                    </DialogContent>
                                </Dialog>
                            </div>
                        )}
                    </div>

                    {showDynamicFields && dynamicFields && (
                        <DynamicFields
                            fields={dynamicFields}
                            parentValue={value || ''}
                            onFieldChange={onChange}
                        />
                    )}
                </div>

                {description && <FieldTooltip description={description}/>}
                {optional && <OptionalField/>}
            </div>
        </>
    );
};

export default FormField;
