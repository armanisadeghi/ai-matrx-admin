// components/matrix/SchemaTable/EntitySelectors/wrappers.tsx

import React, {useState} from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {cn} from '@/lib/utils';
import {EntitySelectStyle} from "@/types/componentConfigTypes";

export interface WrapperProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

// Card Wrapper
export const CardWrapper: React.FC<WrapperProps> = ({ children, title, description }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <div className="p-6">
            {children}
        </div>
    </Card>
);

// Minimal Wrapper
export const MinimalWrapper: React.FC<WrapperProps> = ({ children }) => (
    <div className="p-2">
        {children}
    </div>
);

// Prominent Wrapper
export const ProminentWrapper: React.FC<WrapperProps> = ({ children, title }) => (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-900">
        {title && (
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                {title}
            </h2>
        )}
        {children}
    </div>
);

export const ProminentSuccessWrapper: React.FC<WrapperProps> = ({ children, title }) => (
    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-6 border-2 border-green-200 dark:border-green-900">
        {title && (
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                {title}
            </h2>
        )}
        {children}
    </div>
);

export const ProminentWarmWrapper: React.FC<WrapperProps> = ({ children, title }) => (
    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-6 border-2 border-orange-200 dark:border-orange-900">
        {title && (
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                {title}
            </h2>
        )}
        {children}
    </div>
);

// Accordion Wrapper
export const AccordionWrapper: React.FC<WrapperProps> = ({ children, title }) => (
    <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
            <AccordionTrigger>{title}</AccordionTrigger>
            <AccordionContent>
                {children}
            </AccordionContent>
        </AccordionItem>
    </Accordion>
);

// Floating Wrapper
export const FloatingWrapper: React.FC<WrapperProps> = ({ children }) => (
    <div className="p-4 bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-muted">
        {children}
    </div>
);

// Compact Wrapper
export const CompactWrapper: React.FC<WrapperProps> = ({ children }) => (
    <div className="bg-muted/50 rounded-md p-2">
        {children}
    </div>
);

export const WRAPPER_COMPONENTS = {
    card: CardWrapper,
    minimal: MinimalWrapper,
    prominent: ProminentWrapper,
    prominentSuccess: ProminentSuccessWrapper,
    prominentWarm: ProminentWarmWrapper,
    accordion: AccordionWrapper,
    floating: FloatingWrapper,
    compact: CompactWrapper,
} as const;

export type WrapperStyle = keyof typeof WRAPPER_COMPONENTS;

// components/matrix/SchemaTable/EntitySelectors/selectors.tsx
import { EntityKeys, EntitySelectOption } from '@/types/entityTypes';
import { Badge } from '@/components/ui/badge';
import { Command } from 'cmdk';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SelectorProps<TEntity extends EntityKeys> {
    value: TEntity | undefined;
    options: EntitySelectOption<TEntity>[];
    onValueChange: (value: TEntity) => void;
    placeholder?: string;
}

// Standard Select
export const StandardSelect = <TEntity extends EntityKeys>(props: SelectorProps<TEntity>) => (
    <Select
        value={props.value}
        onValueChange={props.onValueChange}
    >
        <SelectTrigger>
            <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent>
            {props.options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                    {option.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

// Chips Select

// Updated ChipsSelect with better scrolling and wrapping
export const ChipsSelect = <TEntity extends EntityKeys>(props: SelectorProps<TEntity>) => (
    <ScrollArea className="w-full h-[120px]">
        <div className="flex flex-wrap gap-2 p-2">
            {props.options.map(option => (
                <Badge
                    key={option.value}
                    variant={props.value === option.value ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => props.onValueChange(option.value)}
                >
                    {option.label}
                </Badge>
            ))}
        </div>
    </ScrollArea>
);

// Command Menu
export const CommandSelect = <TEntity extends EntityKeys>(props: SelectorProps<TEntity>) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <div
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                onClick={() => setOpen(true)}
            >
                {props.value
                 ? props.options.find(opt => opt.value === props.value)?.label
                 : props.placeholder || "Select..."}
            </div>
            <Command.Dialog open={open} onOpenChange={setOpen}>
                <Command.Input placeholder="Search entities..." />
                <Command.List className="max-h-[300px] overflow-auto">
                    <Command.Empty>No results found.</Command.Empty>
                    {props.options.map(option => (
                        <Command.Item
                            key={option.value}
                            value={option.value as string}
                            onSelect={() => {
                                props.onValueChange(option.value);
                                setOpen(false);
                            }}
                            className="flex items-center px-4 py-2 hover:bg-accent cursor-pointer"
                        >
                            {option.label}
                        </Command.Item>
                    ))}
                </Command.List>
            </Command.Dialog>
        </>
    );
};

export const SELECTOR_COMPONENTS = {
    standard: StandardSelect,
    chips: ChipsSelect,
    command: CommandSelect,
} as const;

export type SelectorStyle = keyof typeof SELECTOR_COMPONENTS;

// components/matrix/SchemaTable/EntitySelectors/ComposedEntitySelect.tsx
interface ComposedEntitySelectProps<TEntity extends EntityKeys> extends SelectorProps<TEntity> {
    wrapperStyle?: WrapperStyle;
    selectorStyle?: SelectorStyle;
    wrapperProps?: Omit<WrapperProps, 'children'>;
}

export const ComposedEntitySelect = <TEntity extends EntityKeys>({
                                                                     wrapperStyle = 'card',
                                                                     selectorStyle = 'standard',
                                                                     wrapperProps = {},
                                                                     ...selectorProps
                                                                 }: ComposedEntitySelectProps<TEntity>) => {
    const Wrapper = WRAPPER_COMPONENTS[wrapperStyle];
    const Selector = SELECTOR_COMPONENTS[selectorStyle];

    return (
        <Wrapper {...wrapperProps}>
            <Selector {...selectorProps} />
        </Wrapper>
    );
};
