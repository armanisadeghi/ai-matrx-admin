// EntityControlSet.tsx
import React from 'react';
import {
    Layout, Layers, ArrowRightLeft, Maximize2, Sparkles,
    Columns, Maximize, Columns2, Type, Laptop,
    BoxSelect, LayoutGrid, Palette, Settings,
    TreeDeciduous, Component, SlidersHorizontal, LayoutList, Blocks,
    RotateCw, MousePointer, Move, Expand,
} from 'lucide-react';
import {CompactSelect, CompactSwitch, CompactSlider} from '@/components/matrx/compact-controls-with-lables';
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
    EntityFormType,
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
    entityFormTypeOptions,
} from '@/types/componentConfigTypes';
import { MatrxVariant } from '@/components/matrx/ArmaniForm/field-components/types';
import { UnifiedLayoutProps } from '@/components/matrx/Entity/prewired-components/layouts/types';
import { getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';

// Component variant options
const componentVariantOptions = [
    { label: 'Default', value: 'default', key: 'variant-default' },
    { label: 'Ghost', value: 'ghost', key: 'variant-ghost' },
    { label: 'Outline', value: 'outline', key: 'variant-outline' },
    { label: 'Secondary', value: 'secondary', key: 'variant-secondary' },
    { label: 'Destructive', value: 'destructive', key: 'variant-destructive' },
];

// Select position options
const selectPositionOptions = [
    { label: 'Default', value: 'default', key: 'select-default' },
    { label: 'Side by Side', value: 'sideBySide', key: 'select-sideBySide' },
    { label: 'Popper', value: 'popper', key: 'select-popper' },
    { label: 'Item Aligned', value: 'item-aligned', key: 'select-item-aligned' },
];

interface EntityControlSetProps {
    unifiedProps: UnifiedLayoutProps;
    setUnifiedProps: React.Dispatch<React.SetStateAction<UnifiedLayoutProps>>;
    additionalSettings?: {
        isFullScreen?: boolean;
        entitySelectStyle?: EntitySelectStyle;
        entitySelectVariant?: EntitySelectVariant;
    };
    setAdditionalSettings?: React.Dispatch<React.SetStateAction<{
        isFullScreen?: boolean;
        entitySelectStyle?: EntitySelectStyle;
        entitySelectVariant?: EntitySelectVariant;
    }>>;
}

export const EntityControlSet: React.FC<EntityControlSetProps> = ({
    unifiedProps,
    setUnifiedProps,
    additionalSettings = {},
    setAdditionalSettings,
}) => {
    // Helper function to update unified props
    const updateUnifiedProps = (updates: { [key: string]: any }) => {
        const updatedProps = getUpdatedUnifiedLayoutProps(unifiedProps, updates);
        setUnifiedProps(updatedProps);
    };

    // Helper function to update additional settings
    const updateAdditionalSettings = (updates: Partial<typeof additionalSettings>) => {
        if (setAdditionalSettings) {
            setAdditionalSettings(prev => ({ ...prev, ...updates }));
        }
    };

    // Extract current values from complete props (no defaults needed)
    const currentLayout = unifiedProps.dynamicLayoutOptions.componentOptions?.formLayoutType;
    const currentDensity = unifiedProps.dynamicStyleOptions.density;
    const currentAnimation = unifiedProps.dynamicStyleOptions.animationPreset;
    const currentSize = unifiedProps.dynamicStyleOptions.size;
    const currentVariant = unifiedProps.dynamicStyleOptions.variant;
    const currentQuickReferenceType = unifiedProps.dynamicLayoutOptions.componentOptions?.quickReferenceType;
    const currentSplitRatio = unifiedProps.dynamicLayoutOptions.formStyleOptions?.splitRatio;
    
    // Form options
    const currentFormLayout = unifiedProps.dynamicLayoutOptions.formStyleOptions?.formLayout;
    const currentFormColumns = unifiedProps.dynamicLayoutOptions.formStyleOptions?.formColumns;
    const currentFormDirection = unifiedProps.dynamicLayoutOptions.formStyleOptions?.formDirection;
    const currentFormEnableSearch = unifiedProps.dynamicLayoutOptions.formStyleOptions?.formEnableSearch;
    const currentFloatingLabel = unifiedProps.dynamicLayoutOptions.formStyleOptions?.floatingLabel;
    const currentShowLabel = unifiedProps.dynamicLayoutOptions.formStyleOptions?.showLabel;
    const currentTextSize = unifiedProps.dynamicLayoutOptions.formStyleOptions?.textSize;
    
    // Inline entity options
    const currentInlineEntityOptions = unifiedProps.dynamicLayoutOptions.inlineEntityOptions;
    
    // Resizable layout options
    const currentResizableOptions = unifiedProps.resizableLayoutOptions;
    
    // Select component options
    const currentSelectPosition = unifiedProps.selectComponentOptions?.selectContentPosition;
    
    // Additional settings
    const currentIsFullScreen = additionalSettings.isFullScreen || false;
    const currentEntitySelectStyle = additionalSettings.entitySelectStyle || 'default';
    const currentEntitySelectVariant = additionalSettings.entitySelectVariant || 'default';

    // Form variation helper (derived from other settings)
    const currentFormVariation = React.useMemo(() => {
        const isSinglePage = unifiedProps.dynamicLayoutOptions.formStyleOptions?.formIsSinglePage !== false;
        const isFullPage = unifiedProps.dynamicLayoutOptions.formStyleOptions?.formIsFullPage !== false;
        
        if (isFullPage && isSinglePage) return 'fullWidthSinglePage';
        if (isFullPage && !isSinglePage) return 'fullWidthMultiStep';
        if (isSinglePage) return 'restrictedWidthSinglePage';
        return 'multiStepModal';
    }, [unifiedProps.dynamicLayoutOptions.formStyleOptions?.formIsSinglePage, unifiedProps.dynamicLayoutOptions.formStyleOptions?.formIsFullPage]);

    // Check if current layout supports split ratios
    const supportsSplitRatio = ['split', 'resizable'].includes(currentLayout || '');
    
    // Check if current layout supports resizable options
    const supportsResizableOptions = currentLayout === 'resizable';

    return (
        <div className="flex-1 p-1">
            <div className="flex flex-wrap gap-1.5">
                {/* === LAYOUT CONTROLS === */}
                <CompactSelect
                    label="Page Layout"
                    icon={Layout}
                    value={currentLayout}
                    options={pageLayoutOptions}
                    onChange={(value: PageLayoutOptions) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                componentOptions: {
                                    formLayoutType: value
                                }
                            }
                        })
                    }
                />
                
                <CompactSelect
                    label="Form Component"
                    icon={Component}
                    value={unifiedProps.formComponent}
                    options={entityFormTypeOptions}
                    onChange={(value: EntityFormType) =>
                        updateUnifiedProps({
                            formComponent: value
                        })
                    }
                />

                {/* Split Ratio - only for layouts that support it */}
                {supportsSplitRatio && (
                    <CompactSlider
                        label="Split Ratio"
                        icon={Columns2}
                        value={currentSplitRatio}
                        onChange={(value) =>
                            updateUnifiedProps({
                                dynamicLayoutOptions: {
                                    formStyleOptions: {
                                        splitRatio: value
                                    }
                                }
                            })
                        }
                        min={10}
                        max={90}
                        step={5}
                    />
                )}

                {/* === RESIZABLE LAYOUT OPTIONS === */}
                {supportsResizableOptions && (
                    <>
                        <CompactSlider
                            label="Left Column Width"
                            icon={Move}
                            value={currentResizableOptions?.leftColumnWidth}
                            onChange={(value) =>
                                updateUnifiedProps({
                                    resizableLayoutOptions: {
                                        ...currentResizableOptions,
                                        leftColumnWidth: value
                                    }
                                })
                            }
                            min={15}
                            max={60}
                            step={5}
                        />
                        <CompactSlider
                            label="Min Column Width"
                            icon={Expand}
                            value={currentResizableOptions?.minColumnWidth}
                            onChange={(value) =>
                                updateUnifiedProps({
                                    resizableLayoutOptions: {
                                        ...currentResizableOptions,
                                        minColumnWidth: value
                                    }
                                })
                            }
                            min={5}
                            max={30}
                            step={1}
                        />
                        <CompactSwitch
                            label="Left Collapsible"
                            icon={ArrowRightLeft}
                            checked={currentResizableOptions?.leftColumnCollapsible}
                            onCheckedChange={(checked) =>
                                updateUnifiedProps({
                                    resizableLayoutOptions: {
                                        ...currentResizableOptions,
                                        leftColumnCollapsible: checked
                                    }
                                })
                            }
                        />
                    </>
                )}

                {/* === COMPONENT STYLING === */}
                <CompactSelect
                    label="Component Size"
                    icon={Maximize2}
                    value={currentSize}
                    options={componentSizeOptions}
                    onChange={(value: ComponentSize) =>
                        updateUnifiedProps({
                            dynamicStyleOptions: {
                                size: value
                            }
                        })
                    }
                />
                <CompactSelect
                    label="Component Density"
                    icon={Layers}
                    value={currentDensity}
                    options={densityOptions}
                    onChange={(value: ComponentDensity) =>
                        updateUnifiedProps({
                            dynamicStyleOptions: {
                                density: value
                            }
                        })
                    }
                />
                <CompactSelect
                    label="Component Variant"
                    icon={Palette}
                    value={currentVariant}
                    options={componentVariantOptions}
                    onChange={(value: MatrxVariant) =>
                        updateUnifiedProps({
                            dynamicStyleOptions: {
                                variant: value
                            }
                        })
                    }
                />
                <CompactSelect
                    label="Animation Style"
                    icon={Sparkles}
                    value={currentAnimation}
                    options={animationPresetOptions}
                    onChange={(value: AnimationPreset) =>
                        updateUnifiedProps({
                            dynamicStyleOptions: {
                                animationPreset: value
                            }
                        })
                    }
                />

                {/* === QUICK REFERENCE === */}
                <CompactSelect
                    label="Quick Reference Type"
                    icon={Component}
                    value={currentQuickReferenceType}
                    options={quickReferenceComponentOptions}
                    onChange={(value: QuickReferenceComponentType) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                componentOptions: {
                                    quickReferenceType: value
                                }
                            }
                        })
                    }
                />

                {/* === SELECT COMPONENT OPTIONS === */}
                <CompactSelect
                    label="Select Position"
                    icon={MousePointer}
                    value={currentSelectPosition}
                    options={selectPositionOptions}
                    onChange={(value) =>
                        updateUnifiedProps({
                            selectComponentOptions: {
                                selectContentPosition: value
                            }
                        })
                    }
                />

                {/* === FORM CONTROLS === */}
                <CompactSelect
                    label="Form Layout"
                    icon={LayoutGrid}
                    value={currentFormLayout}
                    options={formLayoutOptions}
                    onChange={(value: FormLayoutOptions) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                formStyleOptions: {
                                    formLayout: value
                                }
                            }
                        })
                    }
                />
                <CompactSelect
                    label="Form Columns"
                    icon={Columns}
                    value={currentFormColumns}
                    options={formColumnOptions}
                    onChange={(value: FormColumnsOptions) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                formStyleOptions: {
                                    formColumns: value
                                }
                            }
                        })
                    }
                />
                <CompactSelect
                    label="Form Direction"
                    icon={ArrowRightLeft}
                    value={currentFormDirection}
                    options={formDirectionOptions}
                    onChange={(value: FormDirectionOptions) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                formStyleOptions: {
                                    formDirection: value
                                }
                            }
                        })
                    }
                />
                <CompactSelect
                    label="Form Variation"
                    icon={LayoutList}
                    value={currentFormVariation}
                    options={formVariationOptions}
                    onChange={(value: FormVariationOptions) => {
                        const formIsSinglePage = !value.includes('MultiStep');
                        const formIsFullPage = value.includes('fullWidth');
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                formStyleOptions: {
                                    formIsSinglePage: formIsSinglePage,
                                    formIsFullPage: formIsFullPage
                                }
                            }
                        });
                    }}
                />

                {/* === TEXT SETTINGS === */}
                <CompactSelect
                    label="Text Size"
                    icon={Type}
                    value={currentTextSize}
                    options={textSizeOptions}
                    onChange={(value: TextSizeOptions) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                formStyleOptions: {
                                    textSize: value
                                }
                            }
                        })
                    }
                />
                <CompactSwitch
                    label="Show Field Labels"
                    icon={Type}
                    checked={currentShowLabel}
                    onCheckedChange={(checked) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                formStyleOptions: {
                                    showLabel: checked
                                }
                            }
                        })
                    }
                />
                <CompactSwitch
                    label="Floating Labels"
                    icon={Type}
                    checked={currentFloatingLabel}
                    onCheckedChange={(checked) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                formStyleOptions: {
                                    floatingLabel: checked
                                }
                            }
                        })
                    }
                />

                {/* === INLINE ENTITY CONTROLS === */}
                <CompactSwitch
                    label="Show Inline Entities"
                    icon={Blocks}
                    checked={currentInlineEntityOptions.showInlineEntities}
                    onCheckedChange={(checked) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                inlineEntityOptions: {
                                    ...currentInlineEntityOptions,
                                    showInlineEntities: checked
                                }
                            }
                        })
                    }
                />
                <CompactSelect
                    label="Inline Entity Style"
                    icon={BoxSelect}
                    value={currentInlineEntityOptions.inlineEntityStyle}
                    options={inlineEntityStyleOptions}
                    onChange={(value: InlineEntityComponentStyles) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                inlineEntityOptions: {
                                    ...currentInlineEntityOptions,
                                    inlineEntityStyle: value
                                }
                            }
                        })
                    }
                />
                <CompactSelect
                    label="Inline Entity Columns"
                    icon={Columns}
                    value={currentInlineEntityOptions.inlineEntityColumns}
                    options={inlineEntityColumnOptions}
                    onChange={(value: InlineEntityColumnsOptions) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                inlineEntityOptions: {
                                    ...currentInlineEntityOptions,
                                    inlineEntityColumns: value
                                }
                            }
                        })
                    }
                />
                <CompactSwitch
                    label="Editable Inline Entities"
                    icon={SlidersHorizontal}
                    checked={currentInlineEntityOptions.editableInlineEntities}
                    onCheckedChange={(checked) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                inlineEntityOptions: {
                                    ...currentInlineEntityOptions,
                                    editableInlineEntities: checked
                                }
                            }
                        })
                    }
                />

                {/* === ENTITY SELECT CONTROLS === */}
                <CompactSelect
                    label="Entity Select Style"
                    icon={Settings}
                    value={currentEntitySelectStyle}
                    options={entitySelectStyleOptions}
                    onChange={(value: EntitySelectStyle) =>
                        updateAdditionalSettings({ entitySelectStyle: value })
                    }
                />
                <CompactSelect
                    label="Entity Select Variant"
                    icon={TreeDeciduous}
                    value={currentEntitySelectVariant}
                    options={entitySelectVariantOptions}
                    onChange={(value: EntitySelectVariant) =>
                        updateAdditionalSettings({ entitySelectVariant: value })
                    }
                />

                {/* === DISPLAY CONTROLS === */}
                <CompactSwitch
                    label="Full Screen Mode"
                    icon={Maximize}
                    checked={currentIsFullScreen}
                    onCheckedChange={(checked) =>
                        updateAdditionalSettings({ isFullScreen: checked })
                    }
                />
                <CompactSwitch
                    label="Enable Search"
                    icon={Laptop}
                    checked={currentFormEnableSearch}
                    onCheckedChange={(checked) =>
                        updateUnifiedProps({
                            dynamicLayoutOptions: {
                                formStyleOptions: {
                                    formEnableSearch: checked
                                }
                            }
                        })
                    }
                />
            </div>
        </div>
    );
};
