import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import FieldAction from "./FieldAction";  // Your existing FieldAction component
import { useAppDispatch } from '@/lib/redux/hooks';
import {
    createMatrxActions
} from "./action-creator";

// Base field renderer without actions
const BaseFieldContent = ({ field, value, onChange }) => {
    switch (field.defaultComponent?.toLowerCase()) {
        case 'textarea':
            return (
                <Textarea
                    value={value || ''}
                    onChange={onChange}
                    className="w-full min-h-[100px] bg-input/50 border border-border rounded-md text-foreground"
                />
            );
        case 'select':
            return (
                <Select value={value || ''} onValueChange={(val) => onChange({ target: { value: val }})}>
                    <SelectTrigger className="w-full bg-input/50">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {(field.enumValues || []).map((option) => (
                            <SelectItem key={option.value || option} value={option.value || option}>
                                {option.label || option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        default:
            return (
                <Input
                    type="text"
                    value={value || ''}
                    onChange={onChange}
                    className="w-full h-10 px-3 bg-input/50 border border-border rounded-md text-foreground"
                />
            );
    }
};

// Wrapper that adds actions if needed
const FieldWrapper = ({ field, value, onChange, onActionComplete, actionMap, density='normal', animationPreset='smooth' }) => {
    const fieldContent = <BaseFieldContent field={field} value={value} onChange={onChange} />;

    // If no actions, just return the base field
    if (!field.actionKeys?.length) {
        return (
            <div className="relative">
                <Label>{field.label}</Label>
                {fieldContent}
            </div>
        );
    }

    // If has actions, wrap with action container
    return (
        <div className="relative">
            <Label>{field.label}</Label>
            <div className="relative">
                {fieldContent}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    {field.actionKeys.map((actionKey, index) => {
                        const action = actionMap[actionKey];
                        if (!action) return null;

                        return (
                            <FieldAction
                                key={index}
                                matrxAction={action}
                                field={field}
                                value={value}
                                onChange={onChange}
                                density={density}
                                animationPreset={animationPreset}
                                onActionComplete={onActionComplete}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// Inline form card component
const InlineFormCard = ({ parentField, initialValues = {}, onActionComplete, actionMap, density='normal', animationPreset='smooth' }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [values, setValues] = useState(initialValues);
    const [activeInlineForms, setActiveInlineForms] = useState(new Set());

    const handleChange = (fieldId, e) => {
        setValues(prev => ({
            ...prev,
            [fieldId]: e.target.value
        }));
    };

    const handleNestedActionComplete = (fieldId) => {
        setActiveInlineForms(prev => {
            const next = new Set(prev);
            next.add(fieldId);
            return next;
        });
    };

    if (!isVisible) return null;

    return (
        <Card className="mt-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">
                    {parentField.label} Details
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {parentField.inlineFields?.map((field) => (
                        <React.Fragment key={field.id}>
                            <FieldWrapper
                                field={field}
                                value={values[field.id]}
                                onChange={(e) => handleChange(field.id, e)}
                                onActionComplete={() => handleNestedActionComplete(field.id)}
                                actionMap={actionMap}
                            />
                            {activeInlineForms.has(field.id) && field.inlineFields && (
                                <div className="col-span-full">
                                    <InlineFormCard
                                        parentField={field}
                                        initialValues={values[`${field.id}_inlineValues`]}
                                        onActionComplete={handleNestedActionComplete}
                                        actionMap={actionMap}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute right-2 top-2 p-1 hover:bg-gray-100 rounded-full"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>
            </CardContent>
        </Card>
    );
};

// Main form component
const ActionForm = ({ fields, density='normal', animationPreset='smooth' }) => {
    const [values, setValues] = useState({});
    const [activeInlineForms, setActiveInlineForms] = useState(new Set());
    const dispatch = useAppDispatch();
    const actionMap = React.useMemo(() => createMatrxActions(dispatch), [dispatch]);

    const handleChange = (fieldId, e) => {
        setValues(prev => ({
            ...prev,
            [fieldId]: e.target.value
        }));
    };

    const handleActionComplete = (fieldId, isOpen) => {
        if (!isOpen) {
            setActiveInlineForms(prev => {
                const next = new Set(prev);
                next.add(fieldId);
                return next;
            });
        }
    };

    return (
        <div className="space-y-6 p-4">
            {fields.map((field) => (
                <React.Fragment key={field.id}>
                    <FieldWrapper
                        field={field}
                        value={values[field.id]}
                        onChange={(e) => handleChange(field.id, e)}
                        onActionComplete={(isOpen) => handleActionComplete(field.id, isOpen)}
                        actionMap={actionMap}
                        density={density}
                        animationPreset={animationPreset}

                    />
                    {activeInlineForms.has(field.id) && field.inlineFields && (
                        <InlineFormCard
                            parentField={field}
                            initialValues={values[`${field.id}_inlineValues`]}
                            onActionComplete={handleActionComplete}
                            actionMap={actionMap}
                            density={density}
                            animationPreset={animationPreset}

                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default ActionForm;
