'use client';

import React, { useState } from "react";
import {motion} from "framer-motion";
import {cn} from "@/styles/themes/utils";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {FormField} from "@/types/AnimatedFormTypes";
import {MatrxVariant} from './types';
import {
    AllEntityFieldKeys,
    AnyEntityDatabaseTable,
    EntityKeys,
    ForeignKeyReference,
    TypeBrand
} from "@/types/entityTypes";
import {ComponentProps, EntityStateField} from "@/lib/redux/entity/types";
import {DataStructure, FieldDataOptionsType} from "@/components/matrx/Entity/types/entityForm";


export interface EntityBaseFieldProps {
    entityKey: EntityKeys;
    value: any;
    onChange: (value: any) => void;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    dynamicFieldInfo: {
        name: AllEntityFieldKeys;
        displayName: string;
        uniqueColumnId: string;
        uniqueFieldId: string;
        dataType: FieldDataOptionsType;
        isRequired: boolean;
        maxLength: number;
        isArray: boolean;
        defaultValue: any;
        isPrimaryKey: boolean;
        isDisplayField?: boolean;
        defaultGeneratorFunction: string;
        validationFunctions: string[];
        exclusionRules: string[];
        defaultComponent?: string;
        componentProps: ComponentProps;
        structure: DataStructure;
        isNative: boolean;
        typeReference: TypeBrand<any>;
        enumValues: string[];
        entityName: EntityKeys;
        databaseTable: AnyEntityDatabaseTable;
        foreignKeyReference: ForeignKeyReference | null;
        description: string;
    };
}

interface EntityTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    className?: string;
    variant: MatrxVariant;
    floatingLabel?: boolean;
}

const EntityTextarea: React.FC<EntityTextareaProps> = (
    {
        entityKey,
        dynamicFieldInfo: field,
        value = " ",
        onChange,
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        className,
        variant = "default",
        disabled = false,
        floatingLabel = true,
        ...props
    }) => {

    const customProps = field.componentProps as Record<string, unknown>;
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const getVariantStyles = (variant: MatrxVariant) => {
        switch (variant) {
            case "destructive":
                return "border-destructive text-destructive";
            case "success":
                return "border-success text-success";
            case "outline":
                return "border-2";
            case "secondary":
                return "bg-secondary text-secondary-foreground";
            case "ghost":
                return "border-none bg-transparent";
            case "link":
                return "text-primary underline-offset-4 hover:underline";
            case "primary":
                return "bg-primary text-primary-foreground";
            default:
                return "";
        }
    };

    // Standard layout
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
                className={cn(
                    "text-md",
                    "min-h-[132px]",
                    getVariantStyles(variant),
                    disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
                )}
                {...props}
            />
        </>
    );

    // Floating label layout

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
                className={cn(
                    "text-md",
                    "min-h-[132px]",
                    "pt-6 pb-2",
                    getVariantStyles(variant),
                    disabled ? "cursor-not-allowed opacity-50 bg-muted" : ""
                )}
                {...props}
            />
            <Label
                htmlFor={field.name}
                className={`absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20 text-sm ${
                    (isFocused || value)
                    ? `absolute -top-2 text-xs ${
                        disabled
                        ? '[&]:text-gray-400 dark:[&]:text-gray-400'
                        : '[&]:text-blue-500 dark:[&]:text-blue-500'
                    }`
                    : 'top-3 [&]:text-gray-400 dark:[&]:text-gray-400'
                }`}
            >
                <span className="px-1 relative z-20">
                    {field.displayName}
                </span>
            </Label>

        </div>
    );

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            transition={{duration: 0.3}}
            className={cn(
                "mb-4",
                floatingLabel && "pt-1",
                className
            )}
        >
            {floatingLabel ? floatingLabelLayout : standardLayout}
        </motion.div>
    );
};

export default EntityTextarea;
