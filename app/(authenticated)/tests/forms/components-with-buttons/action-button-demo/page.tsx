'use client';

import React from 'react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {Label} from '@/components/ui/label';
import {Link, Pencil, Upload, Calendar, Clock, Globe, Code} from 'lucide-react';

// Common styles for action buttons
const actionButtonClass = "h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center gap-2";
const iconButtonClass = "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-border rounded-md flex items-center justify-center";

// Example of a simpler component with an action button
const InputWithAction = ({
                             label,
                             value,
                             onChange,
                             onAction,
                             variant = 'edit',
                             placeholder = "Enter text..."
                         }) => {
    return (
        <div className="relative">
            <Label>{label}</Label>
            <div className="mt-1 flex items-center">
                <input
                    type="text"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full h-10 px-3 bg-input/50 border border-border rounded-md text-foreground"
                />
                <div className="absolute right-2">
                    {variant === 'edit' && (
                        <Button variant="ghost" size="sm" onClick={onAction} className={iconButtonClass}>
                            <Pencil className="w-4 h-4"/>
                        </Button>
                    )}
                    {variant === 'link' && (
                        <Button variant="ghost" size="sm" onClick={onAction} className={actionButtonClass}>
                            <Link className="w-4 h-4"/> Select record
                        </Button>
                    )}
                    {variant === 'code' && (
                        <Button variant="ghost" size="sm" onClick={onAction} className={actionButtonClass}>
                            <Code className="w-4 h-4"/> Edit code
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Example of a component with a modal action
const InputWithModal = ({
                            label,
                            value,
                            onChange,
                            variant = 'edit',
                            modalTitle = "Edit Content",
                            modalContent
                        }) => {
    return (
        <div className="relative">
            <Label>{label}</Label>
            <div className="mt-1 flex items-center">
                <input
                    type="text"
                    value={value}
                    onChange={onChange}
                    className="w-full h-10 px-3 bg-input/50 border border-border rounded-md text-foreground"
                />
                <div className="absolute right-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className={
                                variant === 'edit' ? iconButtonClass : actionButtonClass
                            }>
                                {variant === 'edit' && <Pencil className="w-4 h-4"/>}
                                {variant === 'link' && <><Link className="w-4 h-4"/> Select record</>}
                                {variant === 'code' && <><Code className="w-4 h-4"/> Edit code</>}
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{modalTitle}</DialogTitle>
                            </DialogHeader>
                            {modalContent}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
};

// Demo component showing different ways to use action buttons
const ActionButtonDemo = () => {
    const [values, setValues] = React.useState({
        simple: '',
        withModal: '',
        code: '',
        link: ''
    });

    const handleChange = (field) => (e) => {
        setValues(prev => ({
            ...prev,
            [field]: e.target.value
        }));
    };

    return (
        <div className="space-y-6 p-4 bg-background text-foreground">
            <h2 className="text-lg font-semibold mb-4">Action Button Pattern Examples</h2>

            {/* Simple action button */}
            <InputWithAction
                label="Simple Edit Button"
                value={values.simple}
                onChange={handleChange('simple')}
                onAction={() => alert('Edit clicked')}
                variant="edit"
            />

            {/* Action button with modal */}
            <InputWithModal
                label="Edit with Modal"
                value={values.withModal}
                onChange={handleChange('withModal')}
                modalTitle="Edit Content"
                modalContent={
                    <textarea
                        className="w-full min-h-[200px] p-3 bg-input border border-border rounded-md"
                        value={values.withModal}
                        onChange={handleChange('withModal')}
                    />
                }
            />

            {/* Code editor button */}
            <InputWithModal
                label="Code Editor"
                value={values.code}
                onChange={handleChange('code')}
                variant="code"
                modalTitle="Edit Code"
                modalContent={
                    <textarea
                        className="w-full min-h-[200px] p-3 font-mono bg-input border border-border rounded-md"
                        value={values.code}
                        onChange={handleChange('code')}
                    />
                }
            />

            {/* Link selector button */}
            <InputWithModal
                label="Record Selector"
                value={values.link}
                onChange={handleChange('link')}
                variant="link"
                modalTitle="Select Record"
                modalContent={
                    <div className="space-y-2">
                        <Button className="w-full justify-start" variant="ghost">Record 1</Button>
                        <Button className="w-full justify-start" variant="ghost">Record 2</Button>
                        <Button className="w-full justify-start" variant="ghost">Record 3</Button>
                    </div>
                }
            />
        </div>
    );
};

export default ActionButtonDemo;
