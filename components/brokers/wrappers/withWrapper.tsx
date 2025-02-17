import React from "react";
import {
    Label,
    Input,
    Textarea,
    RadioGroup,
    RadioGroupItem,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Checkbox,
    Skeleton,
    Card,
    CardContent,
    Slider,
    Switch,
    Button,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useCreateUpdateBrokerValue } from "../hooks/useBrokerValueNew";
import { UsePrepareRecipeToRunReturn } from "@/hooks/run-recipe/usePrepareRecipeToRun";
import { BrokerWithComponent, BrokerWithComponentsMap } from "@/hooks/run-recipe/types";
import { useOtherOption } from "../value-components/hooks/useOtherOption";
import { Plus, Minus, Check } from "lucide-react";
import TextArrayInput from "@/components/ui/matrx/TextArrayInput";
import { generateColorStyle, TAILWIND_COLORS, TailwindColor  } from "@/constants/rich-text-constants";
import { RunGenericHookType } from "@/hooks/run-recipe/useRunApps";
interface BrokerComponentProps extends BrokerWithComponent {
    value: any;
    onChange: (value: any) => void;
}


export const BrokerColorPicker: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    componentMetadata, 
    value, 
    onChange 
 }) => {
    const currentColor = value || '#6B7280';
 
    return (
        <div className={cn('flex items-center gap-2 w-full', componentMetadata.componentClassName)}>
            <Input
                type="color"
                value={currentColor}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    "h-8 w-24",
                    "border rounded",
                    "[&::-webkit-color-swatch-wrapper]:p-0",
                    "[&::-webkit-color-swatch]:border-none",
                    "[&::-webkit-color-swatch]:h-full",
                    "[&::-webkit-color-swatch]:w-full",
                    "[&::-moz-color-swatch]:border-none",
                    "[&::-moz-color-swatch]:h-full",
                    "[&::-moz-color-swatch]:w-full",
                    "p-0"
                )}
            />
            
            <Input
                type="text"
                value={currentColor.toUpperCase()}
                onChange={(e) => {
                    const newValue = e.target.value;
                    if (/^#[0-9A-F]{6}$/i.test(newValue)) {
                        onChange(newValue);
                    }
                }}
                className="h-8 w-24 text-center uppercase font-mono text-sm"
                maxLength={7}
            />
        </div>
    );
 };
 
 export const BrokerTailwindColorPicker: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    componentMetadata, 
    value, 
    onChange 
 }) => {
    const currentColor = (value as TailwindColor) || TAILWIND_COLORS[0];
 
    return (
        <div className={cn('w-full', componentMetadata.componentClassName)}>
            <div className="flex flex-wrap gap-1.5">
                {TAILWIND_COLORS.map((color) => (
                    <button
                        key={color}
                        onClick={() => onChange(color)}
                        className={cn(
                            'w-7 h-7 rounded flex items-center justify-center',
                            'ring-offset-background',
                            generateColorStyle(color),
                            currentColor === color ? 'ring-2 ring-ring ring-offset-2' : 'ring-1 ring-ring/20'
                        )}
                        type="button"
                        aria-label={`Select ${color}`}
                    >
                        {currentColor === color && (
                            <Check className="w-3 h-3" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
 };
 

export const BrokerTextArrayInput: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    componentMetadata, 
    value, 
    onChange 
 }) => {
    const arrayValue = Array.isArray(value) ? value : (value ? [value] : []);
    const chipClassName = componentMetadata.additionalParams?.chipClassName;
 
    return (
        <TextArrayInput
            value={arrayValue}
            onChange={onChange}
            placeholder={componentMetadata.placeholder}
            showCopyIcon={false}
            chipClassName={chipClassName as string}
            className={cn(componentMetadata.componentClassName)}
        />
    );
 };
 


 export const BrokerNumberPicker: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    componentMetadata, 
    value, 
    onChange 
 }) => {
    const min = componentMetadata.min ?? 0;
    const max = componentMetadata.max ?? 100;
    const step = componentMetadata.step ?? 1;
 
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value === '' ? min : Number(e.target.value);
        if (newValue >= min && newValue <= max) {
            onChange(newValue);
        }
    };
 
    const increment = () => {
        const newValue = Number(value ?? min) + step;
        if (newValue <= max) {
            onChange(newValue);
        }
    };
 
    const decrement = () => {
        const newValue = Number(value ?? min) - step;
        if (newValue >= min) {
            onChange(newValue);
        }
    };
 
    return (
        <div className={cn('flex items-center space-x-2', componentMetadata.componentClassName)}>
            <Button
                variant="outline"
                size="icon"
                onClick={decrement}
                disabled={Number(value ?? min) <= min}
                className="h-8 w-8"
            >
                <Minus className="h-4 w-4" />
            </Button>
            <Input
                type="number"
                value={value ?? min}
                onChange={handleInputChange}
                min={min}
                max={max}
                step={step}
                className="h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
                variant="outline"
                size="icon"
                onClick={increment}
                disabled={Number(value ?? min) >= max}
                className="h-8 w-8"
            >
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    );
 };



export const BrokerSwitch: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    componentMetadata, 
    value, 
    onChange 
 }) => {
    const options = componentMetadata.options ?? ['Off', 'On'];
    const [offLabel, onLabel] = options;
    const checked = value === true || value === 'true';
 
    return (
        <div className={cn('flex items-center gap-2', componentMetadata.componentClassName)}>
            <Label className="text-sm font-medium text-muted-foreground">
                {offLabel}
            </Label>
            <Switch
                checked={checked}
                onCheckedChange={onChange}
            />
            <Label className="text-sm font-medium text-muted-foreground">
                {onLabel}
            </Label>
        </div>
    );
 };

