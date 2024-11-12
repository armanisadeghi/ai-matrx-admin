'use client';

import React from 'react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Link, Pencil, Upload, Calendar, Clock, Globe, Code, File, Plus} from 'lucide-react';


const actionButtonClass = "h-8 px-3 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700/50 rounded-md flex items-center gap-2";
const iconButtonClass = "h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700/50 rounded-md flex items-center justify-center";

const FormField = (
    {
        label,
        type = 'text',
        description,
        optional = false,
        value,
        onChange,
        variant = 'default',
        singleLine = false,
    }) => {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    const getModalTitle = () => {
        switch (variant) {
            case 'json':
                return 'Edit JSON';
            case 'record':
                return 'Select Record';
            case 'edit':
                return 'Edit Content';
            case 'file':
                return 'Upload File';
            case 'datetime':
                return 'Select Date & Time';
            case 'url':
                return 'Edit URL';
            case 'code':
                return 'Edit Code';
            default:
                return 'Edit Content';
        }
    };

    const renderModalContent = () => {
        switch (variant) {
            case 'json':
            case 'code':
                return (
                    <textarea
                        value={value || ''}
                        onChange={onChange}
                        className="w-full min-h-[200px] p-3 bg-gray-800 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
                    />
                );
            case 'datetime':
                return (
                    <div className="flex flex-col gap-4">
                        <div className="grid gap-2">
                            <Label>Date</Label>
                            <input
                                type="date"
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Time</Label>
                            <input
                                type="time"
                                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300"
                            />
                        </div>
                    </div>
                );
            case 'file':
                return (
                    <div className="flex flex-col gap-4">
                        <input
                            type="file"
                            className="text-gray-300"
                        />
                        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400"/>
                            <p className="mt-2 text-sm text-gray-400">Drag and drop your file here, or click to
                                browse</p>
                        </div>
                    </div>
                );
            default:
                return (
                    <textarea
                        value={value || ''}
                        onChange={onChange}
                        className="w-full min-h-[200px] p-3 bg-gray-800 border border-gray-700 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-600"
                    />
                );
        }
    };

    const renderActionButton = () => {
        const button = (
            <>
                {variant === 'json' && <><Code className="w-4 h-4"/> Edit JSON</>}
                {variant === 'record' && <><Link className="w-4 h-4"/> Select record</>}
                {variant === 'edit' && <Pencil className="w-4 h-4"/>}
                {variant === 'file' && <><Upload className="w-4 h-4"/> Upload file</>}
                {variant === 'datetime' && (
                    <div className="flex gap-1">
                        <Calendar className="w-4 h-4"/>
                        <Clock className="w-4 h-4"/>
                    </div>
                )}
                {variant === 'url' && <Globe className="w-4 h-4"/>}
                {variant === 'code' && <><Code className="w-4 h-4"/> Edit code</>}
            </>
        );

        return variant === 'edit' || variant === 'url' || variant === 'datetime' ? (
            <Button variant="ghost" size="sm" className={iconButtonClass}>
                {button}
            </Button>
        ) : (
                   <Button variant="ghost" size="sm" className={actionButtonClass}>
                       {button}
                   </Button>
               );
    };

    return (
        <div className="mb-6">
            <div className="flex items-baseline mb-1">
                <Label className="text-sm font-normal text-gray-400">{label}</Label>
                <span className="text-xs text-gray-500 ml-2">{type}</span>
            </div>

            <div className="relative">
                <div
                    className={`
            ${singleLine ? 'h-10' : 'min-h-24'} w-full bg-gray-800/50 
            border border-gray-700/50 rounded-md 
            ${isFocused ? 'ring-2 ring-gray-600 border-gray-500' : ''}
            transition-all duration-200 flex items-center
          `}
                >
                    {singleLine ? (
                        <input
                            type="text"
                            value={value || ''}
                            onChange={onChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            placeholder="NULL"
                            className="w-full h-full px-3 bg-transparent text-gray-300 focus:outline-none"
                        />
                    ) : (
                         <textarea
                             value={value || ''}
                             onChange={onChange}
                             onFocus={handleFocus}
                             onBlur={handleBlur}
                             placeholder="NULL"
                             className="w-full h-full min-h-[96px] p-3 bg-transparent text-gray-300 focus:outline-none resize-none"
                         />
                     )}

                    {variant !== 'default' && (
                        <div className="absolute right-2 flex items-center h-full">
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    {renderActionButton()}
                                </DialogTrigger>
                                <DialogContent className="bg-gray-900 text-white">
                                    <DialogHeader>
                                        <DialogTitle>{getModalTitle()}</DialogTitle>
                                    </DialogHeader>
                                    {renderModalContent()}
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>
            </div>

            {description && (
                <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}

            {optional && (
                <div className="mt-2">
                    <h4 className="text-sm text-gray-400">Optional Fields</h4>
                    <p className="text-xs text-gray-500">These are columns that do not need any value</p>
                </div>
            )}
        </div>
    );
};

// Example usage component
const ExampleForm = () => {
    const [formData, setFormData] = React.useState({
        name: '',
        rf_id: '',
        description: '',
        file: '',
        datetime: '',
        website: '',
        code: '',
        input_params: '',
        output_options: ''
    });

    const handleChange = (field) => (e) => {
        setFormData(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    return (
        <div className="p-6 bg-gray-900 text-white max-w-2xl">
            <FormField
                label="name"
                type="varchar"
                description="This is a varchar field"
                value={formData.name}
                onChange={handleChange('name')}
                singleLine
            />

            <FormField
                label="rf_id"
                type="uuid"
                description="This is a UUID field"
                value={formData.rf_id}
                onChange={handleChange('rf_id')}
                variant="record"
                singleLine
            />

            <FormField
                label="description"
                type="text"
                description="This is a text field"
                value={formData.description}
                onChange={handleChange('description')}
                variant="edit"
                optional
            />

            <FormField
                label="file"
                type="file"
                description="This is a file field"
                value={formData.file}
                onChange={handleChange('file')}
                variant="file"
                singleLine
            />

            <FormField
                label="datetime"
                type="datetime"
                description="This is a datetime field"
                value={formData.datetime}
                onChange={handleChange('datetime')}
                variant="datetime"
                singleLine
            />

            <FormField
                label="website"
                type="url"
                description="This is a URL field"
                value={formData.website}
                onChange={handleChange('website')}
                variant="url"
                singleLine
            />

            <FormField
                label="code"
                type="text"
                description="This is a code field"
                value={formData.code}
                onChange={handleChange('code')}
                variant="code"
            />

            <FormField
                label="input_params"
                type="jsonb"
                description="This is a JSON field"
                value={formData.input_params}
                onChange={handleChange('input_params')}
                variant="json"
                optional
            />

            <FormField
                label="output_options"
                type="jsonb"
                description="This is a JSON field"
                value={formData.output_options}
                onChange={handleChange('output_options')}
                variant="json"
                optional
            />

            <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" className="text-gray-300 border-gray-700">
                    Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700">
                    Save
                </Button>
            </div>
        </div>
    );
};

export default ExampleForm;
