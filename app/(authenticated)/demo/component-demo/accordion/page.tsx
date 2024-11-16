// '@/app/demo/accordion/page.tsx'
'use client';


import * as React from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {
    MatrxAccordion,
    MatrxAccordionItem,
    MatrxAccordionTrigger,
    MatrxAccordionContent,
} from '@/components/ui/samples';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Checkbox,
    Label,
    RadioGroup,
    RadioGroupItem,
} from '@/components/ui';
import {motion} from 'framer-motion';
import {Settings, Code, Palette, Layout, Plus} from 'lucide-react';
import TextDivider from '@/components/matrx/TextDivider';

const DemoPage = () => {
    // State management
    const [accordionConfig, setAccordionConfig] = React.useState({
        type: 'single' as 'single' | 'multiple',
        theme: 'default' as 'default' | 'elevated' | 'subtle',
        borderStyle: 'subtle' as 'none' | 'subtle' | 'solid',
        animationLevel: 'enhanced' as 'none' | 'basic' | 'moderate' | 'enhanced',
        iconPosition: 'right' as 'left' | 'right',
        size: 'md' as 'sm' | 'md' | 'lg',
        persistState: false,
    });

    const [activeItems, setActiveItems] = React.useState<string[]>([]);

    // Sample content with rich examples
    const richAccordionItems = [
        {
            value: 'design',
            trigger: (
                <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5"/>
                    <span>Modern Design System</span>
                </div>
            ),
            content: (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Design Principles</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {['Consistency', 'Hierarchy', 'Contrast'].map((principle) => (
                            <div key={principle} className="p-3 bg-accent/10 rounded-lg text-center">
                                {principle}
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
        {
            value: 'features',
            trigger: (
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5"/>
                    <span>Advanced Features</span>
                </div>
            ),
            content: (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-background rounded-lg shadow-sm">
                            <h4 className="font-medium mb-2">Animation Levels</h4>
                            <p className="text-sm text-muted-foreground">Customizable motion and transitions</p>
                        </div>
                        <div className="p-4 bg-background rounded-lg shadow-sm">
                            <h4 className="font-medium mb-2">Theme Support</h4>
                            <p className="text-sm text-muted-foreground">Multiple visual styles and variations</p>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            value: 'code',
            trigger: (
                <div className="flex items-center gap-2">
                    <Code className="w-5 h-5"/>
                    <span>Implementation Example</span>
                </div>
            ),
            content: (
                <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto">
                    {`<MatrxAccordion
  type="${accordionConfig.type}"
  theme="${accordionConfig.theme}"
  borderStyle="${accordionConfig.borderStyle}"
  animationLevel="${accordionConfig.animationLevel}"
  size="${accordionConfig.size}"
  persistState={${accordionConfig.persistState}}
>
  <MatrxAccordionItem>
    <MatrxAccordionTrigger iconPosition="${accordionConfig.iconPosition}">
      Title
    </MatrxAccordionTrigger>
    <MatrxAccordionContent>
      Content
    </MatrxAccordionContent>
  </MatrxAccordionItem>
</MatrxAccordion>`}
                </pre>
            ),
        },
    ];

    // Configuration panel component
    const ConfigPanel = () => (
        <div className="space-y-6">
            <div>
                <Label>Type</Label>
                <Select
                    value={accordionConfig.type}
                    onValueChange={(value) =>
                        setAccordionConfig((prev) => ({...prev, type: value as 'single' | 'multiple'}))
                    }
                >
                    <SelectTrigger>
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="multiple">Multiple</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label>Theme</Label>
                <Select
                    value={accordionConfig.theme}
                    onValueChange={(value) =>
                        setAccordionConfig((prev) => ({...prev, theme: value as 'default' | 'elevated' | 'subtle'}))
                    }
                >
                    <SelectTrigger>
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="elevated">Elevated</SelectItem>
                        <SelectItem value="subtle">Subtle</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label>Border Style</Label>
                <Select
                    value={accordionConfig.borderStyle}
                    onValueChange={(value) =>
                        setAccordionConfig((prev) => ({...prev, borderStyle: value as 'none' | 'subtle' | 'solid'}))
                    }
                >
                    <SelectTrigger>
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="subtle">Subtle</SelectItem>
                        <SelectItem value="solid">Solid</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label>Size</Label>
                <Select
                    value={accordionConfig.size}
                    onValueChange={(value) =>
                        setAccordionConfig((prev) => ({...prev, size: value as 'sm' | 'md' | 'lg'}))
                    }
                >
                    <SelectTrigger>
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="md">Medium</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label>Icon Position</Label>
                <RadioGroup
                    value={accordionConfig.iconPosition}
                    onValueChange={(value) =>
                        setAccordionConfig((prev) => ({...prev, iconPosition: value as 'left' | 'right'}))
                    }
                    className="flex gap-4 mt-2"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="left" id="left"/>
                        <Label htmlFor="left">Left</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="right" id="right"/>
                        <Label htmlFor="right">Right</Label>
                    </div>
                </RadioGroup>
            </div>

            <div>
                <Label>Animation Level</Label>
                <Select
                    value={accordionConfig.animationLevel}
                    onValueChange={(value) =>
                        setAccordionConfig((prev) => ({
                            ...prev,
                            animationLevel: value as 'none' | 'basic' | 'moderate' | 'enhanced'
                        }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="enhanced">Enhanced</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="persistState"
                    checked={accordionConfig.persistState}
                    onCheckedChange={(checked) =>
                        setAccordionConfig((prev) => ({...prev, persistState: checked === true}))
                    }
                />
                <Label htmlFor="persistState">Persist State</Label>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-4 space-y-8">
            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5}}
            >
                <h1 className="text-4xl font-bold mb-2">MatrxAccordion Showcase</h1>
                <p className="text-muted-foreground">An advanced, customizable accordion component with rich features
                    and animations</p>
            </motion.div>

            <Tabs defaultValue="showcase" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="showcase">Showcase</TabsTrigger>
                    <TabsTrigger value="playground">Playground</TabsTrigger>
                    <TabsTrigger value="examples">Examples</TabsTrigger>
                </TabsList>

                <TabsContent value="showcase">
                    <div className="grid grid-cols-1 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Feature Showcase</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MatrxAccordion
                                    type="single"
                                    defaultValue="design"
                                    className="w-full"
                                >
                                    {richAccordionItems.map((item) => (
                                        <MatrxAccordionItem key={item.value} value={item.value}>
                                            <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                            <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                        </MatrxAccordionItem>
                                    ))}
                                </MatrxAccordion>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="playground">
                    <div className="grid grid-cols-4 gap-6">
                        <Card className="col-span-1">
                            <CardHeader>
                                <CardTitle>Configuration</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ConfigPanel/>
                            </CardContent>
                        </Card>

                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <MatrxAccordion
                                    {...accordionConfig}
                                    onValueChange={(value) => {
                                        const newValue = Array.isArray(value) ? value : [value];
                                        setActiveItems(newValue);
                                    }}
                                >
                                    {richAccordionItems.map((item) => (
                                        <MatrxAccordionItem key={item.value} value={item.value}>
                                            <MatrxAccordionTrigger iconPosition={accordionConfig.iconPosition}>
                                                {item.trigger}
                                            </MatrxAccordionTrigger>
                                            <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                        </MatrxAccordionItem>
                                    ))}
                                </MatrxAccordion>

                                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <p className="text-sm font-medium mb-2">Current State:</p>
                                    <pre className="text-sm">{JSON.stringify(activeItems, null, 2)}</pre>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="examples">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Theme Variations</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <TextDivider text="Default Theme"/>
                                <MatrxAccordion type="single" theme="default">
                                    {richAccordionItems.slice(0, 2).map((item) => (
                                        <MatrxAccordionItem key={item.value} value={item.value}>
                                            <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                            <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                        </MatrxAccordionItem>
                                    ))}
                                </MatrxAccordion>

                                <TextDivider text="Subtle Theme"/>
                                <MatrxAccordion type="single" theme="subtle">
                                    {richAccordionItems.slice(0, 2).map((item) => (
                                        <MatrxAccordionItem key={item.value} value={item.value}>
                                            <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                            <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                        </MatrxAccordionItem>
                                    ))}
                                </MatrxAccordion>

                                <TextDivider text="Elevated Theme"/>
                                <MatrxAccordion type="single" theme="elevated">
                                    {richAccordionItems.slice(0, 2).map((item) => (
                                        <MatrxAccordionItem key={item.value} value={item.value}>
                                            <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                            <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                        </MatrxAccordionItem>
                                    ))}
                                </MatrxAccordion>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Size & Icon Variations</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <TextDivider text="Small with Left Icon"/>
                                <MatrxAccordion type="single" size="sm">
                                    {richAccordionItems.slice(0, 2).map((item) => (
                                        <MatrxAccordionItem key={item.value} value={item.value}>
                                            <MatrxAccordionTrigger
                                                iconPosition="left"
                                                icon={<Plus className="h-4 w-4"/>}
                                            >
                                                {item.trigger}
                                            </MatrxAccordionTrigger>
                                            <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                        </MatrxAccordionItem>
                                    ))}
                                </MatrxAccordion>

                                <TextDivider text="Large with Custom Icons"/>
                                <MatrxAccordion type="single" size="lg">
                                    {richAccordionItems.slice(0, 2).map((item) => (
                                        <MatrxAccordionItem key={item.value} value={item.value}>
                                            <MatrxAccordionTrigger
                                                icon={<Layout className="h-5 w-5 text-blue-500"/>}
                                            >
                                                {item.trigger}
                                            </MatrxAccordionTrigger>
                                            <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                        </MatrxAccordionItem>
                                    ))}
                                </MatrxAccordion>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Border & Animation Styles</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <TextDivider text="Solid Borders with Enhanced Animation"/>
                                <MatrxAccordion
                                    type="single"
                                    borderStyle="solid"
                                    animationLevel="enhanced"
                                >
                                    {richAccordionItems.slice(0, 2).map((item) => (
                                        <MatrxAccordionItem key={item.value} value={item.value}>
                                            <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                            <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                        </MatrxAccordionItem>
                                    ))}
                                </MatrxAccordion>

                                <TextDivider text="No Borders with Basic Animation"/>
                                <MatrxAccordion
                                    type="single"
                                    borderStyle="none"
                                    animationLevel="basic"
                                >
                                    {richAccordionItems.slice(0, 2).map((item) => (
                                        <MatrxAccordionItem key={item.value} value={item.value}>
                                            <MatrxAccordionTrigger>{item.trigger}</MatrxAccordionTrigger>
                                            <MatrxAccordionContent>{item.content}</MatrxAccordionContent>
                                        </MatrxAccordionItem>
                                    ))}
                                </MatrxAccordion>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Special Examples</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <TextDivider text="Highlighted Items"/>
                                <MatrxAccordion type="multiple" theme="elevated">
                                    <MatrxAccordionItem value="highlight1" highlight>
                                        <MatrxAccordionTrigger>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="px-2 py-1 bg-accent text-accent-foreground rounded-md text-xs">
                                                    New
                                                </span>
                                                Highlighted Feature
                                            </div>
                                        </MatrxAccordionTrigger>
                                        <MatrxAccordionContent>
                                            <div className="p-4 bg-accent/20 rounded-lg">
                                                Special highlighted content with custom styling
                                            </div>
                                        </MatrxAccordionContent>
                                    </MatrxAccordionItem>
                                </MatrxAccordion>

                                <TextDivider text="Lazy Loaded Content"/>
                                <MatrxAccordion type="single">
                                    <MatrxAccordionItem value="lazy">
                                        <MatrxAccordionTrigger>Lazy Loaded Content</MatrxAccordionTrigger>
                                        <MatrxAccordionContent lazyLoad>
                                            <div className="space-y-4">
                                                <h3 className="font-semibold">Dynamically Loaded Content</h3>
                                                <p>This content is loaded only when the accordion is opened.</p>
                                            </div>
                                        </MatrxAccordionContent>
                                    </MatrxAccordionItem>
                                </MatrxAccordion>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DemoPage;
