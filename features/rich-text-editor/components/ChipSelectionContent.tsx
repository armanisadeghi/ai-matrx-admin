// ChipSelectionContent.tsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import ColorSelection from './ColorSelection';
import { ChipData, ChipRequestOptions, ColorOption, EditorState } from '../types';
import { EditorHookResult } from '../hooks/useEditor';
import { EditorContextValue } from '../provider/new/EditorProvider';

interface ChipSelectionContentProps {
    editorId: string;
    editorHook: EditorHookResult;
    editorContext: {
        context: EditorContextValue;
        editorState: EditorState;
    };
    initialChipData: ChipData;
    colorOptions: ColorOption[];
    isSelectionMode: boolean;
    onSave: (chipData: ChipRequestOptions) => void;
    onCancel: () => void;
}

interface FormData {
    displayName: string;
    sourceType: string;
    userInputType?: string;
    color: string;
    description: string;
    editedContent: string;
}

const ChipSelectionContent: React.FC<ChipSelectionContentProps> = ({
    initialChipData,
    colorOptions,
    isSelectionMode,
    onSave,
    onCancel
}) => {
    const [activeTab, setActiveTab] = useState('new');
    const [formData, setFormData] = useState<FormData>({
        displayName: initialChipData.label,
        sourceType: 'userInput',
        color: initialChipData.color,
        description: '',
        editedContent: initialChipData.stringValue || ''
    });

    const handleSave = () => {
        onSave({
            label: formData.displayName,
            stringValue: formData.editedContent,
            color: formData.color
        });
    };


    return (
        <div className="flex h-[600px] gap-4">
            {/* Left Side - Form Content */}
            <div className="w-1/2 flex flex-col">
                <Tabs defaultValue="new" value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="new">New Broker</TabsTrigger>
                        <TabsTrigger value="existing">Existing Broker</TabsTrigger>
                        <TabsTrigger value="none">No Broker</TabsTrigger>
                    </TabsList>

                    <div className="mt-4 space-y-4 h-[calc(100%-40px)] overflow-y-auto">
                        <TabsContent value="new" className="m-0">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium">Display Name</label>
                                    <Input 
                                        value={formData.displayName}
                                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                                        placeholder="Enter display name"
                                    />
                                </div>

                                <ColorSelection
                                    options={colorOptions}
                                    selectedColor={formData.color}
                                    onChange={(color) => setFormData({...formData, color})}
                                />
                                
                                <div>
                                    <label className="text-sm font-medium">Default Source</label>
                                    <Select 
                                        value={formData.sourceType}
                                        onValueChange={value => setFormData({...formData, sourceType: value})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select source type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="userInput">User Input</SelectItem>
                                            <SelectItem value="database">Database</SelectItem>
                                            <SelectItem value="api">API</SelectItem>
                                            <SelectItem value="function">Function</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Source-specific options */}
                                {formData.sourceType === 'function' && (
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Function" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="placeholder1">Function 1</SelectItem>
                                            <SelectItem value="placeholder2">Function 2</SelectItem>
                                            <SelectItem value="placeholder3">Function 3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}

                                <div>
                                    <label className="text-sm font-medium">Description/Tooltip</label>
                                    <Textarea 
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        placeholder="Enter description or tooltip text"
                                        className="min-h-[80px]"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="existing" className="m-0">
                            <div className="min-h-[400px] flex items-center justify-center text-neutral-500">
                                Broker list will be integrated here
                            </div>
                        </TabsContent>

                        <TabsContent value="none" className="m-0">
                            <div className="min-h-[400px] flex items-center justify-center text-neutral-500">
                                No broker will be associated with this chip.
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSave}>Create Chip</Button>
                </div>
            </div>

            {/* Right Side - Text Content */}
            <div className="w-1/2 flex flex-col">
                <label className="text-sm font-medium mb-2">Chip Content</label>
                <Textarea
                    value={formData.editedContent}
                    onChange={e => setFormData({...formData, editedContent: e.target.value})}
                    className="flex-1 font-mono text-sm whitespace-pre resize-none"
                    placeholder="Enter chip content"
                />
            </div>
        </div>
    );
};

export default ChipSelectionContent;