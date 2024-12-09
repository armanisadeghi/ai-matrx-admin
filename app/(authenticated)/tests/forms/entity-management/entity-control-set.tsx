// EntityControlSet.tsx
import React from 'react';
import {
    Layout, Layers, ArrowRightLeft, Maximize2, Sparkles,
    Columns, Maximize, Columns2, Type, Laptop,
    BoxSelect, LayoutGrid, Palette,
    TreeDeciduous, Component, SlidersHorizontal, LayoutList, Blocks,
} from 'lucide-react';
import {CompactSelect, CompactSwitch, CompactSlider} from './control-components';
import {
    AnimationPreset,
    ComponentDensity,
    ComponentSize,
    FormColumnsOptions,
    FormDirectionOptions,
    FormLayoutOptions,
    InlineEntityColumnsOptions,
    InlineEntityComponentStyles,
    PageLayoutOptions,
    TextSizeOptions,
    FormVariationOptions,
    QuickReferenceComponentType,
    EntitySelectStyle,
    EntitySelectVariant,
    ComponentState,
    pageLayoutOptions,
    densityOptions,
    animationPresetOptions,
    componentSizeOptions,
    formLayoutOptions,
    formColumnOptions,
    formDirectionOptions,
    textSizeOptions,
    formVariationOptions,
    inlineEntityStyleOptions,
    inlineEntityColumnOptions,
    quickReferenceComponentOptions,
    entitySelectStyleOptions,
    entitySelectVariantOptions,
} from '@/types/componentConfigTypes';
import {ENTITY_PAGE_DEFAULTS} from './constants';

interface EntityControlSetProps {
    settings: typeof ENTITY_PAGE_DEFAULTS;
    setSettings: React.Dispatch<React.SetStateAction<typeof ENTITY_PAGE_DEFAULTS>>;
}

