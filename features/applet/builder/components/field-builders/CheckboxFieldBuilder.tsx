'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import SplitScreenOverlay from '@/components/official/SplitScreenOverlay';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AppDemoManager } from '@/features/applet/layouts/core/AppDemoManager';
import { Plus, Trash2, X, RefreshCw } from 'lucide-react';
import { CheckboxGroupFieldConfig, CheckboxOption, GroupFieldConfig } from '@/features/applet/runner/components/field-components/types';
import { 
    originalCheckboxGroupField,
    originalSingleCheckboxField,
    updateCheckboxField, 
    updateCheckboxGroup 
} from '@/features/applet/sample-mock-data/starter-applet';
import { starterAppConfig } from '@/features/applet/sample-mock-data/constants';

interface CheckboxFieldBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (field: GroupFieldConfig) => void;
    initialField?: GroupFieldConfig;
}

// Define separate interfaces for our two checkbox types
interface SingleCheckboxConfig {
    checkboxLabel: string;
    required: boolean;
    defaultChecked: boolean;
    value: string;
}

interface GroupCheckboxConfig {
    options: CheckboxOption[];
    includeOther: boolean;
    direction: 'vertical' | 'horizontal' | string;
}

// Add app context interface
interface AppContext {
    appName: string;
    appletName: string;
    buttonLabel: string;
}

// Helper to convert a string to kebab case
const toKebabCase = (str: string): string => {
    return str
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');
};

