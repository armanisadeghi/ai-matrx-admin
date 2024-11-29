import React, {TextareaHTMLAttributes, useMemo, useState} from "react";
import {cn} from "@/styles/themes/utils";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui";
import {EntityBaseFieldProps} from "../EntityBaseField";
import {createEntitySelectors} from "@/lib/redux/entity/selectors";
import {useAppDispatch, useAppSelector} from "@/lib/redux/hooks";
import {SmartComponentProps} from "@/components/matrx/ArmaniForm/SimpleRelationshipWrapper";
import {updateFieldValue, initializeField} from "@/lib/redux/concepts/fields/fieldSlice";
import {selectFieldValue} from "@/lib/redux/concepts/fields/selectors";
import {useForm} from "@/lib/redux/concepts/fields/component-examples/fieldComponentExample";


export const SmartTextarea: React.FC<SmartComponentProps> = (
    {
        entityKey,
        matrxRecordId,
        fieldInfo,
        dynamicStyles,
        ...props
    }) => {
    const dispatch = useAppDispatch();
    const {mode} = useForm();

    const identifier = {
        entityKey,
        fieldName: fieldInfo.name,
        recordId: matrxRecordId || 'new'
    };

    const selectors = React.useMemo(
        () => createEntitySelectors(entityKey),
        [entityKey]
    );

    const valueFromGlobalState = useAppSelector((state) =>
        selectors.selectFieldByKey(state, matrxRecordId, fieldInfo.name)
    );

    const localValue = useAppSelector(state =>
        selectFieldValue(state, identifier)) ?? fieldInfo.defaultValue;

    React.useEffect(() => {
        dispatch(initializeField({
            identifier,
            initialValue: valueFromGlobalState ?? fieldInfo.defaultValue,
            mode
        }));
    }, [
        dispatch,
        valueFromGlobalState,
        fieldInfo.defaultValue,
        matrxRecordId,
        mode
    ]);

    const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(updateFieldValue({
            identifier,
            value: e.target.value
        }));
    };

    const isDisabled = mode === 'display' || mode === 'view';

    return (
        <EntityTextarea
            entityKey={entityKey}
            dynamicFieldInfo={fieldInfo}
            value={localValue}
            onChange={onChange}
            density={dynamicStyles.density}
            animationPreset={dynamicStyles.animationPreset}
            size={dynamicStyles.size}
            className=""
            variant={dynamicStyles.variant}
            disabled={isDisabled}
            floatingLabel={true}
            labelPosition="default"
            {...props}
        />
    );
};


interface EntityTextareaProps extends EntityBaseFieldProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
}

const EntityTextarea: React.FC<EntityTextareaProps> = (
    {
        entityKey,
        dynamicFieldInfo: field,
        value = field.defaultValue,
        onChange,
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        className,
        variant = "default",
        disabled = false,
        floatingLabel = true,
        labelPosition = 'default',
        ...props
    }) => {
    const customProps = field.componentProps as Record<string, unknown>;
    const rows = customProps?.rows as number ?? 3;

    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const variantStyles = {
        destructive: "border-destructive text-destructive",
        success: "border-success text-success",
        outline: "border-2",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "border-none bg-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        primary: "bg-primary text-primary-foreground",
        default: "",
    }[variant];

    const labelClassName = useMemo(() =>
            `absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20 text-sm ${
                (isFocused || value)
                ? `absolute -top-2 text-sm ${
                    disabled
                    ? '[&]:text-gray-400 dark:[&]:text-gray-400'
                    : '[&]:text-blue-500 dark:[&]:text-blue-500'
                }`
                : 'top-3 [&]:text-gray-400 dark:[&]:text-gray-400'
            }`,
        [isFocused, value, disabled]
    );

    const standardLayout = (
        <>
            <Label
                htmlFor={field.name}
                className={cn(
                    "block text-sm font-medium mb-1",
                    disabled ? "text-muted-foreground" : "text-foreground"
                )}
            >
                {field.displayName}
            </Label>
            <Textarea
                id={field.name}
                value={value}
                onChange={handleChange}
                required={field.isRequired}
                disabled={disabled}
                rows={rows}
                className={cn(
                    "text-md",
                    "h-auto",
                    variantStyles,
                    disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
                )}
                {...props}
            />
        </>
    );

    const floatingLabelLayout = (
        <div className="relative mt-2">
            <Textarea
                id={field.name}
                value={value}
                onChange={handleChange}
                required={field.isRequired}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                rows={rows}
                className={cn(
                    "text-md",
                    "pt-6 pb-2",
                    "h-auto",
                    variantStyles,
                    disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
                )}
                {...props}
            />
            <Label
                htmlFor={field.name}
                className={labelClassName}
            >
                <span className="px-1 relative z-20">
                    {field.displayName}
                </span>
            </Label>
        </div>
    );

    return floatingLabel ? floatingLabelLayout : standardLayout;
};

export default EntityTextarea;
