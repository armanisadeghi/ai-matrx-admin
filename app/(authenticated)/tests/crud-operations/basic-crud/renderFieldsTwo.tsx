
import React from 'react';
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    FormLabel,
    FormDescription,
    FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import {
    Edit,
    Link,
    ArrowUpRight,
    Calendar,
    Clock,
    Copy,
    Globe,
    Plus,
    X
} from "lucide-react";
import { EntityStateField } from '@/lib/types/schema';

interface SmartFieldWrapperProps {
    field: EntityStateField;
    formField: any;
    children: React.ReactNode;
    onRelationshipClick?: (field: EntityStateField) => void;
    onArrayItemAdd?: (field: EntityStateField) => void;
    onArrayItemRemove?: (field: EntityStateField, index: number) => void;
}

export const SmartFieldWrapper: React.FC<SmartFieldWrapperProps> = ({
                                                                        field,
                                                                        formField,
                                                                        children,
                                                                        onRelationshipClick,
                                                                        onArrayItemAdd,
                                                                        onArrayItemRemove
                                                                    }) => {
    const getFieldIcon = () => {
        switch (field.dataType) {
            case 'uuid': return <Copy className="h-4 w-4" />;
            case 'datetime': return (
                <div className="flex gap-1">
                    <Calendar className="h-4 w-4" />
                    <Clock className="h-4 w-4" />
                </div>
            );
            case 'object': return <Link className="h-4 w-4" />;
            case 'url': return <Globe className="h-4 w-4" />;
            default: return <Edit className="h-4 w-4" />;
        }
    };

    const getRelationshipBadge = () => {
        if (!field.isNative) {
            const relationshipTypes = {
                'foreignKey': 'Has One',
                'inverseForeignKey': 'Belongs To',
                'manyToMany': 'Many To Many'
            };
            return relationshipTypes[field.structure as keyof typeof relationshipTypes];
        }
        return null;
    };

    const renderMetadata = () => (
        <div className="flex flex-wrap items-center gap-2">
            {field.isPrimaryKey && (
                <Badge variant="outline" className="text-xs">PK</Badge>
            )}
            {field.isDisplayField && (
                <Badge variant="outline" className="text-xs">Display</Badge>
            )}
            {!field.isNative && (
                <Badge variant="secondary" className="text-xs">
                    {getRelationshipBadge()}
                </Badge>
            )}
            {field.validationFunctions?.map(func => (
                <Badge
                    key={func}
                    variant="outline"
                    className="text-[10px]"
                >
                    {func}
                </Badge>
            ))}
            {field.defaultGeneratorFunction && (
                <Badge
                    variant="outline"
                    className="text-[10px] bg-muted"
                >
                    {field.defaultGeneratorFunction}
                </Badge>
            )}
        </div>
    );

    const renderArrayField = () => (
        <div className="space-y-2">
            {Array.isArray(formField.value) && formField.value.map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                    {React.cloneElement(children as React.ReactElement, {
                        value: formField.value[index],
                        onChange: (value: any) => {
                            const newValue = [...formField.value];
                            newValue[index] = value;
                            formField.onChange(newValue);
                        }
                    })}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onArrayItemRemove?.(field, index)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button
                variant="outline"
                size="sm"
                onClick={() => onArrayItemAdd?.(field)}
                className="mt-2"
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
            </Button>
        </div>
    );

    const renderField = () => {
        if (field.isArray) {
            return renderArrayField();
        }

        return (
            <div className="relative group">
                {children}
                {!field.isNative && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRelationshipClick?.(field)}
                    >
                        <ArrowUpRight className="h-4 w-4" />
                    </Button>
                )}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-[200px,1fr] gap-4 items-start py-2">
            <div className="space-y-2">
                <FormLabel className="text-sm font-medium">
                    {field.displayName}
                </FormLabel>
                {renderMetadata()}
                {field.description && (
                    <FormDescription className="text-xs">
                        {field.description}
                    </FormDescription>
                )}
            </div>

            <div className="space-y-1">
                {renderField()}
                <FormMessage />
            </div>
        </div>
    );
};