export const CheckboxFieldBuilder: React.FC<CheckboxFieldBuilderProps> = ({
    isOpen,
    onClose,
    onSave,
    initialField
}) => {
    // Track if we're editing a single checkbox or a checkbox group
    const [isCheckboxGroup, setIsCheckboxGroup] = useState(true);
    
    // Force refresh counter
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Field states - initialize with default checkbox group
    const [field, setField] = useState<GroupFieldConfig>({
        brokerId: `checkbox-${uuidv4().substring(0, 8)}`,
        label: '',
        placeholder: '',
        type: 'checkbox',
        customConfig: {
            options: Array(5).fill(null).map(() => ({
                id: uuidv4(),
                label: '',
                value: '',
            })),
            includeOther: true,
            direction: 'vertical',
        } as GroupCheckboxConfig
    });

    // Group states
    const [groupLabel, setGroupLabel] = useState('Sample Form Section');
    const [groupPlaceholder, setGroupPlaceholder] = useState('Sample form section with checkbox');
    
    // App context states
    const [appContext, setAppContext] = useState<AppContext>({
        appName: starterAppConfig.name,
        appletName: starterAppConfig.appletList[0].label,
        buttonLabel: starterAppConfig.extraButtons[0].label
    });
    
    // Get typed config helpers
    const getGroupConfig = (): GroupCheckboxConfig => field.customConfig as GroupCheckboxConfig;
    const getSingleConfig = (): SingleCheckboxConfig => field.customConfig as SingleCheckboxConfig;
    
    // Force refresh preview
    const refreshPreview = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);
    
    // Initialize field with either provided field or default
    useEffect(() => {
        if (initialField) {
            setField(initialField);
            // Determine if this is a checkbox group based on the customConfig
            setIsCheckboxGroup(!!initialField.customConfig && 'options' in initialField.customConfig);
        }
    }, [initialField]);

    // Update the preview whenever field or group changes
    useEffect(() => {
        // Update the starter applet config to reflect current field
        updateCheckboxField(field);
        updateCheckboxGroup(groupLabel, groupPlaceholder);
        
        // Add a small delay to ensure the change has been processed
        const timeoutId = setTimeout(refreshPreview, 100);
        return () => clearTimeout(timeoutId);
    }, [field, groupLabel, groupPlaceholder, refreshPreview]);
    
    // Handle changes to app context
    const handleAppContextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAppContext(prev => ({
            ...prev,
            [name]: value
        }));
        
        // This would ideally update the app context in a real implementation
        // For now, we'll just refresh the preview
        refreshPreview();
    };

    const handleSave = () => {
        // Clean up empty options before saving
        if (isCheckboxGroup) {
            const config = getGroupConfig();
            const cleanedOptions = config.options.filter(option => option.label.trim() !== '');
            
            // Make sure each option has a properly formatted value
            const formattedOptions = cleanedOptions.map(option => ({
                ...option,
                value: option.value || toKebabCase(option.label)
            }));
            
            const updatedField = {
                ...field,
                customConfig: {
                    ...config,
                    options: formattedOptions
                }
            };
            
            if (onSave) {
                onSave(updatedField);
            }
        } else {
            if (onSave) {
                onSave(field);
            }
        }
        onClose();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setField(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSwitchChange = (name: string, checked: boolean) => {
        if (isCheckboxGroup) {
            const config = getGroupConfig();
            setField(prev => ({
                ...prev,
                customConfig: {
                    ...config,
                    [name]: checked
                }
            }));
        } else {
            const config = getSingleConfig();
            setField(prev => ({
                ...prev,
                customConfig: {
                    ...config,
                    [name]: checked
                }
            }));
        }
    };

    // Handle changes to option labels
    const handleOptionLabelChange = (index: number, value: string) => {
        const config = getGroupConfig();
        const updatedOptions = [...config.options];
        
        // Update the label and automatically set a kebab-case value
        updatedOptions[index] = {
            ...updatedOptions[index],
            label: value,
            value: toKebabCase(value)
        };
        
        setField(prev => ({
            ...prev,
            customConfig: {
                ...config,
                options: updatedOptions
            }
        }));
    };

    // Add 5 more empty options
    const addMoreOptions = () => {
        const config = getGroupConfig();
        const newOptions = Array(5).fill(null).map(() => ({
            id: uuidv4(),
            label: '',
            value: '',
        }));
        
        setField(prev => ({
            ...prev,
            customConfig: {
                ...config,
                options: [...config.options, ...newOptions]
            }
        }));
    };

    // Remove an option at the specified index
    const removeOption = (index: number) => {
        const config = getGroupConfig();
        const updatedOptions = [...config.options];
        updatedOptions.splice(index, 1);
        
        setField(prev => ({
            ...prev,
            customConfig: {
                ...config,
                options: updatedOptions
            }
        }));
    };

    // Set the direction for checkbox group layout
    const setDirection = (direction: 'vertical' | 'horizontal') => {
        const config = getGroupConfig();
        setField(prev => ({
            ...prev,
            customConfig: {
                ...config,
                direction
            }
        }));
    };

    // Toggle checkbox type (single vs group)
    const toggleCheckboxType = (isGroup: boolean) => {
        setIsCheckboxGroup(isGroup);
        
        if (isGroup) {
            // Switch to checkbox group
            setField(prev => ({
                ...prev,
                type: 'checkbox',
                customConfig: {
                    options: Array(5).fill(null).map(() => ({
                        id: uuidv4(),
                        label: '',
                        value: '',
                    })),
                    includeOther: true,
                    direction: 'vertical',
                } as GroupCheckboxConfig
            }));
        } else {
            // Switch to single checkbox
            setField(prev => ({
                ...prev,
                type: 'checkbox',
                customConfig: {
                    checkboxLabel: '',
                    required: false,
                    defaultChecked: false,
                    value: 'true'
                } as SingleCheckboxConfig
            }));
        }
    };

    // Left panel tabs - Field configuration
    const leftTabs = [
        {
            id: 'basic',
            label: 'Basic',
            content: (
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(95vh-200px)]">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Basic Configuration</h3>
                    
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <Button 
                                onClick={() => toggleCheckboxType(false)}
                                variant={!isCheckboxGroup ? "default" : "outline"}
                                className="flex-1"
                            >
                                Single Checkbox
                            </Button>
                            <Button 
                                onClick={() => toggleCheckboxType(true)}
                                variant={isCheckboxGroup ? "default" : "outline"}
                                className="flex-1"
                            >
                                Checkbox Group
                            </Button>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="label" className="text-sm font-medium">
                                Field Label
                            </Label>
                            <Input
                                id="label"
                                name="label"
                                value={field.label}
                                onChange={handleInputChange}
                                placeholder="Enter field label"
                                className="border-gray-300 dark:border-gray-700"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="placeholder" className="text-sm font-medium">
                                Field Placeholder
                            </Label>
                            <Input
                                id="placeholder"
                                name="placeholder"
                                value={field.placeholder || ''}
                                onChange={handleInputChange}
                                placeholder="Enter placeholder text"
                                className="border-gray-300 dark:border-gray-700"
                            />
                        </div>

                        {isCheckboxGroup ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="includeOther" className="text-sm font-medium">
                                        Include "Other" option
                                    </Label>
                                    <Switch
                                        id="includeOther"
                                        checked={getGroupConfig().includeOther || false}
                                        onCheckedChange={(checked) => handleSwitchChange('includeOther', checked)}
                                    />
                                </div>

                                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                                    <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">Checkbox Options</h4>
                                    <div className="space-y-2">
                                        {getGroupConfig().options.map((option, index) => (
                                            <div key={option.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`option-${index}`}
                                                    className="w-5 h-5"
                                                    disabled
                                                />
                                                <Input
                                                    value={option.label}
                                                    onChange={(e) => handleOptionLabelChange(index, e.target.value)}
                                                    placeholder={`Option ${index + 1}`}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => removeOption(index)}
                                                    className="h-8 w-8 text-gray-500 hover:text-red-500"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="mt-3"
                                        onClick={addMoreOptions}
                                    >
                                        <Plus className="h-4 w-4 mr-1" /> Add More Options
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="direction" className="text-sm font-medium">
                                        Layout Direction
                                    </Label>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant={getGroupConfig().direction === 'vertical' ? 'default' : 'outline'}
                                            onClick={() => setDirection('vertical')}
                                        >
                                            Vertical
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant={getGroupConfig().direction === 'horizontal' ? 'default' : 'outline'}
                                            onClick={() => setDirection('horizontal')}
                                        >
                                            Horizontal
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="checkboxLabel" className="text-sm font-medium">
                                        Checkbox Label
                                    </Label>
                                    <Input
                                        id="checkboxLabel"
                                        name="checkboxLabel"
                                        value={!isCheckboxGroup ? getSingleConfig().checkboxLabel || '' : ''}
                                        onChange={(e) => {
                                            setField(prev => ({
                                                ...prev,
                                                customConfig: {
                                                    ...prev.customConfig,
                                                    checkboxLabel: e.target.value
                                                }
                                            }));
                                        }}
                                        placeholder="Text displayed next to the checkbox"
                                        className="border-gray-300 dark:border-gray-700"
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="required" className="text-sm font-medium">
                                        Required
                                    </Label>
                                    <Switch
                                        id="required"
                                        checked={!isCheckboxGroup ? getSingleConfig().required || false : false}
                                        onCheckedChange={(checked) => handleSwitchChange('required', checked)}
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="defaultChecked" className="text-sm font-medium">
                                        Default Checked
                                    </Label>
                                    <Switch
                                        id="defaultChecked"
                                        checked={!isCheckboxGroup ? getSingleConfig().defaultChecked || false : false}
                                        onCheckedChange={(checked) => handleSwitchChange('defaultChecked', checked)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
        },
        {
            id: 'context',
            label: 'Context',
            content: (
                <div className="p-6 space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Context Configuration</h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="groupLabel" className="text-sm font-medium">
                                Form Section Label
                            </Label>
                            <Input
                                id="groupLabel"
                                value={groupLabel}
                                onChange={(e) => setGroupLabel(e.target.value)}
                                placeholder="The label for the form section"
                                className="border-gray-300 dark:border-gray-700"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="groupPlaceholder" className="text-sm font-medium">
                                Form Section Description
                            </Label>
                            <Input
                                id="groupPlaceholder"
                                value={groupPlaceholder}
                                onChange={(e) => setGroupPlaceholder(e.target.value)}
                                placeholder="The description for the form section"
                                className="border-gray-300 dark:border-gray-700"
                            />
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'app-context',
            label: 'App',
            content: (
                <div className="p-6 space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">App Context</h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="appName" className="text-sm font-medium">
                                App Name
                            </Label>
                            <Input
                                id="appName"
                                name="appName"
                                value={appContext.appName}
                                onChange={handleAppContextChange}
                                placeholder="Enter app name"
                                className="border-gray-300 dark:border-gray-700"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="appletName" className="text-sm font-medium">
                                Applet Name
                            </Label>
                            <Input
                                id="appletName"
                                name="appletName"
                                value={appContext.appletName}
                                onChange={handleAppContextChange}
                                placeholder="Enter applet name"
                                className="border-gray-300 dark:border-gray-700"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="buttonLabel" className="text-sm font-medium">
                                Button Label
                            </Label>
                            <Input
                                id="buttonLabel"
                                name="buttonLabel"
                                value={appContext.buttonLabel}
                                onChange={handleAppContextChange}
                                placeholder="Enter button label"
                                className="border-gray-300 dark:border-gray-700"
                            />
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'advanced',
            label: 'Advanced',
            content: (
                <div className="p-6 space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Advanced Configuration</h3>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="brokerId" className="text-sm font-medium">
                                Broker ID
                            </Label>
                            <Input
                                id="brokerId"
                                name="brokerId"
                                value={field.brokerId}
                                onChange={handleInputChange}
                                placeholder="Enter broker ID"
                                className="border-gray-300 dark:border-gray-700"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Unique identifier for this field
                            </p>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="helpText" className="text-sm font-medium">
                                Help Text
                            </Label>
                            <Input
                                id="helpText"
                                name="helpText"
                                value={field.helpText || ''}
                                onChange={handleInputChange}
                                placeholder="Help text for this field"
                                className="border-gray-300 dark:border-gray-700"
                            />
                        </div>
                    </div>
                </div>
            )
        }
    ];

    // Right panel tabs - Preview
    const rightTabs = [
        {
            id: 'preview',
            label: 'Live Preview',
            content: (
                <div className="p-6 space-y-4">
                    <div className="flex justify-end">
                        <Button 
                            onClick={refreshPreview}
                            variant="outline"
                            size="sm"
                            className="mb-2"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" /> Refresh Preview
                        </Button>
                    </div>
                    <div className="flex justify-center items-start">
                        <AppDemoManager 
                            key={`preview-${refreshKey}`}
                            appId="starter-app"
                            layoutType="open"
                            demoWidth="100%"
                            demoHeight="500px"
                        />
                    </div>
                </div>
            )
        }
    ];

    return (
        <SplitScreenOverlay
            isOpen={isOpen}
            onClose={onClose}
            title="Checkbox Field Builder"
            leftTabs={leftTabs}
            rightTabs={rightTabs}
            showSaveButton={true}
            onSave={handleSave}
            saveButtonLabel="Save Field"
            showCancelButton={true}
            onCancel={onClose}
            cancelButtonLabel="Cancel"
            leftPanelWidth="40%"
            rightPanelWidth="60%"
        />
    );
};

export default CheckboxFieldBuilder; 