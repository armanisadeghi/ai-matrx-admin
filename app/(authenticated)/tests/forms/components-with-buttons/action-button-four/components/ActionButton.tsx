// components/ActionButton.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link, Pencil, Upload, Calendar, Clock, Globe, Code } from 'lucide-react';
import { actionButtonClass, iconButtonClass } from '../constants';
import { FormVariant } from '../types';

interface ActionButtonProps {
    variant: FormVariant;
}

const ActionButton: React.FC<ActionButtonProps> = ({ variant }) => {
    const getButtonContent = () => {
        switch (variant) {
            case 'json': return <><Code className="w-4 h-4"/> Edit JSON</>;
            case 'record': return <><Link className="w-4 h-4"/> Select record</>;
            case 'edit': return <Pencil className="w-4 h-4"/>;
            case 'file': return <><Upload className="w-4 h-4"/> Upload file</>;
            case 'datetime': return (
                <div className="flex gap-1">
                    <Calendar className="w-4 h-4"/>
                    <Clock className="w-4 h-4"/>
                </div>
            );
            case 'url': return <Globe className="w-4 h-4"/>;
            case 'code': return <><Code className="w-4 h-4"/> Edit code</>;
            default: return null;
        }
    };

    const isIconOnly = ['edit', 'url', 'datetime'].includes(variant);
    const buttonClass = isIconOnly ? iconButtonClass : actionButtonClass;

    return (
        <Button variant="ghost" size="sm" className={buttonClass}>
            {getButtonContent()}
        </Button>
    );
};

export default ActionButton;
