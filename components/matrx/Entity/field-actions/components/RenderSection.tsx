// components/RenderSection.tsx
'use client';
import React, { ReactNode } from 'react';
import { useFieldActionContext } from '../hooks/useFieldActionContext';

interface RenderSectionProps {
    id: string;
    className?: string;
    fallback?: ReactNode;
}

export const RenderSection: React.FC<RenderSectionProps> = ({ id, className, fallback }) => {
    const { state } = useFieldActionContext();
    const sectionContent = state.sections[id]?.content || [];

    return (
        <div className={className}>
            {sectionContent.length > 0 ? sectionContent : fallback}
        </div>
    );
};
