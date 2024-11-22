import React, {createContext, useContext, useCallback, useMemo} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {cn} from '@/utils/cn';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {Label} from '@/components/ui/label';
import {InfoIcon, ChevronDown, ChevronUp} from 'lucide-react';
import {AnimationPreset, densityConfig, getAnimationVariants} from '@/config/ui/entity-layout-config';
import {EntityField, MatrxVariant} from '../field-components/types';

// Types
type FieldContextType = {
    field: EntityField;
    density: keyof typeof densityConfig;
    animation: AnimationPreset;
    variant: MatrxVariant;
    isExpanded: boolean;
    toggleExpand: () => void;
};

// Create context for field state management
const FieldContext = createContext<FieldContextType | undefined>(undefined);

// Custom hook for accessing field context
const useField = () => {
    const context = useContext(FieldContext);
    if (!context) {
        throw new Error('useField must be used within a FieldProvider');
    }
    return context;
};

export interface DynamicFieldWrapperProps {
    field: EntityField;
    children: React.ReactNode;
    density?: keyof typeof densityConfig;
    animation?: AnimationPreset;
    variant?: MatrxVariant;
    className?: string;
    expandable?: boolean;
}

// Enhanced Field Container Component
const DynamicFieldWrapper: React.FC<DynamicFieldWrapperProps> = (
    {
        field,
        children,
        density = 'normal',
        animation = 'smooth',
        variant = 'default',
        className,
        expandable = false,
    }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const [isHovered, setIsHovered] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const toggleExpand = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const densityStyles = useMemo(() => densityConfig[density], [density]);
    const animationVariants = useMemo(() => getAnimationVariants(animation), [animation]);

    // Compute dynamic styles based on state and props
    const containerStyles = useMemo(() => {
        return cn(
            // Base styles
            'relative rounded-lg border transition-all duration-200',
            densityStyles.padding.md,
            densityStyles.spacing,

            // Variant styles
            variant === 'default' && 'bg-background border-input',
            variant === 'destructive' && 'border-destructive bg-destructive/5',
            variant === 'success' && 'border-green-500 bg-green-50 dark:bg-green-900/20',
            variant === 'outline' && 'border-2',
            variant === 'secondary' && 'bg-secondary',
            variant === 'ghost' && 'border-transparent',
            variant === 'primary' && 'bg-primary/5 border-primary',

            // State styles
            isFocused && 'ring-2 ring-ring',
            isHovered && !field.disabled && 'border-primary/50',
            field.disabled && 'opacity-50 cursor-not-allowed',

            // Custom classes
            className
        );
    }, [variant, isFocused, isHovered, field.disabled, density, className]);

    const contextValue = useMemo(() => ({
        field,
        density,
        animation,
        variant,
        isExpanded,
        toggleExpand,
    }), [field, density, animation, variant, isExpanded, toggleExpand]);

    return (
        <FieldContext.Provider value={contextValue}>
            <motion.div
                variants={animationVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={containerStyles}
            >
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Label
                            htmlFor={field.name}
                            className={cn(
                                densityStyles.fontSize,
                                'font-medium',
                                field.disabled ? 'text-muted-foreground' : 'text-foreground'
                            )}
                        >
                            {field.displayName}
                            {field.componentProps.required && (
                                <span className="text-destructive ml-1">*</span>
                            )}
                        </Label>

                        {field.description && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <InfoIcon className={cn(
                                            densityStyles.iconSize,
                                            'text-muted-foreground hover:text-foreground transition-colors'
                                        )}/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className={densityStyles.fontSize}>{field.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>

                    {expandable && (
                        <button
                            onClick={toggleExpand}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {isExpanded ? (
                                <ChevronUp className={densityStyles.iconSize}/>
                            ) : (
                                 <ChevronDown className={densityStyles.iconSize}/>
                             )}
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {(!expandable || isExpanded) && (
                        <motion.div
                            initial={{height: 0, opacity: 0}}
                            animate={{height: 'auto', opacity: 1}}
                            exit={{height: 0, opacity: 0}}
                            transition={{duration: 0.2}}
                            className="overflow-hidden"
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </FieldContext.Provider>
    );
};

// Field Group Component for organizing related fields
interface FieldGroupProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    density?: keyof typeof densityConfig;
    animation?: AnimationPreset;
    className?: string;
    collapsible?: boolean;
}

const FieldGroup: React.FC<FieldGroupProps> = (
    {
        title,
        description,
        children,
        density = 'normal',
        animation = 'smooth',
        className,
        collapsible = false,
    }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const densityStyles = densityConfig[density];
    const animationVariants = getAnimationVariants(animation);

    return (
        <motion.div
            variants={animationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
                'border rounded-lg',
                densityStyles.padding.md,
                className
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className={cn(
                        'font-semibold',
                        densityStyles.fontSize
                    )}>{title}</h3>
                    {description && (
                        <p className={cn(
                            'text-muted-foreground mt-1',
                            densityStyles.fontSize
                        )}>{description}</p>
                    )}
                </div>

                {collapsible && (
                    <button
                        onClick={() => setIsExpanded(prev => !prev)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronUp className={densityStyles.iconSize}/>
                        ) : (
                             <ChevronDown className={densityStyles.iconSize}/>
                         )}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {(!collapsible || isExpanded) && (
                    <motion.div
                        initial={{height: 0, opacity: 0}}
                        animate={{height: 'auto', opacity: 1}}
                        exit={{height: 0, opacity: 0}}
                        transition={{duration: 0.2}}
                        className={cn(
                            'space-y-4',
                            densityStyles.spacing
                        )}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Inline Field Group for horizontal layouts
interface InlineFieldGroupProps {
    children: React.ReactNode;
    density?: keyof typeof densityConfig;
    spacing?: 'tight' | 'normal' | 'loose';
    className?: string;
}

const InlineFieldGroup: React.FC<InlineFieldGroupProps> = (
    {
        children,
        density = 'normal',
        spacing = 'normal',
        className,
    }) => {
    const gapMap = {
        tight: 'gap-2',
        normal: 'gap-4',
        loose: 'gap-6'
    };

    return (
        <div className={cn(
            'flex flex-wrap items-start',
            gapMap[spacing],
            className
        )}>
            {children}
        </div>
    );
};

export {DynamicFieldWrapper, FieldGroup, InlineFieldGroup, useField};
