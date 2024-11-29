// components/matrx/Entity/prewired-components/layouts/EntityLayoutStateWrapper.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import { EntityError } from '@/lib/redux/entity/types/stateTypes';

interface EntityLayoutStateProps {
    children: (state: {
        selectedEntity: EntityKeys | null;
        error: EntityError | null;
        isExpanded: boolean;
        hasSelection: boolean;
        recordLabel: string;
        selectHeight: number;
        rightColumnRef: React.RefObject<HTMLDivElement>;
        handlers: {
            setIsExpanded: (value: boolean) => void;
            handleEntityChange: (value: EntityKeys) => void;
            onCreateEntityClick: () => void;
            handleRecordLoad: (record: EntityData<EntityKeys>) => void;
            handleError: (error: EntityError) => void;
            handleRecordLabelChange: (label: string) => void;
            setError: (error: EntityError | null) => void;
        };
    }) => React.ReactNode;
}

export const EntityLayoutStateWrapper: React.FC<EntityLayoutStateProps> = ({ children }) => {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);
    const [error, setError] = useState<EntityError | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasSelection, setHasSelection] = useState(false);
    const [recordLabel, setRecordLabel] = useState<string>('Select Record');
    const [selectHeight, setSelectHeight] = useState<number>(0);
    const rightColumnRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (rightColumnRef.current) {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setSelectHeight(entry.contentRect.height);
                }
            });

            observer.observe(rightColumnRef.current);
            return () => observer.disconnect();
        }
    }, []);

    const handlers = {
        setIsExpanded,
        handleEntityChange: (value: EntityKeys) => {
            setSelectedEntity(value);
            setHasSelection(false);
            setRecordLabel('Select Record');
        },
        onCreateEntityClick: () => {
            setSelectedEntity(null);
            setHasSelection(false);
            setRecordLabel('Create New Record');
            setIsExpanded(false);
        },
        handleRecordLoad: (record: EntityData<EntityKeys>) => {
            setHasSelection(true);
        },
        handleError: (error: EntityError) => {
            setError(error);
        },
        handleRecordLabelChange: (label: string) => {
            setRecordLabel(label);
        },
        setError
    };

    return children({
        selectedEntity,
        error,
        isExpanded,
        hasSelection,
        recordLabel,
        selectHeight,
        rightColumnRef,
        handlers
    });
};
