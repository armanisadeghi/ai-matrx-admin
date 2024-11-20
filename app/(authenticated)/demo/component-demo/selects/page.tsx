// '@/app/demo/selects/page.tsx'
'use client';

import React, {useState} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    EntitySelectProps,
    SelectOption,
    OptionGroup,
    HierarchicalOption,
    SelectSubComponentType
} from '@/components/matrx/ArmaniForm/field-components/select/types';
import {User, Building, TreePine, Tags, Split, Group, Network, Search, Command} from 'lucide-react';
import MatrxEntitySelect from '@/components/matrx/ArmaniForm/field-components/select/entity-select';
import {JsonViewer} from '@/components/ui';

function sanitizeForJSON(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForJSON(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const newObj: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip React elements and functions
            if (React.isValidElement(value)) {
                newObj[key] = '[React Element]';
            } else if (typeof value === 'function') {
                newObj[key] = '[Function]';
            } else {
                newObj[key] = sanitizeForJSON(value);
            }
        }
        return newObj;
    }
    return obj;
}


export default function SelectDemoPage() {
    // Basic options that can be reused
    const basicOptions: SelectOption[] = [
        {value: '1', label: 'Option 1', icon: <User className="h-4 w-4"/>, description: 'First option'},
        {value: '2', label: 'Option 2', icon: <Building className="h-4 w-4"/>, description: 'Second option'},
        {value: '3', label: 'Option 3', icon: <TreePine className="h-4 w-4"/>, description: 'Third option'},
    ];

    // State for each select type
// Update the state declarations
    const [basicValue, setBasicValue] = useState<string | null>(null);
    const [multipleValue, setMultipleValue] = useState<string[]>([]);
    const [comboValue, setComboValue] = useState<string | null>(null);
    const [asyncValue, setAsyncValue] = useState<string | null>(null);
    const [tagValue, setTagValue] = useState<string[]>([]);
    const [groupedValue, setGroupedValue] = useState<string | null>(null);
    const [cascadingValue, setCascadingValue] = useState<string | null>(null);
    const [virtualizedValue, setVirtualizedValue] = useState<string | null>(null);
    const [splitValue, setSplitValue] = React.useState<string | null>(null);
    const [tagsValue, setTagsValue] = React.useState<string[]>([]);

    const handleSplitChange = (value: string | null) => {
        setSplitValue(value);
        console.log('Split select changed:', value);
    };

    const handleTagsChange = (value: string[]) => {
        setTagsValue(value);
        console.log('Tags changed:', value);
    };
// Create wrapped onChange handlers that match the expected types
    const handleBasicChange = (value: string | string[] | null) => {
        setBasicValue(value as string | null);
    };

    const handleMultipleChange = (value: string | string[] | null) => {
        setMultipleValue(value as string[]);
    };

    const handleComboChange = (value: string | string[] | null) => {
        setComboValue(value as string | null);
    };

    const handleAsyncChange = (value: string | string[] | null) => {
        setAsyncValue(value as string | null);
    };

    const handleTagChange = (value: string | string[] | null) => {
        setTagValue(value as string[]);
    };

    const handleGroupedChange = (value: string | string[] | null) => {
        setGroupedValue(value as string | null);
    };

    const handleCascadingChange = (value: string | string[] | null) => {
        setCascadingValue(value as string | null);
    };

    const handleVirtualizedChange = (value: string | string[] | null) => {
        setVirtualizedValue(value as string | null);
    };

    // Mock async load function
    const mockAsyncLoad = async (input: string): Promise<SelectOption[]> => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return basicOptions.filter(opt =>
            opt.label.toLowerCase().includes(input.toLowerCase())
        );
    };

    // Grouped options
    const groupedOptions: OptionGroup[] = [
        {
            label: 'Recent',
            options: [
                {value: 'recent1', label: 'Recent Item 1', icon: <User className="h-4 w-4"/>},
                {value: 'recent2', label: 'Recent Item 2', icon: <Building className="h-4 w-4"/>},
            ]
        },
        {
            label: 'Popular',
            options: [
                {value: 'popular1', label: 'Popular Item 1', icon: <TreePine className="h-4 w-4"/>},
                {value: 'popular2', label: 'Popular Item 2', icon: <Tags className="h-4 w-4"/>},
            ]
        }
    ];

    // Cascading options
    const cascadingOptions: HierarchicalOption[] = [
        {
            value: 'electronics',
            label: 'Electronics',
            icon: <Command className="h-4 w-4"/>,
            children: [
                {
                    value: 'phones',
                    label: 'Phones',
                    icon: <Network className="h-4 w-4"/>,
                    children: [
                        {value: 'iphone', label: 'iPhone', icon: <User className="h-4 w-4"/>},
                        {value: 'android', label: 'Android', icon: <Building className="h-4 w-4"/>}
                    ]
                },
                {
                    value: 'computers',
                    label: 'Computers',
                    icon: <Search className="h-4 w-4"/>,
                    children: [
                        {value: 'laptop', label: 'Laptop', icon: <TreePine className="h-4 w-4"/>},
                        {value: 'desktop', label: 'Desktop', icon: <Tags className="h-4 w-4"/>}
                    ]
                }
            ]
        }
    ];

    // Virtualized options
    const virtualizedOptions: SelectOption[] = Array.from({length: 10000}, (_, i) => ({
        value: `option${i}`,
        label: `Option ${i}`,
        icon: i % 2 === 0 ? <User className="h-4 w-4"/> : <Building className="h-4 w-4"/>,
        description: `Description for option ${i}`
    }));

    const tabs: Array<{
        value: string;
        label: string;
        icon: React.ReactNode;
        component: EntitySelectProps;
    }> = [
        {
            value: 'basic',
            label: 'Basic Select',
            icon: <User className="h-4 w-4"/>,
            component: {
                value: basicValue,
                onChange: handleBasicChange,
                componentProps: {
                    subComponent: 'basic',
                    options: basicOptions,
                    visual: {
                        animation: 'enhanced',
                        showIcons: true,
                        showCheckmarks: true,
                        size: 'md',
                        placeholder: 'Select an option...'
                    }
                }
            }
        },
        {
            value: 'tags',
            label: 'Tag Select',
            icon: <User className="h-4 w-4"/>,
            component: {
                value: basicValue,
                onChange: handleBasicChange,
                componentProps: {
                    subComponent: 'tags',
                    options: basicOptions,
                    visual: {
                        animation: 'enhanced',
                        showIcons: true,
                        showCheckmarks: true,
                        size: 'md',
                        placeholder: 'Select an option...'
                    }
                }
            }
        },

        {
            value: 'multiple',
            label: 'Multiple Select',
            icon: <Group className="h-4 w-4"/>,
            component: {
                value: multipleValue,
                onChange: handleMultipleChange,
                componentProps: {
                    subComponent: 'multiple',
                    options: basicOptions,
                    visual: {
                        animation: 'enhanced',
                        placeholder: 'Select multiple options...'
                    },
                    behavior: {
                        multiple: true,
                        clearable: true
                    },
                    validation: {
                        max: 3
                    }
                }
            }
        },
        {
            value: 'combobox',
            label: 'Combobox',
            icon: <Search className="h-4 w-4"/>,
            component: {
                value: comboValue,
                onChange: handleComboChange,
                componentProps: {
                    subComponent: 'combobox',
                    options: basicOptions,
                    visual: {
                        animation: 'enhanced',
                        placeholder: 'Search and select...'
                    },
                    behavior: {
                        searchable: true,
                        freeSolo: true
                    },
                    search: {
                        minLength: 1,
                        debounce: 300
                    }
                }
            }
        },
        {
            value: 'async',
            label: 'Async Select',
            icon: <Network className="h-4 w-4"/>,
            component: {
                value: asyncValue,
                onChange: handleAsyncChange,
                componentProps: {
                    subComponent: 'async',
                    options: [],
                    visual: {
                        animation: 'enhanced',
                        placeholder: 'Search async options...'
                    },
                    behavior: {
                        async: true,
                        searchable: true
                    },
                    search: {
                        loadOptions: mockAsyncLoad
                    }
                }
            }
        },
        {
            value: 'split',
            label: 'Split Select',
            icon: <Split className="h-4 w-4"/>,
            component: {
                value: splitValue,
                onChange: handleSplitChange,
                componentProps: {
                    subComponent: 'split',
                    options: basicOptions,
                    defaultOption: {
                        value: 'default',
                        label: 'Default Action',
                        icon: <Command className="h-4 w-4"/>
                    },
                    showDefaultInList: false,
                    onDefaultOptionClick: (option) => console.log('Default option clicked:', option),
                    visual: {
                        animation: 'enhanced',
                        showIcons: true,
                        showCheckmarks: true,
                        size: 'md',
                        placeholder: 'Select an option...',
                        dropdownClassName: 'custom-dropdown',
                        optionClassName: 'custom-option'
                    },
                    behavior: {
                        disabled: false,
                        closeOnSelect: true
                    },
                    splitButtonProps: {
                        className: 'custom-split-button'
                    },
                    dropdownButtonProps: {
                        className: 'custom-dropdown-button'
                    }
                }
            }
        }, {
            value: 'grouped',
            label: 'Grouped Select',
            icon: <Group className="h-4 w-4"/>,
            component: {
                value: groupedValue,
                onChange: handleGroupedChange,
                componentProps: {
                    subComponent: 'grouped',
                    options: groupedOptions,
                    visual: {
                        animation: 'enhanced'
                    },
                    grouped: {
                        showGroupCounts: true,
                        collapsible: true
                    }
                }
            }
        },
        {
            value: 'cascading',
            label: 'Cascading Select',
            icon: <Network className="h-4 w-4"/>,
            component: {
                value: cascadingValue,
                onChange: handleCascadingChange,
                componentProps: {
                    subComponent: 'cascading',
                    options: cascadingOptions,
                    visual: {
                        animation: 'enhanced'
                    },
                    cascade: {
                        expandTrigger: 'click',
                        changeOnSelect: true
                    }
                }
            }
        },
// Update the virtualized tab configuration
        {
            value: 'virtualized',
            label: 'Virtualized Select',
            icon: <Command className="h-4 w-4"/>,
            component: {
                value: virtualizedValue,
                onChange: handleVirtualizedChange,
                componentProps: {
                    subComponent: 'virtualized',
                    options: virtualizedOptions,
                    visual: {
                        animation: 'enhanced',
                        maxHeight: '300px',
                        showIcons: true,
                        showCheckmarks: true,
                        size: 'md',
                        dropdownClassName: 'virtualized-dropdown',
                        optionClassName: 'virtualized-option',
                        placeholder: 'Select an option...'
                    },
                    virtualized: {
                        height: 300,
                        itemHeight: 35,
                        overscan: 5,
                        onEndReached: () => {
                            console.log('Reached end of list');
                            // Load more items if needed
                        },
                        endReachedThreshold: 0.8,
                        loadingMore: false
                    },
                    behavior: {
                        virtualized: true,
                        closeOnSelect: true,
                        disabled: false
                    },
                    validation: {
                        required: false
                    }
                }
            }
        }
    ];

    return (
        <div className="w-full p-4 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Select Components Demo</h1>
                <p className="text-sm text-muted-foreground">
                    Showcasing all variations of the MatrxEntitySelect component
                </p>
            </div>

            <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid grid-cols-2 lg:grid-cols-12 gap-2">
                    {tabs.map(tab => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="flex items-center gap-2"
                        >
                            {tab.icon}
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {tabs.map(tab => (
                    <TabsContent key={tab.value} value={tab.value}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        {tab.icon}
                                        {tab.label}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MatrxEntitySelect {...tab.component} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Component State</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <JsonViewer
                                        initialExpanded={true}
                                        data={tab.component}/>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
