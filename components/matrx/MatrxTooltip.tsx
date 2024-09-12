'use client';

import React, {useEffect, useRef} from 'react';
import {Tooltip} from 'flowbite';
import type {TooltipOptions, TooltipInterface} from 'flowbite';

interface CustomTooltipOptions extends TooltipOptions {
    offset?: number;
}

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    placement?: 'top' | 'right' | 'bottom' | 'left';
    style?: 'dark' | 'light';
    trigger?: 'hover' | 'click';
    offset?: number;
}

const MatrxTooltip: React.FC<TooltipProps> = (
    {
        content,
        children,
        placement = 'top',
        style = 'dark',
        trigger = 'hover',
        offset = 8
    }) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (triggerRef.current && tooltipRef.current) {
            const options: CustomTooltipOptions = {
                placement: placement,
                triggerType: trigger,
                offset: offset
            };

            const tooltip: TooltipInterface = new Tooltip(tooltipRef.current, triggerRef.current, options);

            return () => {
                tooltip.destroy();
            };
        }
    }, [placement, trigger, offset]);

    const tooltipClasses = `absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium transition-opacity duration-300 rounded-lg shadow-sm opacity-0 tooltip ${
        style === 'light'
            ? 'text-gray-900 bg-white border border-gray-200'
            : 'text-white bg-gray-900 dark:bg-gray-700'
    }`;

    return (
        <>
            <div ref={triggerRef}>
                {children}
            </div>
            <div id={`tooltip-${Math.random().toString(36).substr(2, 9)}`} role="tooltip" className={tooltipClasses}
                 ref={tooltipRef}>
                {content}
                <div className="tooltip-arrow" data-popper-arrow></div>
            </div>
        </>
    );
};

export default MatrxTooltip;
