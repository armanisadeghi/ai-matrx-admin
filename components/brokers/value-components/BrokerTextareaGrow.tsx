import React, { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { withBrokerComponentWrapper } from "../wrappers/withBrokerComponentWrapper";

export const BrokerTextareaGrow = withBrokerComponentWrapper(({ 
    value, 
    onChange, 
    inputComponent,
    isDemo,
    ...rest
}) => {
    const textareaRef = useRef(null);
    const className = inputComponent.componentClassName;
    const handleChange = (e) => {
        const newValue = e.target.value;
        
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
        
        onChange(newValue);
    };

    const rawSize = inputComponent.minHeight || 'default';
    const size = rawSize === 'default' ? 'm' : 
                 (rawSize === '3xs' || rawSize === '2xs' || rawSize === 'xs') ? 'xs' : 
                 rawSize;

    const textareaClassName = cn(
        "resize-none w-full",
        {
            'min-h-[72px]': size === 'xs',
            'min-h-[96px]': size === 's',
            'min-h-[144px]': size === 'm',
            'min-h-[192px]': size === 'l',
            'min-h-[288px]': size === 'xl',
            'min-h-[384px]': size === '2xl',
            'min-h-[576px]': size === '3xl',
            'min-h-[768px]': size === '4xl',
            'min-h-[90vh]': size === '5xl',
        }
    );

    return (
        <div className={cn('space-y-1', className)}>
            <Textarea
                ref={textareaRef}
                value={value ?? ''}
                onChange={handleChange}
                onInput={handleChange}
                rows={1}
                placeholder={inputComponent.placeholder}
                className={cn(textareaClassName, className)}
            />
        </div>
    );
});

export default BrokerTextareaGrow;