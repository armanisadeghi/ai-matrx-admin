'use client';

import React from 'react';
import katex from 'katex';

interface EquationDisplayProps {
    children: string;
    className?: string;
    block?: boolean;
}

const EquationDisplay: React.FC<EquationDisplayProps> = ({ children, className, block = false }) => {
    const html = katex.renderToString(children, {
        throwOnError: false,
        displayMode: block,
    });

    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default EquationDisplay;
