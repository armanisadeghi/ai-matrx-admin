import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const presetConfigs = {
    container: {
        name: "Container",
        classes: "grid flex flex-col w-full h-full space-y-2 rounded-t-2xl rounded-b-lg border border-blue-100 dark:border-blue-600",
        defaultConfig: {
            layout: {
                display: "flex",
                flexDirection: "col",
                width: "full",
                height: "full",
            },
            spacing: {
                space: {
                    y: 2,
                },
            },
            rounded: {
                top: "2xl",
                bottom: "lg",
            },
            border: {
                width: { all: 1 },
                style: "solid",
            },
            borderColor: {
                base: "blue-100",
                dark: "blue-600",
            },
        },
    },
    collapsible: {
        name: "Collapsible",
        classes: "w-full pr-2 bg-blue-100 dark:bg-blue-600 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-t-xl",
        defaultConfig: {
            layout: {
                width: "full",
            },
            padding: {
                right: 2,
            },
            backgroundColor: {
                base: "blue-100",
                dark: "blue-600",
            },
            hoverColor: {
                background: {
                    base: "blue-200",
                    dark: "blue-700",
                },
            },
            rounded: {
                top: "xl",
            },
        },
    },
    label: {
        name: "Label",
        classes: "text-base pt-1 cursor-pointer select-none",
        defaultConfig: {
            textColor: {
                size: "base",
            },
            padding: {
                top: 1,
            },
            cursor: "pointer",
            userSelect: "none",
        },
    },
    description: {
        name: "Description",
        classes: "pt-2 pb-2 px-6 text-md text-accent-foreground bg-blue-500",
        defaultConfig: {
            padding: {
                top: 2,
                bottom: 2,
                left: 6,
                right: 6,
            },
            textColor: {
                base: "accent-foreground",
            },
            backgroundColor: {
                base: "blue-500",
            },
        },
    },
    mainComponent: {
        name: "Main Component",
        classes: "w-full h-full",
        defaultConfig: {
            layout: {
                width: "full",
                height: "full",
            },
        },
    },
    header: {
        name: "Header",
        classes: "flex items-center w-full",
        defaultConfig: {
            layout: {
                display: "flex",
                width: "full",
            },
            alignItems: "center",
        },
    },
    clickableArea: {
        name: "Clickable Area",
        classes: "flex-1 flex items-center justify-between hover:text-accent-foreground rounded-sm cursor-pointer pr-2 pl-3 py-1",
        defaultConfig: {
            layout: {
                display: "flex",
                flex: "1",
            },
            alignItems: "center",
            justifyContent: "between",
            padding: {
                right: 2,
                left: 3,
                top: 1,
                bottom: 1,
            },
            rounded: {
                all: "sm",
            },
            cursor: "pointer",
            hoverColor: {
                text: {
                    base: "accent-foreground",
                },
            },
        },
    },
    controls: {
        name: "Controls",
        classes: "flex items-center space-x-2 ml-2",
        defaultConfig: {
            layout: {
                display: "flex",
            },
            alignItems: "center",
            spacing: {
                space: {
                    x: 2,
                },
            },
            margin: {
                left: 2,
            },
        },
    },
    icon: {
        name: "Icon",
        classes: "h-4 w-4 shrink-0 text-muted-foreground cursor-pointer hover:text-foreground transition-colors",
        defaultConfig: {
            layout: {
                height: 4,
                width: 4,
                shrink: 0,
            },
            textColor: {
                base: "muted-foreground",
            },
            cursor: "pointer",
            hoverColor: {
                text: {
                    base: "foreground",
                },
            },
            transition: "colors",
        },
    },
    disabledIcon: {
        name: "Disabled Icon",
        classes: "opacity-40 cursor-not-allowed hover:text-muted-foreground",
        defaultConfig: {
            opacity: 40,
            cursor: "not-allowed",
            hoverColor: {
                text: {
                    base: "muted-foreground",
                },
            },
        },
    },
};