export const EntityControlSet: React.FC<EntityControlSetProps> = (
    {
        settings,
        setSettings,
    }) => {
    return (

        <div className="flex-1 p-1">
            <div className="flex flex-wrap gap-1.5">
                {/* Layout Controls */}
                <CompactSelect
                    label="Page Layout"
                    icon={Layout}
                    value={settings.layout}
                    options={pageLayoutOptions}
                    onChange={(value: PageLayoutOptions) =>
                        setSettings(prev => ({...prev, layout: value}))
                    }
                />
                {settings.layout === 'split' && (
                    <CompactSlider
                        label="Split Ratio"
                        icon={Columns2}
                        value={settings.splitRatio}
                        onChange={(value) =>
                            setSettings(prev => ({...prev, splitRatio: value}))
                        }
                        min={10}
                        max={90}
                        step={10}
                    />
                )}

                {/* Component Settings */}
                <CompactSelect
                    label="Component Size"
                    icon={Maximize2}
                    value={settings.size}
                    options={componentSizeOptions}
                    onChange={(value: ComponentSize) =>
                        setSettings(prev => ({...prev, size: value}))
                    }
                />
                <CompactSelect
                    label="Component Density"
                    icon={Layers}
                    value={settings.density}
                    options={densityOptions}
                    onChange={(value: ComponentDensity) =>
                        setSettings(prev => ({...prev, density: value}))
                    }
                />
                <CompactSelect
                    label="Animation Style"
                    icon={Sparkles}
                    value={settings.animation}
                    options={animationPresetOptions}
                    onChange={(value: AnimationPreset) =>
                        setSettings(prev => ({...prev, animation: value}))
                    }
                />

                {/* Form Controls */}
                <CompactSelect
                    label="Form Layout"
                    icon={LayoutGrid}
                    value={settings.formOptions.formLayout}
                    options={formLayoutOptions}
                    onChange={(value: FormLayoutOptions) =>
                        setSettings(prev => ({
                            ...prev,
                            formOptions: {...prev.formOptions, formLayout: value},
                        }))
                    }
                />
                <CompactSelect
                    label="Form Columns"
                    icon={Columns}
                    value={settings.formOptions.formColumns}
                    options={formColumnOptions}
                    onChange={(value: FormColumnsOptions) =>
                        setSettings(prev => ({
                            ...prev,
                            formOptions: {...prev.formOptions, formColumns: value},
                        }))
                    }
                />
                <CompactSelect
                    label="Form Direction"
                    icon={ArrowRightLeft}
                    value={settings.formOptions.formDirection}
                    options={formDirectionOptions}
                    onChange={(value: FormDirectionOptions) =>
                        setSettings(prev => ({
                            ...prev,
                            formOptions: {...prev.formOptions, formDirection: value},
                        }))
                    }
                />
                <CompactSelect
                    label="Form Variation"
                    icon={LayoutList}
                    value={settings.formOptions.formVariation}
                    options={formVariationOptions}
                    onChange={(value: FormVariationOptions) =>
                        setSettings(prev => ({
                            ...prev,
                            formOptions: {...prev.formOptions, formVariation: value},
                        }))
                    }
                />

                {/* Text Settings */}
                <CompactSelect
                    label="Text Size"
                    icon={Type}
                    value={settings.formOptions.textSize}
                    options={textSizeOptions}
                    onChange={(value: TextSizeOptions) =>
                        setSettings(prev => ({
                            ...prev,
                            formOptions: {...prev.formOptions, textSize: value},
                        }))
                    }
                />
                <CompactSwitch
                    label="Show Field Labels"
                    icon={Type}
                    checked={settings.formOptions.showLabel}
                    onCheckedChange={(checked) =>
                        setSettings(prev => ({
                            ...prev,
                            formOptions: {...prev.formOptions, showLabel: checked},
                        }))
                    }
                />
                <CompactSwitch
                    label="Floating Labels"
                    icon={Type}
                    checked={settings.formOptions.floatingLabel}
                    onCheckedChange={(checked) =>
                        setSettings(prev => ({
                            ...prev,
                            formOptions: {...prev.formOptions, floatingLabel: checked},
                        }))
                    }
                />

                {/* Entity Controls */}
                <CompactSwitch
                    label="Show Inline Entities"
                    icon={Blocks}
                    checked={settings.inlineEntityOptions.showInlineEntities}
                    onCheckedChange={(checked) =>
                        setSettings(prev => ({
                            ...prev,
                            inlineEntityOptions: {
                                ...prev.inlineEntityOptions,
                                showInlineEntities: checked,
                            },
                        }))
                    }
                />
                <CompactSelect
                    label="Entity Display Style"
                    icon={BoxSelect}
                    value={settings.inlineEntityOptions.inlineEntityStyle}
                    options={inlineEntityStyleOptions}
                    onChange={(value: InlineEntityComponentStyles) =>
                        setSettings(prev => ({
                            ...prev,
                            inlineEntityOptions: {
                                ...prev.inlineEntityOptions,
                                inlineEntityStyle: value,
                            },
                        }))
                    }
                />
                <CompactSelect
                    label="Entity Columns"
                    icon={Columns}
                    value={settings.inlineEntityOptions.inlineEntityColumns}
                    options={inlineEntityColumnOptions}
                    onChange={(value: InlineEntityColumnsOptions) =>
                        setSettings(prev => ({
                            ...prev,
                            inlineEntityOptions: {
                                ...prev.inlineEntityOptions,
                                inlineEntityColumns: value,
                            },
                        }))
                    }
                />
                <CompactSwitch
                    label="Editable Entities"
                    icon={SlidersHorizontal}
                    checked={settings.inlineEntityOptions.editableInlineEntities}
                    onCheckedChange={(checked) =>
                        setSettings(prev => ({
                            ...prev,
                            inlineEntityOptions: {
                                ...prev.inlineEntityOptions,
                                editableInlineEntities: checked,
                            },
                        }))
                    }
                />

                {/* Entity Select Controls */}
                <CompactSelect
                    label="Entity Select Style"
                    icon={Palette}
                    value={settings.entitySelectStyle}
                    options={entitySelectStyleOptions}
                    onChange={(value: EntitySelectStyle) =>
                        setSettings(prev => ({
                            ...prev,
                            entitySelectStyle: value,
                        }))
                    }
                />
                <CompactSelect
                    label="Entity Select Variant"
                    icon={TreeDeciduous}
                    value={settings.entitySelectVariant}
                    options={entitySelectVariantOptions}
                    onChange={(value: EntitySelectVariant) =>
                        setSettings(prev => ({
                            ...prev,
                            entitySelectVariant: value,
                        }))
                    }
                />

                {/* Quick Reference */}
                <CompactSelect
                    label="Reference Display"
                    icon={Component}
                    value={settings.quickReferenceType}
                    options={quickReferenceComponentOptions}
                    onChange={(value: QuickReferenceComponentType) =>
                        setSettings(prev => ({
                            ...prev,
                            quickReferenceType: value,
                        }))
                    }
                />

                {/* Display Controls */}
                <CompactSwitch
                    label="Full Screen Mode"
                    icon={Maximize}
                    checked={settings.isFullScreen}
                    onCheckedChange={(checked) =>
                        setSettings(prev => ({
                            ...prev,
                            isFullScreen: checked,
                        }))
                    }
                />
                <CompactSwitch
                    label="Enable Search"
                    icon={Laptop}
                    checked={settings.formOptions.formEnableSearch}
                    onCheckedChange={(checked) =>
                        setSettings(prev => ({
                            ...prev,
                            formOptions: {
                                ...prev.formOptions,
                                formEnableSearch: checked,
                            },
                        }))
                    }
                />
            </div>
        </div>

    );
};