export const BrokerSlider: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    componentMetadata, 
    value, 
    onChange 
 }) => {
    const showValue = componentMetadata.additionalParams?.showValue ?? true;
    const prefix = componentMetadata.additionalParams?.valuePrefix ?? '' as any;
    const suffix = componentMetadata.additionalParams?.valueSuffix ?? '' as any;
    const min = componentMetadata.min ?? 0;
    const max = componentMetadata.max ?? 100;
    const mid = (min + max) / 2 as any;
 
    return (
        <div>
            {showValue && (
                <div className='flex justify-end'>
                    <span className='text-lg text-foreground font-bold'>
                        {prefix}
                        {value ?? mid}
                        {suffix}
                    </span>
                </div>
            )}
            <div className='relative flex items-center'>
                <span className='absolute left-0 text-xs text-muted-foreground'>
                    {prefix}
                    {min}
                    {suffix}
                </span>
                <Slider
                    value={[value ?? mid]}
                    onValueChange={([val]) => onChange(val)}
                    min={min}
                    max={max}
                    step={componentMetadata.step ?? 1}
                    className='mx-12'
                />
                <span className='absolute right-0 text-xs text-muted-foreground'>
                    {prefix}
                    {max}
                    {suffix}
                </span>
            </div>
        </div>
    );
 };

 export const BrokerTextareaPinkBlue: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    value, 
    onChange, 
    componentMetadata 
}) => {
    return (
        <Textarea
            id={brokerId}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={componentMetadata.placeholder}
            className="w-full min-h-32 p-4 bg-gradient-to-br from-pink-50 to-cyan-50 
                dark:from-pink-950/50 dark:to-cyan-950/50
                dark:bg-transparent
                [&:not(:focus)]:dark:bg-transparent
                border-2 border-pink-200 dark:border-pink-800 
                focus:border-cyan-400 dark:focus:border-cyan-600
                placeholder:text-pink-400/70 dark:placeholder:text-pink-300/70
                text-pink-950 dark:text-pink-100
                focus:ring-cyan-400 dark:focus:ring-cyan-600
                rounded-lg shadow-inner
                transition-all duration-200
                hover:border-pink-300 dark:hover:border-pink-700
                dark:!bg-gradient-to-br dark:!from-pink-950/50 dark:!to-cyan-950/50"
        />
    );
};