const TailwindConfig = () => {
    const [selectedPreset, setSelectedPreset] = useState("container");
    const [config, setConfig] = useState(presetConfigs[selectedPreset].defaultConfig);

    const handlePresetChange = (preset) => {
        setSelectedPreset(preset);
        setConfig(presetConfigs[preset].defaultConfig);
    };

    const displayOptions = ["block", "inline-block", "inline", "flex", "inline-flex", "grid", "inline-grid", "hidden"];
    const flexDirections = ["row", "row-reverse", "col", "col-reverse"];
    const alignItems = ["start", "end", "center", "baseline", "stretch"];
    const justifyContent = ["start", "end", "center", "between", "around", "evenly"];
    const flexWraps = ["nowrap", "wrap", "wrap-reverse"];
    const colors = [
        "transparent",
        "current",
        "black",
        "white",
        "gray",
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
        "indigo",
        "purple",
        "pink",
    ];
    const colorIntensities = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
    const sizes = [
        "auto",
        "px",
        "0",
        "0.5",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "8",
        "10",
        "12",
        "16",
        "20",
        "24",
        "32",
        "40",
        "48",
        "56",
        "64",
        "full",
    ];
    const borderStyles = ["solid", "dashed", "dotted", "double", "none"];
    const roundedSizes = ["none", "sm", "md", "lg", "xl", "2xl", "3xl", "full"];

    const generateColorOptions = (colors, intensities) => {
        const baseColors = ["transparent", "current", "black", "white"];
        const colorOptions = baseColors.map((color) => ({
            value: color,
            label: color,
        }));

        colors.forEach((color) => {
            if (!baseColors.includes(color)) {
                intensities.forEach((intensity) => {
                    colorOptions.push({
                        value: `${color}-${intensity}`,
                        label: `${color}-${intensity}`,
                    });
                });
            }
        });

        return colorOptions;
    };

    const renderSpacingControl = (label, value, onChange, max = 16) => (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div className="flex items-center space-x-4">
                <Slider className="flex-1" min={0} max={max} step={1} value={[value]} onValueChange={([val]) => onChange(val)} />
                <span className="w-12 text-right">{value}</span>
            </div>
        </div>
    );

    const renderColorSelect = (label, value, onChange, includeNone = false) => (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {includeNone && <SelectItem value="">None</SelectItem>}
                    {generateColorOptions(colors, colorIntensities).map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    const generateClasses = () => {
        const classes = [];

        // Layout
        classes.push(config.layout.display);
        if (config.layout.display.includes("flex")) {
            classes.push(`flex-${config.layout.flexDirection}`);
            classes.push(`items-${config.layout.alignItems}`);
            classes.push(`justify-${config.layout.justifyContent}`);
            classes.push(`flex-${config.layout.flexWrap}`);
            if (config.layout.gap) classes.push(`gap-${config.layout.gap}`);
        }

        // Colors
        if (config.backgroundColor.base) classes.push(`bg-${config.backgroundColor.base}`);
        if (config.backgroundColor.dark) classes.push(`dark:bg-${config.backgroundColor.dark}`);
        if (config.textColor.base) classes.push(`text-${config.textColor.base}`);
        if (config.textColor.dark) classes.push(`dark:text-${config.textColor.dark}`);
        if (config.borderColor.base) classes.push(`border-${config.borderColor.base}`);
        if (config.borderColor.dark) classes.push(`dark:border-${config.borderColor.dark}`);

        // Hover states
        if (config.hoverColor.background.base) classes.push(`hover:bg-${config.hoverColor.background.base}`);
        if (config.hoverColor.background.dark) classes.push(`dark:hover:bg-${config.hoverColor.background.dark}`);
        if (config.hoverColor.text.base) classes.push(`hover:text-${config.hoverColor.text.base}`);
        if (config.hoverColor.text.dark) classes.push(`dark:hover:text-${config.hoverColor.text.dark}`);

        // Sizes
        if (config.sizes.width) classes.push(`w-${config.sizes.width}`);
        if (config.sizes.height) classes.push(`h-${config.sizes.height}`);
        if (config.sizes.minWidth) classes.push(`min-w-${config.sizes.minWidth}`);
        if (config.sizes.maxWidth) classes.push(`max-w-${config.sizes.maxWidth}`);
        if (config.sizes.minHeight) classes.push(`min-h-${config.sizes.minHeight}`);
        if (config.sizes.maxHeight) classes.push(`max-h-${config.sizes.maxHeight}`);

        // Spacing
        if (config.spacing.space.x) classes.push(`space-x-${config.spacing.space.x}`);
        if (config.spacing.space.y) classes.push(`space-y-${config.spacing.space.y}`);

        // Padding
        if (config.padding.all) {
            classes.push(`p-${config.padding.all}`);
        } else {
            if (config.padding.top) classes.push(`pt-${config.padding.top}`);
            if (config.padding.right) classes.push(`pr-${config.padding.right}`);
            if (config.padding.bottom) classes.push(`pb-${config.padding.bottom}`);
            if (config.padding.left) classes.push(`pl-${config.padding.left}`);
        }

        // Margin
        if (config.margin.all) {
            classes.push(`m-${config.margin.all}`);
        } else {
            if (config.margin.top) classes.push(`mt-${config.margin.top}`);
            if (config.margin.right) classes.push(`mr-${config.margin.right}`);
            if (config.margin.bottom) classes.push(`mb-${config.margin.bottom}`);
            if (config.margin.left) classes.push(`ml-${config.margin.left}`);
        }

        // Border
        if (config.border.width.all) {
            classes.push(`border-${config.border.width.all}`);
        } else {
            if (config.border.width.top) classes.push(`border-t-${config.border.width.top}`);
            if (config.border.width.right) classes.push(`border-r-${config.border.width.right}`);
            if (config.border.width.bottom) classes.push(`border-b-${config.border.width.bottom}`);
            if (config.border.width.left) classes.push(`border-l-${config.border.width.left}`);
        }
        if (config.border.style !== "solid") classes.push(`border-${config.border.style}`);

        // Rounded
        if (config.rounded.all) {
            classes.push(`rounded-${config.rounded.all}`);
        } else {
            if (config.rounded.top) classes.push(`rounded-t-${config.rounded.top}`);
            if (config.rounded["top-left"]) classes.push(`rounded-tl-${config.rounded["top-left"]}`);
            if (config.rounded["top-right"]) classes.push(`rounded-tr-${config.rounded["top-right"]}`);
            if (config.rounded.bottom) classes.push(`rounded-b-${config.rounded.bottom}`);
            if (config.rounded["bottom-left"]) classes.push(`rounded-bl-${config.rounded["bottom-left"]}`);
            if (config.rounded["bottom-right"]) classes.push(`rounded-br-${config.rounded["bottom-right"]}`);
        }

        // Manual classes
        if (config.manual) classes.push(config.manual);

        return classes.join(" ");
    };

    return (
        <Card className="w-full">
            <CardContent className="p-6">
                <div className="mb-6">
                    <Label>Select Component Type</Label>
                    <Select value={selectedPreset} onValueChange={handlePresetChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(presetConfigs).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                    {config.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Default classes for {presetConfigs[selectedPreset].name}:</p>
                    <p className="font-mono text-sm mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                        {presetConfigs[selectedPreset].classes}
                    </p>
                </div>
                <Card className="w-full">
                    <CardContent className="p-6">
                        <Tabs defaultValue="layout" className="w-full">
                            <TabsList className="grid w-full grid-cols-6 mb-4">
                                <TabsTrigger value="layout">Layout</TabsTrigger>
                                <TabsTrigger value="background">Background</TabsTrigger>
                                <TabsTrigger value="text">Text</TabsTrigger>
                                <TabsTrigger value="border-color">Border Color</TabsTrigger>
                                <TabsTrigger value="hover">Hover</TabsTrigger>
                                <TabsTrigger value="sizes">Sizes</TabsTrigger>
                            </TabsList>
                            <TabsList className="grid w-full grid-cols-6">
                                <TabsTrigger value="spacing">Spacing</TabsTrigger>
                                <TabsTrigger value="padding">Padding</TabsTrigger>
                                <TabsTrigger value="margin">Margin</TabsTrigger>
                                <TabsTrigger value="border">Border</TabsTrigger>
                                <TabsTrigger value="rounded">Rounded</TabsTrigger>
                                <TabsTrigger value="manual">Manual</TabsTrigger>
                            </TabsList>

                            <TabsContent value="layout" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Display</Label>
                                        <Select
                                            value={config.layout.display}
                                            onValueChange={(value) =>
                                                setConfig({
                                                    ...config,
                                                    layout: { ...config.layout, display: value },
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {displayOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {config.layout.display.includes("flex") && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Flex Direction</Label>
                                                <Select
                                                    value={config.layout.flexDirection}
                                                    onValueChange={(value) =>
                                                        setConfig({
                                                            ...config,
                                                            layout: { ...config.layout, flexDirection: value },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {flexDirections.map((direction) => (
                                                            <SelectItem key={direction} value={direction}>
                                                                {direction}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Align Items</Label>
                                                <Select
                                                    value={config.layout.alignItems}
                                                    onValueChange={(value) =>
                                                        setConfig({
                                                            ...config,
                                                            layout: { ...config.layout, alignItems: value },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {alignItems.map((align) => (
                                                            <SelectItem key={align} value={align}>
                                                                {align}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Justify Content</Label>
                                                <Select
                                                    value={config.layout.justifyContent}
                                                    onValueChange={(value) =>
                                                        setConfig({
                                                            ...config,
                                                            layout: { ...config.layout, justifyContent: value },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {justifyContent.map((justify) => (
                                                            <SelectItem key={justify} value={justify}>
                                                                {justify}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Flex Wrap</Label>
                                                <Select
                                                    value={config.layout.flexWrap}
                                                    onValueChange={(value) =>
                                                        setConfig({
                                                            ...config,
                                                            layout: { ...config.layout, flexWrap: value },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {flexWraps.map((wrap) => (
                                                            <SelectItem key={wrap} value={wrap}>
                                                                {wrap}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="background" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {renderColorSelect("Background Color", config.backgroundColor.base, (value) =>
                                        setConfig({
                                            ...config,
                                            backgroundColor: { ...config.backgroundColor, base: value },
                                        })
                                    )}
                                    {renderColorSelect("Dark Mode Background", config.backgroundColor.dark, (value) =>
                                        setConfig({
                                            ...config,
                                            backgroundColor: { ...config.backgroundColor, dark: value },
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="text" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {renderColorSelect("Text Color", config.textColor.base, (value) =>
                                        setConfig({
                                            ...config,
                                            textColor: { ...config.textColor, base: value },
                                        })
                                    )}
                                    {renderColorSelect("Dark Mode Text", config.textColor.dark, (value) =>
                                        setConfig({
                                            ...config,
                                            textColor: { ...config.textColor, dark: value },
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="border-color" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {renderColorSelect("Border Color", config.borderColor.base, (value) =>
                                        setConfig({
                                            ...config,
                                            borderColor: { ...config.borderColor, base: value },
                                        })
                                    )}
                                    {renderColorSelect("Dark Mode Border", config.borderColor.dark, (value) =>
                                        setConfig({
                                            ...config,
                                            borderColor: { ...config.borderColor, dark: value },
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="hover" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {renderColorSelect("Hover Background", config.hoverColor.background.base, (value) =>
                                        setConfig({
                                            ...config,
                                            hoverColor: {
                                                ...config.hoverColor,
                                                background: { ...config.hoverColor.background, base: value },
                                            },
                                        })
                                    )}
                                    {renderColorSelect("Dark Mode Hover Background", config.hoverColor.background.dark, (value) =>
                                        setConfig({
                                            ...config,
                                            hoverColor: {
                                                ...config.hoverColor,
                                                background: { ...config.hoverColor.background, dark: value },
                                            },
                                        })
                                    )}
                                    {renderColorSelect("Hover Text", config.hoverColor.text.base, (value) =>
                                        setConfig({
                                            ...config,
                                            hoverColor: {
                                                ...config.hoverColor,
                                                text: { ...config.hoverColor.text, base: value },
                                            },
                                        })
                                    )}
                                    {renderColorSelect("Dark Mode Hover Text", config.hoverColor.text.dark, (value) =>
                                        setConfig({
                                            ...config,
                                            hoverColor: {
                                                ...config.hoverColor,
                                                text: { ...config.hoverColor.text, dark: value },
                                            },
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="sizes" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Width</Label>
                                        <Select
                                            value={config.sizes.width}
                                            onValueChange={(value) =>
                                                setConfig({
                                                    ...config,
                                                    sizes: { ...config.sizes, width: value },
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sizes.map((size) => (
                                                    <SelectItem key={size} value={size}>
                                                        {size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Height</Label>
                                        <Select
                                            value={config.sizes.height}
                                            onValueChange={(value) =>
                                                setConfig({
                                                    ...config,
                                                    sizes: { ...config.sizes, height: value },
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sizes.map((size) => (
                                                    <SelectItem key={size} value={size}>
                                                        {size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="spacing" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {renderSpacingControl("Space X", config.spacing.space.x, (value) =>
                                        setConfig({
                                            ...config,
                                            spacing: {
                                                ...config.spacing,
                                                space: { ...config.spacing.space, x: value },
                                            },
                                        })
                                    )}
                                    {renderSpacingControl("Space Y", config.spacing.space.y, (value) =>
                                        setConfig({
                                            ...config,
                                            spacing: {
                                                ...config.spacing,
                                                space: { ...config.spacing.space, y: value },
                                            },
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="padding" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {renderSpacingControl("Padding All", config.padding.all || 0, (value) =>
                                        setConfig({
                                            ...config,
                                            padding: { ...config.padding, all: value },
                                        })
                                    )}
                                    {renderSpacingControl("Padding Top", config.padding.top, (value) =>
                                        setConfig({
                                            ...config,
                                            padding: { ...config.padding, top: value },
                                        })
                                    )}
                                    {renderSpacingControl("Padding Right", config.padding.right, (value) =>
                                        setConfig({
                                            ...config,
                                            padding: { ...config.padding, right: value },
                                        })
                                    )}
                                    {renderSpacingControl("Padding Bottom", config.padding.bottom, (value) =>
                                        setConfig({
                                            ...config,
                                            padding: { ...config.padding, bottom: value },
                                        })
                                    )}
                                    {renderSpacingControl("Padding Left", config.padding.left, (value) =>
                                        setConfig({
                                            ...config,
                                            padding: { ...config.padding, left: value },
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="margin" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {renderSpacingControl("Margin All", config.margin.all || 0, (value) =>
                                        setConfig({
                                            ...config,
                                            margin: { ...config.margin, all: value },
                                        })
                                    )}
                                    {renderSpacingControl("Margin Top", config.margin.top, (value) =>
                                        setConfig({
                                            ...config,
                                            margin: { ...config.margin, top: value },
                                        })
                                    )}
                                    {renderSpacingControl("Margin Right", config.margin.right, (value) =>
                                        setConfig({
                                            ...config,
                                            margin: { ...config.margin, right: value },
                                        })
                                    )}
                                    {renderSpacingControl("Margin Bottom", config.margin.bottom, (value) =>
                                        setConfig({
                                            ...config,
                                            margin: { ...config.margin, bottom: value },
                                        })
                                    )}
                                    {renderSpacingControl("Margin Left", config.margin.left, (value) =>
                                        setConfig({
                                            ...config,
                                            margin: { ...config.margin, left: value },
                                        })
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="border" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Border Style</Label>
                                        <Select
                                            value={config.border.style}
                                            onValueChange={(value) =>
                                                setConfig({
                                                    ...config,
                                                    border: { ...config.border, style: value },
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {borderStyles.map((style) => (
                                                    <SelectItem key={style} value={style}>
                                                        {style}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {renderSpacingControl(
                                        "Border Width",
                                        config.border.width.all,
                                        (value) =>
                                            setConfig({
                                                ...config,
                                                border: {
                                                    ...config.border,
                                                    width: { ...config.border.width, all: value },
                                                },
                                            }),
                                        8
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="rounded" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Border Radius All</Label>
                                        <Select
                                            value={config.rounded.all}
                                            onValueChange={(value) =>
                                                setConfig({
                                                    ...config,
                                                    rounded: { ...config.rounded, all: value },
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Custom</SelectItem>
                                                {roundedSizes.map((size) => (
                                                    <SelectItem key={size} value={size}>
                                                        {size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {!config.rounded.all && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Top Left</Label>
                                                <Select
                                                    value={config.rounded["top-left"]}
                                                    onValueChange={(value) =>
                                                        setConfig({
                                                            ...config,
                                                            rounded: { ...config.rounded, "top-left": value },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roundedSizes.map((size) => (
                                                            <SelectItem key={size} value={size}>
                                                                {size}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Top Right</Label>
                                                <Select
                                                    value={config.rounded["top-right"]}
                                                    onValueChange={(value) =>
                                                        setConfig({
                                                            ...config,
                                                            rounded: { ...config.rounded, "top-right": value },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roundedSizes.map((size) => (
                                                            <SelectItem key={size} value={size}>
                                                                {size}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Bottom Left</Label>
                                                <Select
                                                    value={config.rounded["bottom-left"]}
                                                    onValueChange={(value) =>
                                                        setConfig({
                                                            ...config,
                                                            rounded: { ...config.rounded, "bottom-left": value },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roundedSizes.map((size) => (
                                                            <SelectItem key={size} value={size}>
                                                                {size}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Bottom Right</Label>
                                                <Select
                                                    value={config.rounded["bottom-right"]}
                                                    onValueChange={(value) =>
                                                        setConfig({
                                                            ...config,
                                                            rounded: { ...config.rounded, "bottom-right": value },
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roundedSizes.map((size) => (
                                                            <SelectItem key={size} value={size}>
                                                                {size}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="manual" className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Manual Classes</Label>
                                    <Input
                                        value={config.manual}
                                        onChange={(e) =>
                                            setConfig({
                                                ...config,
                                                manual: e.target.value,
                                            })
                                        }
                                        placeholder="Add custom Tailwind classes..."
                                    />
                                </div>
                            </TabsContent>

                            <div className="mt-8 space-y-4">
                                <div className="p-4 border rounded bg-gray-50 dark:bg-gray-900">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold">Generated Classes</h3>
                                        <Button
                                            onClick={() => {
                                                navigator.clipboard.writeText(generateClasses());
                                            }}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Copy Classes
                                        </Button>
                                    </div>
                                    <p className="font-mono text-sm break-all">{generateClasses()}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold">Live Preview</h3>
                                        <Button
                                            onClick={() => {
                                                document.documentElement.classList.toggle("dark");
                                            }}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Toggle Dark Mode
                                        </Button>
                                    </div>

                                    <div className={`min-h-40 border rounded ${generateClasses()}`}>
                                        <div className="p-4 space-y-2">
                                            <p>Preview Content</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                This preview area inherits all the configured styles. Adjust the settings above to see
                                                changes in real-time.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold">Configuration</h3>
                                    <div className="flex space-x-2">
                                        <Button
                                            onClick={() => {
                                                const configString = JSON.stringify(config, null, 2);
                                                const blob = new Blob([configString], { type: "application/json" });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement("a");
                                                a.href = url;
                                                a.download = "tailwind-config.json";
                                                a.click();
                                                URL.revokeObjectURL(url);
                                            }}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Export Config
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                // Reset to default configuration
                                                setConfig({
                                                    layout: {
                                                        display: "flex",
                                                        flexDirection: "col",
                                                        width: "full",
                                                        height: "full",
                                                        alignItems: "start",
                                                        justifyContent: "start",
                                                        flexWrap: "nowrap",
                                                        gap: 0,
                                                    },
                                                    backgroundColor: {
                                                        base: "blue-100",
                                                        dark: "blue-600",
                                                    },
                                                    // ... (rest of the default configuration)
                                                });
                                            }}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Reset to Default
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Tabs>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
};

export default TailwindConfig;
