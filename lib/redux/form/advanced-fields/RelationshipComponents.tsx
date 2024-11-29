import React, {useState} from 'react';
import {Link2} from 'lucide-react';
import {motion} from 'framer-motion';
import {cn} from "@/lib/utils";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";

// https://claude.ai/chat/9e441e1f-824a-46c3-addb-0c85236569e0

const fieldVariants = {
    initial: {opacity: 0, y: -10},
    animate: {opacity: 1, y: 0},
    exit: {opacity: 0, y: -10}
};

interface BaseRelatedFieldProps {
    field: EntityStateField;
    onRelatedClick?: (fieldName: string) => void;
    className?: string;
}

interface RelatedInputProps extends BaseRelatedFieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, keyof BaseRelatedFieldProps> {
}

interface RelatedTextareaProps extends BaseRelatedFieldProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, keyof BaseRelatedFieldProps> {
}

const RelatedInput = React.forwardRef<HTMLInputElement, RelatedInputProps>(
    ({field, onRelatedClick, className, value, onChange, onBlur, ...props}, ref) => {
        const [isFocused, setIsFocused] = useState(false);
        const [hasValue, setHasValue] = useState(!!value);

        const handleRelatedClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (onRelatedClick) {
                onRelatedClick(field.name);
            }
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setHasValue(e.target.value.length > 0);
            if (onChange) {
                onChange(e);
            }
        };

        const handleFocus = () => setIsFocused(true);

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            if (onBlur) {
                onBlur(e);
            }
        };

        return (
            <motion.div
                className="w-full space-y-2"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={fieldVariants}
            >
                <div className="flex items-center justify-between">
                    <Label
                        htmlFor={field.name}
                        className={cn(
                            "text-sm font-medium transition-colors",
                            isFocused ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        {field.displayName}
                        {field.isRequired && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.isRequired && (
                        <span className="text-xs text-muted-foreground">Required</span>
                    )}
                </div>

                <div className="relative flex items-center">
                    <Input
                        ref={ref}
                        id={field.name}
                        value={value}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        className={cn(
                            "pr-8", // Adjusted padding to accommodate the icon
                            isFocused && "ring-2 ring-primary ring-offset-2",
                            className
                        )}
                        style={{paddingRight: '2.5rem'}} // Ensure space for icon
                        {...props}
                    />

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <motion.button
                                    type="button"
                                    className={cn(
                                        "absolute right-2.5 flex items-center justify-center",
                                        "w-4 h-4 rounded-full",
                                        "hover:bg-muted/50 transition-colors duration-200",
                                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                    )}
                                    onClick={handleRelatedClick}
                                    whileHover={{scale: 1.1}}
                                    whileTap={{scale: 0.95}}
                                >
                                    <Link2
                                        className={cn(
                                            "w-3 h-3 transition-colors duration-200",
                                            isFocused || hasValue ? "text-primary" : "text-muted-foreground"
                                        )}
                                    />
                                </motion.button>
                            </TooltipTrigger>
                            <TooltipContent>
                                View related data
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {field.maxLength && (
                    <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              Max length: {field.maxLength}
            </span>
                    </div>
                )}
            </motion.div>
        );
    }
);

const RelatedTextarea = React.forwardRef<HTMLTextAreaElement, RelatedTextareaProps>(
    ({field, onRelatedClick, className, value, onChange, onBlur, ...props}, ref) => {
        const [isFocused, setIsFocused] = useState(false);
        const [hasValue, setHasValue] = useState(!!value);

        const handleRelatedClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (onRelatedClick) {
                onRelatedClick(field.name);
            }
        };

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setHasValue(e.target.value.length > 0);
            if (onChange) {
                onChange(e);
            }
        };

        const handleFocus = () => setIsFocused(true);

        const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
            setIsFocused(false);
            if (onBlur) {
                onBlur(e);
            }
        };

        return (
            <motion.div
                className="w-full space-y-2"
                initial="initial"
                animate="animate"
                exit="exit"
                variants={fieldVariants}
            >
                <div className="flex items-center justify-between">
                    <Label
                        htmlFor={field.name}
                        className={cn(
                            "text-sm font-medium transition-colors",
                            isFocused ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        {field.displayName}
                        {field.isRequired && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {field.isRequired && (
                        <span className="text-xs text-muted-foreground">Required</span>
                    )}
                </div>

                <div className="relative">
                    <Textarea
                        ref={ref}
                        id={field.name}
                        value={value}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        className={cn(
                            "min-h-[100px] pr-8", // Adjusted padding
                            isFocused && "ring-2 ring-primary ring-offset-2",
                            className
                        )}
                        style={{paddingRight: '2.5rem'}} // Ensure space for icon
                        {...props}
                    />

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <motion.button
                                    type="button"
                                    className={cn(
                                        "absolute right-2.5 top-2.5 flex items-center justify-center",
                                        "w-4 h-4 rounded-full",
                                        "hover:bg-muted/50 transition-colors duration-200",
                                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                    )}
                                    onClick={handleRelatedClick}
                                    whileHover={{scale: 1.1}}
                                    whileTap={{scale: 0.95}}
                                >
                                    <Link2
                                        className={cn(
                                            "w-3 h-3 transition-colors duration-200",
                                            isFocused || hasValue ? "text-primary" : "text-muted-foreground"
                                        )}
                                    />
                                </motion.button>
                            </TooltipTrigger>
                            <TooltipContent>
                                View related data
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {field.maxLength && (
                    <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              Max length: {field.maxLength}
            </span>
                    </div>
                )}
            </motion.div>
        );
    }
);

RelatedInput.displayName = 'RelatedInput';
RelatedTextarea.displayName = 'RelatedTextarea';

export {RelatedInput, RelatedTextarea};


/*
// With form control
const MyForm = () => {
    const formField = {
        value: "some value",
        onChange: (e) => console.log(e.target.value),
        onBlur: (e) => console.log('blur'),
        ref: useRef(null)
    };

    return (
        <RelatedInput
            field={field}
            value={formField.value}
            onChange={formField.onChange}
            onBlur={formField.onBlur}
            ref={formField.ref}
            className="w-full"
        />
    );
};

// Or with React Hook Form
const MyFormWithHookForm = () => {
    const { register } = useForm();
    const formField = register("fieldName");

    return (
        <RelatedInput
            field={field}
            value={formField.value}
            onChange={formField.onChange}
            onBlur={formField.onBlur}
            ref={formField.ref}
            className="w-full"
        />
    );
};*/