export const BrokerTextarea: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    value, 
    onChange, 
    componentMetadata 
}) => {
    return (
        <Textarea
            id={brokerId}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={componentMetadata.placeholder}
            className={cn(componentMetadata.componentClassName)}
        />
    );
};

export const BrokerInputPinkBlue: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    value, 
    onChange, 
    componentMetadata 
}) => {
    return (
        <Input
            id={brokerId}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={componentMetadata.placeholder}
            className="bg-gradient-to-r from-pink-50 to-cyan-50 
                dark:from-pink-950/50 dark:to-cyan-950/50
                dark:bg-transparent
                [&:not(:focus)]:dark:bg-transparent
                border-2 border-pink-200 dark:border-pink-800 
                focus:border-cyan-400 dark:focus:border-cyan-600
                placeholder:text-pink-400/70 dark:placeholder:text-pink-300/70
                text-pink-950 dark:text-pink-100
                focus:ring-cyan-400 dark:focus:ring-cyan-600
                rounded-md shadow-sm
                transition-all duration-200
                hover:border-pink-300 dark:hover:border-pink-700
                h-10 px-3
                dark:!bg-gradient-to-r dark:!from-pink-950/50 dark:!to-cyan-950/50"
        />
    );
};


export const BrokerInput: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    value, 
    onChange, 
    componentMetadata 
}) => {
    return (
        <Input
            id={brokerId}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={componentMetadata.placeholder}
            className={cn(componentMetadata.componentClassName)}
        />
    );
};



export const BrokerRadioGroup: React.FC<BrokerComponentProps> = ({ brokerId, componentMetadata, value, onChange }) => {
    const { showOtherInput, otherValue, selected, internalOptions, handleChange, handleOtherInputChange, getDisplayValue } = useOtherOption({
        value,
        options: componentMetadata.options ?? [],
        includeOther: componentMetadata.includeOther,
        onChange
    });

    const orientation = componentMetadata.orientation === "horizontal" ? "horizontal" : "vertical";
    const className = componentMetadata.componentClassName;
    const placeholder = componentMetadata.placeholder;
    const options = componentMetadata.options;
    const includeOther = componentMetadata.includeOther;
    const defaultClassName = "grid grid-cols-2 gap-2 sm:grid-cols-3";
    const verticalClassName = "space-y-2";
    const horizontalClassName = "grid grid-cols-2 sm:grid-cols-3";

    return (
        <>
            <RadioGroup
                name={brokerId}
                value={selected as string}
                onValueChange={handleChange}
                className={cn(defaultClassName, orientation === "vertical" ? verticalClassName : horizontalClassName)}
            >
                {internalOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={option} />
                        <Label htmlFor={option}>{getDisplayValue(option)}</Label>
                    </div>
                ))}
            </RadioGroup>
            {showOtherInput && (
                <Input
                    value={otherValue}
                    onChange={(e) => handleOtherInputChange(e.target.value)}
                    placeholder="Enter custom value..."
                    className="mt-2"
                />
            )}
        </>
    );
};


