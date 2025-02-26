import React, { ReactNode, useState } from 'react';
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui';

interface AccordionWrapperProps {
    children: ReactNode;
    title: string;
    value: string;
    rightElement?: ReactNode;
    defaultOpen?: boolean;
}

const StatePersistingAccordionWrapper = ({
    children,
    title,
    value,
    rightElement,
    defaultOpen = false
}: AccordionWrapperProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    const handleValueChange = (openValue: string) => {
        setIsOpen(openValue === value);
    };

    return (
        <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue={defaultOpen ? value : undefined}
            onValueChange={handleValueChange}
        >
            <AccordionItem value={value} className="border-b border-b-border">
                <div className="flex items-center justify-between">
                    <AccordionTrigger className="flex-1">{title}</AccordionTrigger>
                    {rightElement && (
                        <div className="pr-4">
                            {rightElement}
                        </div>
                    )}
                </div>
                <div 
                    className={`overflow-hidden ${isOpen ? 'animate-smooth-drop' : 'animate-smooth-lift'}`}
                    style={{ 
                        height: isOpen ? 'auto' : '0',
                        opacity: isOpen ? 1 : 0,
                        pointerEvents: isOpen ? 'auto' : 'none',
                    }}
                >
                    <div className="pt-0 pb-4">
                        <div className="space-y-4 pt-2">
                            {children}
                        </div>
                    </div>
                </div>
            </AccordionItem>
        </Accordion>
    );
};

export default StatePersistingAccordionWrapper;