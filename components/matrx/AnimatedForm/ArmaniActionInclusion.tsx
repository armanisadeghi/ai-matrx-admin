import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
    Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/dialog';
import { Link, Globe, Code } from 'lucide-react';

// Presentation types for field actions
const PRESENTATION_TYPES = {
    MODAL: 'modal',
    SHEET: 'sheet',
    POPOVER: 'popover',
    INLINE: 'inline',
    CUSTOM: 'custom'
} as const;

// Helper to create field actions
const createFieldAction = (type: string, config: any) => ({
    type,
    icon: config.icon,
    label: config.label,
    presentation: config.presentation || PRESENTATION_TYPES.MODAL,
    buttonStyle: config.buttonStyle || 'icon',
    component: config.component,
    props: config.props || {},
    handleAction: config.handleAction,
    shouldShow: config.shouldShow || (() => true),
    containerProps: config.containerProps || {},
    renderContainer: config.renderContainer,
});

// Action container component
const ActionContainer = ({
                             presentation,
                             trigger,
                             content,
                             containerProps,
                             customContainer
                         }) => {
    switch (presentation) {
        case PRESENTATION_TYPES.MODAL:
            return (
                <Dialog>
                    <DialogTrigger asChild>{trigger}</DialogTrigger>
                    <DialogContent {...containerProps}>
                        {containerProps.title && (
                            <DialogHeader>
                                <DialogTitle>{containerProps.title}</DialogTitle>
                            </DialogHeader>
                        )}
                        {content}
                    </DialogContent>
                </Dialog>
            );

        case PRESENTATION_TYPES.SHEET:
            return (
                <Sheet>
                    <SheetTrigger asChild>{trigger}</SheetTrigger>
                    <SheetContent {...containerProps}>
                        {containerProps.title && (
                            <SheetHeader>
                                <SheetTitle>{containerProps.title}</SheetTitle>
                            </SheetHeader>
                        )}
                        {content}
                    </SheetContent>
                </Sheet>
            );

        case PRESENTATION_TYPES.POPOVER:
            return (
                <Popover>
                    <PopoverTrigger asChild>{trigger}</PopoverTrigger>
                    <PopoverContent {...containerProps}>
                        {content}
                    </PopoverContent>
                </Popover>
            );

        case PRESENTATION_TYPES.INLINE:
            return (
                <div {...containerProps}>
                    {trigger}
                    <div className="mt-2">{content}</div>
                </div>
            );

        case PRESENTATION_TYPES.CUSTOM:
            return customContainer({ trigger, content, ...containerProps });

        default:
            return trigger;
    }
};

// Field action component
const FieldAction = ({
                         action,
                         field,
                         value,
                         onChange
                     }) => {
    const ButtonIcon = action.icon;

    const buttonClass = action.buttonStyle === 'icon'
                        ? "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center justify-center"
                        : "h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center gap-2";

    const actionButton = (
        <Button
            variant="ghost"
            size="sm"
            className={buttonClass}
            onClick={() => action.handleAction?.(field, value)}
        >
            <ButtonIcon className="w-4 h-4"/>
            {action.buttonStyle === 'full' && action.label}
        </Button>
    );

    if (!action.component) {
        return actionButton;
    }

    const ActionComponent = action.component;
    const componentProps = {
        field,
        value,
        onChange,
        ...action.props
    };

    return (
        <ActionContainer
            presentation={action.presentation}
            trigger={actionButton}
            content={<ActionComponent {...componentProps} />}
            containerProps={action.containerProps}
            customContainer={action.renderContainer}
        />
    );
};

// Enhanced input wrapper with actions
const EnhancedInputWrapper = ({ field, children }) => {
    if (!field.actions || field.actions.length === 0) {
        return children;
    }

    return (
        <div className="relative">
            {children}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {field.actions.map((action, index) => (
                    <FieldAction
                        key={index}
                        action={action}
                        field={field}
                        value={field.value}
                        onChange={field.onChange}
                    />
                ))}
            </div>
        </div>
    );
};

// Main ArmaniForm component with integrated actions
const ArmaniForm = ({
                        fields,
                        formState,
                        onUpdateField,
                        onSubmit,
                        currentStep: externalCurrentStep,
                        onNextStep: externalOnNextStep,
                        onPrevStep: externalOnPrevStep,
                        isSinglePage = false,
                        className,
                        isFullPage = false,
                        columns = 1,
                        layout = 'grid',
                        enableSearch = false,
                        direction = 'row',
                        ...props
                    }) => {
    // ... (keep all your existing state and helper functions)

    // Modified renderField function to wrap fields with actions
    const renderField = (field) => {
        const commonProps = {
            field: {
                ...field,
                value: formState[field.name] || '',
                onChange: (value) => onUpdateField(field.name, value)
            },
            value: formState[field.name] || '',
            onChange: (value) => onUpdateField(field.name, value),
        };

        const fieldContent = (() => {
            switch (field.type) {
                case 'text':
                case 'email':
                case 'number':
                case 'password':
                case 'tel':
                case 'url':
                    return <AnimatedInput {...commonProps} />;
                // ... (rest of your existing field type cases)
                default:
                    return null;
            }
        })();

        return (
            <EnhancedInputWrapper field={field}>
                {fieldContent}
            </EnhancedInputWrapper>
        );
    };

    // ... (rest of your existing render functions and return statement)
};

export default ArmaniForm;