export const BrokerSelectPinkBlue: React.FC<BrokerComponentProps> = ({ 
    brokerId, 
    componentMetadata, 
    value, 
    onChange 
}) => {
    const {
        showOtherInput,
        otherValue, 
        selected,
        internalOptions,
        handleChange,
        handleOtherInputChange,
        getDisplayValue
    } = useOtherOption({
        value,
        options: componentMetadata.options ?? [],
        includeOther: componentMetadata.includeOther,
        onChange
    });
 
    const className = componentMetadata.componentClassName;
    const options = componentMetadata.options as string[];
    const placeholder = componentMetadata.placeholder;
 
    return (
        <>
            <Select
                value={selected as string}
                onValueChange={handleChange}
            >
                <SelectTrigger className="
                    bg-gradient-to-r from-pink-50 to-cyan-50 
                    dark:from-pink-950/50 dark:to-cyan-950/50
                    border-2 border-pink-200 dark:border-pink-800 
                    hover:border-pink-300 dark:hover:border-pink-700
                    focus:border-cyan-400 dark:focus:border-cyan-600
                    text-pink-950 dark:text-pink-100
                    shadow-sm
                    transition-all duration-200
                    h-10
                ">
                    <SelectValue 
                        placeholder={placeholder}
                        className="placeholder:text-pink-400/70 dark:placeholder:text-pink-400/40"
                    >
                        {selected === '_other' ? otherValue || 'Other' : selected}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="
                    bg-gradient-to-br from-pink-50/95 to-cyan-50/95 
                    dark:from-pink-950 dark:to-cyan-950
                    border-2 border-pink-200 dark:border-pink-800
                    shadow-lg backdrop-blur-sm
                ">
                    {internalOptions.map((option) => (
                        <SelectItem
                            key={option}
                            value={option}
                            className="
                                text-pink-950 dark:text-pink-100
                                focus:bg-pink-200/50 dark:focus:bg-pink-800/50
                                focus:text-pink-950 dark:focus:text-pink-100
                                cursor-pointer
                                hover:bg-pink-100/50 dark:hover:bg-pink-900/50
                                transition-colors duration-150
                                data-[state=checked]:bg-gradient-to-r 
                                data-[state=checked]:from-pink-200/50 
                                data-[state=checked]:to-cyan-200/50
                                dark:data-[state=checked]:from-pink-800/50
                                dark:data-[state=checked]:to-cyan-800/50
                            "
                        >
                            {getDisplayValue(option)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {showOtherInput && (
                <Input
                    value={otherValue}
                    onChange={(e) => handleOtherInputChange(e.target.value)}
                    placeholder={placeholder}
                    className="mt-2 
                        bg-gradient-to-r from-pink-50 to-cyan-50 
                        dark:from-pink-950/50 dark:to-cyan-950/50
                        border-2 border-pink-200 dark:border-pink-800 
                        focus:border-cyan-400 dark:focus:border-cyan-600
                        placeholder:text-pink-400/70 dark:placeholder:text-pink-400/40
                        text-pink-950 dark:text-pink-100
                        focus:ring-cyan-400 dark:focus:ring-cyan-600
                        rounded-md shadow-sm
                        transition-all duration-200
                        hover:border-pink-300 dark:hover:border-pink-700
                        h-10 px-3"
                />
            )}
        </>
    );
};


export const BrokerSelect: React.FC<BrokerComponentProps> = ({ brokerId, componentMetadata, value, onChange }) => {
    const {
        showOtherInput,
        otherValue, 
        selected,
        internalOptions,
        handleChange,
        handleOtherInputChange,
        getDisplayValue
    } = useOtherOption({
        value,
        options: componentMetadata.options ?? [],
        includeOther: componentMetadata.includeOther,
        onChange
    });
 
    const className = componentMetadata.componentClassName;
    const options = componentMetadata.options as string[];
    const placeholder = componentMetadata.placeholder;
 
    return (
        <>
            <Select
                value={selected as string}
                onValueChange={handleChange}
            >
                <SelectTrigger>
                    <SelectValue placeholder={placeholder}>
                        {selected === '_other' ? otherValue || 'Other' : selected}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {internalOptions.map((option) => (
                        <SelectItem
                            key={option}
                            value={option}
                        >
                            {getDisplayValue(option)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {showOtherInput && (
                <Input
                    value={otherValue}
                    onChange={(e) => handleOtherInputChange(e.target.value)}
                    placeholder={placeholder}
                    className='mt-2 h-10 px-3'
                />
            )}
        </>
    );
 };

 export const BrokerCheckboxGroup: React.FC<BrokerComponentProps> = ({ brokerId, componentMetadata, value, onChange }) => {
    const className = componentMetadata.componentClassName;
    const isVertical = componentMetadata.orientation === "vertical";
    const options = componentMetadata.options as string[];
    const selectedOptions = value ? (JSON.parse(value) as string[]) : [];
 
    const handleCheckboxChange = (option: string, checked: boolean) => {
        const newSelectedOptions = checked 
            ? [...selectedOptions, option] 
            : selectedOptions.filter((item) => item !== option);
 
        onChange(JSON.stringify(newSelectedOptions));
    };
 
    return (
        <div className={cn("gap-4", isVertical ? "space-y-2" : "grid grid-cols-2", className)}>
            {options.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                        id={`${brokerId}-${option}`}
                        checked={selectedOptions.includes(option)}
                        onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
                    />
                    <Label htmlFor={`${brokerId}-${option}`} className="cursor-pointer">
                        {option}
                    </Label>
                </div>
            ))}
        </div>
    );
 };


const COMPONENT_MAP = {
    // temp testing.
    BrokerInput: BrokerInput,
    BrokerTextarea: BrokerTextarea,
    BrokerSelect: BrokerSelectPinkBlue,

    BrokerSlider: BrokerSlider,
    BrokerSwitch: BrokerSwitch,
    BrokerCheckbox: BrokerCheckboxGroup,
    BrokerRadioGroup: BrokerRadioGroup,
    BrokerTextareaGrow: BrokerTextarea,
    BrokerNumberInput: BrokerNumberPicker,
    BrokerNumberPicker: BrokerNumberPicker,
    BrokerTextArrayInput: BrokerTextArrayInput,
    BrokerColorPicker: BrokerColorPicker,
    BrokerTailwindColorPicker: BrokerTailwindColorPicker,
    BrokerTextareaPinkBlue: BrokerTextareaPinkBlue,
    BrokerInputPinkBlue: BrokerInputPinkBlue,
    BrokerSelectPinkBlue: BrokerSelectPinkBlue,
};

interface BrokerWrapperProps {
    brokerId: string;
    brokerName: string;
    className?: string;
    children: (props: {
        value: any;
        onChange: (value: any) => void;
    }) => React.ReactNode;
}

export const BrokerWrapper = React.memo<BrokerWrapperProps>(({ brokerId, brokerName, children }) => {
    const { valueEntry, setValue } = useCreateUpdateBrokerValue(brokerId);
    const componentWrapperClassName = "space-y-2"

    return (
        <div className={cn(componentWrapperClassName)}>
            <Label htmlFor={brokerId}>{brokerName}</Label>
            {children({
                value: valueEntry,
                onChange: setValue,
            })}
        </div>
    );
});

BrokerWrapper.displayName = "BrokerWrapper";

interface BrokerComponentRendererProps {
    prepareRecipeHook: RunGenericHookType   ;
}

export const BrokerComponentRenderer: React.FC<BrokerComponentRendererProps> = ({ prepareRecipeHook }) => {
    const { brokerComponentMetadataMap, isReduxLoading } = prepareRecipeHook;

    if (isReduxLoading) {
        return (
            <div className="space-y-4">
                <BrokerSkeleton />
            </div>
        );
    }

    return (
        <>
            {brokerComponentMetadataMap &&
                Object.values(brokerComponentMetadataMap).map((brokerData) => (
                    <BrokerWrapper 
                        key={brokerData.brokerId} 
                        brokerId={brokerData.brokerId} 
                        brokerName={brokerData.brokerName}
                    >
                        {({ value, onChange }) => {
                            const Component = COMPONENT_MAP[brokerData.componentMetadata.component];
                            return (
                                <Component
                                    value={value}
                                    onChange={onChange}
                                    componentMetadata={brokerData.componentMetadata}
                                    brokerId={brokerData.brokerId}
                                    brokerRecordKey={brokerData.brokerRecordKey}
                                    componentRecordKey={brokerData.componentRecordKey}
                                />
                            );
                        }}
                    </BrokerWrapper>
                ))}
        </>
    );
};



export const BrokerSkeleton = () => {
    return (
        <Card className="border border-border">
            <CardContent className="p-6">
                <div className="space-y-4">
                    {/* Broker name skeleton */}
                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>

                    {/* Content area skeleton */}
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                    </div>

                    {/* Action area skeleton */}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
