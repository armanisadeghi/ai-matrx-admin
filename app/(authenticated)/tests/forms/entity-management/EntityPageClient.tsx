'use client';

import React, {useState} from 'react';
import {motion} from 'framer-motion';
import {Card} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {Button} from "@/components/ui";
import {
    Settings2,
    Layout,
    Layers,
    Monitor,
    SquareActivity,
    PanelLeftClose,
    PanelLeftOpen,
    Grid,
    List,
    ArrowRightLeft, Maximize2, Sparkles, Columns, Maximize, Columns2, Type,
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {Separator} from "@/components/ui/separator";
import {
    AnimationPreset,
    animationPresetOptions,
    ComponentDensity,
    ComponentSize, componentSizeOptions,
    densityOptions,
    formColumnOptions,
    FormColumnsOptions,
    formDirectionOptions,
    FormDirectionOptions,
    formLayoutOptions,
    FormLayoutOptions,
    inlineEntityColumnOptions,
    InlineEntityColumnsOptions,
    inlineEntityStyleOptions,
    InlineEntityComponentStyles,
    pageLayoutOptions,
    PageLayoutOptions,
    textSizeOptions,
    TextSizeOptions,
    formVariationOptions,
    FormVariationOptions,
    QuickReferenceComponentType,
    SelectOption,
    quickReferenceComponentOptions
} from '@/types/componentConfigTypes';
import ArmaniLayout from '@/components/matrx/Entity/prewired-components/layouts/ArmaniLayout';
import {Slider} from "@/components/ui";
import {cn} from "@/utils/cn";

export const ENTITY_PAGE_DEFAULTS = {
    layout: 'split' as PageLayoutOptions,
    density: 'normal' as ComponentDensity,
    animation: 'subtle' as AnimationPreset,
    size: 'md' as ComponentSize,
    quickReferenceType: 'list' as QuickReferenceComponentType,
    isFullScreen: false,
    splitRatio: 20,
    formOptions: {
        formLayout: 'grid' as FormLayoutOptions,
        formColumns: '2' as FormColumnsOptions,
        formDirection: 'row' as FormDirectionOptions,
        formEnableSearch: false,
        formVariation: 'fullWidthSinglePage' as FormVariationOptions,
        floatingLabel: true,
        showLabel: true,
        textSize: 'md' as TextSizeOptions,
    },
    inlineEntityOptions: {
        showInlineEntities: true,
        inlineEntityStyle: 'accordion' as InlineEntityComponentStyles,
        inlineEntityColumns: '2' as InlineEntityColumnsOptions,
        editableInlineEntities: false,
    },
};

const EntityPageClient = () => {
    const [settings, setSettings] = useState(ENTITY_PAGE_DEFAULTS);

    const [showControls, setShowControls] = useState(true);

    const CompactSelectControl = (
        {
            label,
            icon: Icon,
            value,
            options,
            onChange,
        }: {
            label: string;
            icon: React.ComponentType<any>;
            value: any;
            options: SelectOption<string | number>[];
            onChange: (value: any) => void;
        }
    ) => (
        <div className="flex items-center gap-1 bg-secondary/50 rounded-md px-2 py-1">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0"/>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-8 w-[120px] text-sm border-0 bg-transparent">
                    <SelectValue placeholder={label}/>
                </SelectTrigger>
                <SelectContent>
                    {options.map(option => (
                        <SelectItem key={option.key} value={option.value}>
                            {option.label.charAt(0).toUpperCase() + option.label.slice(1)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    const ControlGroup = ({children}: { children: React.ReactNode }) => (
        <div
            className="flex items-center gap-2 border-l border-border/50 pl-2 ml-2 first:border-l-0 first:pl-0 first:ml-0">
            {children}
        </div>
    );

    const Controls = () => (
        <div className="flex items-center flex-wrap gap-4">
            {/* Page Layout Options */}
            <ControlGroup>
                <CompactSelectControl
                    label="Layout"
                    icon={Layout}
                    value={settings.layout}
                    options={pageLayoutOptions}
                    onChange={(value: PageLayoutOptions) =>
                        setSettings((prev) => ({ ...prev, layout: value }))
                    }
                />
                {settings.layout === 'split' && (
                    <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-2 py-1">
                        <Columns2 className="h-4 w-4 text-muted-foreground" />
                        <Slider
                            value={[settings.splitRatio]}
                            onValueChange={([value]) =>
                                setSettings((prev) => ({ ...prev, splitRatio: value }))
                            }
                            min={10}
                            max={90}
                            step={10}
                            className="w-24"
                        />
                    </div>
                )}
            </ControlGroup>

            {/* Component Density, Animation Preset, and Size */}
            <ControlGroup>
                <CompactSelectControl
                    label="Size"
                    icon={Maximize2}
                    value={settings.size}
                    options={componentSizeOptions}
                    onChange={(value: ComponentSize) =>
                        setSettings((prev) => ({ ...prev, size: value }))
                    }
                />
                <CompactSelectControl
                    label="Density"
                    icon={Layers}
                    value={settings.density}
                    options={densityOptions}
                    onChange={(value: ComponentDensity) =>
                        setSettings((prev) => ({ ...prev, density: value }))
                    }
                />
                <CompactSelectControl
                    label="Animation"
                    icon={Sparkles}
                    value={settings.animation}
                    options={animationPresetOptions}
                    onChange={(value: AnimationPreset) =>
                        setSettings((prev) => ({ ...prev, animation: value }))
                    }
                />
            </ControlGroup>

            {/* Form Options */}
            <ControlGroup>
                <CompactSelectControl
                    label="Form Layout"
                    icon={Grid}
                    value={settings.formOptions.formLayout}
                    options={formLayoutOptions}
                    onChange={(value: FormLayoutOptions) =>
                        setSettings((prev) => ({
                            ...prev,
                            formOptions: { ...prev.formOptions, formLayout: value },
                        }))
                    }
                />
                <CompactSelectControl
                    label="Columns"
                    icon={Columns}
                    value={
                        typeof settings.formOptions.formColumns === 'number'
                        ? settings.formOptions.formColumns.toString()
                        : settings.formOptions.formColumns
                    }
                    options={[...formColumnOptions]}
                    onChange={(value) =>
                        setSettings((prev) => ({
                            ...prev,
                            formOptions: {
                                ...prev.formOptions,
                                formColumns: value === 'auto' ? 'auto' : parseInt(value, 10),
                            },
                        }))
                    }
                />
                <CompactSelectControl
                    label="Direction"
                    icon={ArrowRightLeft}
                    value={settings.formOptions.formDirection}
                    options={formDirectionOptions}
                    onChange={(value: FormDirectionOptions) =>
                        setSettings((prev) => ({
                            ...prev,
                            formOptions: { ...prev.formOptions, formDirection: value },
                        }))
                    }
                />
                <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-2 py-1">
                    <Type className="h-4 w-4 text-muted-foreground" />
                    <Switch
                        checked={settings.formOptions.floatingLabel}
                        onCheckedChange={(checked) =>
                            setSettings((prev) => ({
                                ...prev,
                                formOptions: { ...prev.formOptions, floatingLabel: checked },
                            }))
                        }
                        className="data-[state=checked]:bg-primary"
                    />
                </div>
            </ControlGroup>

            {/* Text Size */}
            <ControlGroup>
                <CompactSelectControl
                    label="Text Size"
                    icon={Type}
                    value={settings.formOptions.textSize}
                    options={textSizeOptions}
                    onChange={(value: TextSizeOptions) =>
                        setSettings((prev) => ({
                            ...prev,
                            formOptions: { ...prev.formOptions, textSize: value },
                        }))
                    }
                />
            </ControlGroup>

            {/* Inline Entity Options */}
            <ControlGroup>
                <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-2 py-1">
                    <Switch
                        checked={settings.inlineEntityOptions.showInlineEntities}
                        onCheckedChange={(checked) =>
                            setSettings((prev) => ({
                                ...prev,
                                inlineEntityOptions: { ...prev.inlineEntityOptions, showInlineEntities: checked },
                            }))
                        }
                    />
                    <span className="text-sm text-muted-foreground">Show Inline Entities</span>
                </div>
                <CompactSelectControl
                    label="Entity Style"
                    icon={List}
                    value={settings.inlineEntityOptions.inlineEntityStyle}
                    options={inlineEntityStyleOptions}
                    onChange={(value: InlineEntityColumnsOptions) =>
                        setSettings((prev) => ({
                            ...prev,
                            InlineEntityComponentStyles: { ...prev.inlineEntityOptions, inlineEntityStyle: value },
                        }))
                    }
                />
                <CompactSelectControl
                    label="Entity Columns"
                    icon={Columns}
                    value={settings.inlineEntityOptions.inlineEntityColumns.toString()} // Convert to string
                    options={inlineEntityColumnOptions} // Options are all strings
                    onChange={(value) =>
                        setSettings((prev) => ({
                            ...prev,
                            inlineEntityOptions: {
                                ...prev.inlineEntityOptions,
                                inlineEntityColumns:
                                    value === 'auto' ? 'auto' : (parseInt(value, 10) as InlineEntityColumnsOptions), // Convert to number or 'auto'
                            },
                        }))
                    }
                />
                <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-2 py-1">
                    <Switch
                        checked={settings.inlineEntityOptions.editableInlineEntities}
                        onCheckedChange={(checked) =>
                            setSettings((prev) => ({
                                ...prev,
                                inlineEntityOptions: { ...prev.inlineEntityOptions, editableInlineEntities: checked },
                            }))
                        }
                    />
                    <span className="text-sm text-muted-foreground">Editable Entities</span>
                </div>
            </ControlGroup>
            <ControlGroup>
                <CompactSelectControl
                    label="Reference"
                    icon={List}
                    value={settings.quickReferenceType}
                    options={quickReferenceComponentOptions}
                    onChange={(value) => setSettings(prev => ({
                        ...prev,
                        quickReferenceType: value
                    }))}
                />
                <div className="flex items-center gap-2 bg-secondary/50 rounded-md px-2 py-1">
                    <Maximize className="h-4 w-4 text-muted-foreground"/>
                    <Switch
                        id="fullscreen"
                        checked={settings.isFullScreen}
                        onCheckedChange={(checked) => setSettings(prev => ({...prev, isFullScreen: checked}))}
                        className="data-[state=checked]:bg-primary"
                    />
                </div>
            </ControlGroup>
        </div>
    );

    return (
        <div className="h-full w-full bg-background">
            <motion.div
                className={cn(
                    "relative w-full h-full",
                    settings.isFullScreen && "fixed inset-0 z-50"
                )}
                layout
            >
                <div className="h-full flex flex-col">
                    <Card
                        className="rounded-none border-x-0 border-t-0 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="p-2">
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowControls(!showControls)}
                                    className="text-muted-foreground hover:text-primary"
                                >
                                    {showControls ? <PanelLeftClose className="h-4 w-4"/> : <PanelLeftOpen
                                        className="h-4 w-4"/>}
                                </Button>

                                {showControls && <Controls/>}

                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-primary"
                                        >
                                            <Settings2 className="h-4 w-4"/>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right"
                                                  className="w-[400px] overflow-y-auto bg-background/95 backdrop-blur">
                                        <SheetHeader>
                                            <SheetTitle>Advanced Settings</SheetTitle>
                                            <SheetDescription>
                                                Configure additional layout and behavior options.
                                            </SheetDescription>
                                        </SheetHeader>
                                        <Separator className="my-4"/>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </div>
                    </Card>

                    <div className="flex-1">
                        <ArmaniLayout
                            layoutVariant={settings.layout}
                            density={settings.density}
                            animationPreset={settings.animation}
                            size={settings.size}
                            quickReferenceType={settings.quickReferenceType}
                            splitRatio={settings.splitRatio}
                            formOptions={{
                                size: settings.size,
                                formLayout: settings.formOptions.formLayout,
                                formColumns: settings.formOptions.formColumns === 'auto' ? 'auto' : parseInt(settings.formOptions.formColumns),
                                formDirection: settings.formOptions.formDirection,
                                formEnableSearch: settings.formOptions.formEnableSearch,
                                formIsSinglePage: !settings.formOptions.formVariation.includes('MultiStep'),
                                formIsFullPage: settings.formOptions.formVariation.includes('fullWidth'),
                                floatingLabel: settings.formOptions.floatingLabel,
                                showLabel: settings.formOptions.showLabel,
                                textSize: settings.formOptions.textSize,
                                inlineEntityOptions: {
                                    showInlineEntities:settings.inlineEntityOptions.showInlineEntities,
                                    inlineEntityStyle: settings.inlineEntityOptions.inlineEntityStyle,
                                    inlineEntityColumns: settings.inlineEntityOptions.inlineEntityColumns === 'auto' ? 'auto' : parseInt(settings.inlineEntityOptions.inlineEntityColumns),
                                    editableInlineEntities: settings.inlineEntityOptions.editableInlineEntities,
                                },

                            }}
                            className="h-full"
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EntityPageClient;
