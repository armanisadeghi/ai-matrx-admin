'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Settings, X } from 'lucide-react';
import SmartButtonBase from './SmartButtonBase';
import { SmartButtonProps } from '../types';
import { MatrxRecordId } from '@/types';
import EntityRecordSheet from '@/app/entities/layout/EntityRecordSheet';


export const SmartAdvancedButton = ({ 
    entityKey, 
    recordId,
    size = 'default',
    unifiedLayoutProps,
    forceEnable,
}: SmartButtonProps) => {
    const [sheetStates, setSheetStates] = useState<Record<string, boolean>>({});

    const toggleSheet = (recordId: MatrxRecordId) => {
        setSheetStates((prev) => ({
            ...prev,
            [recordId]: !prev[recordId],
        }));
    };

    const isDisabled = false;

    return (
        <>
            <SmartButtonBase
                entityKey={entityKey}
                onClick={() => toggleSheet(recordId)}
                disabled={isDisabled}
                size={size}
                variant='outline'
                forceEnable={forceEnable}
                >
                <Settings className='h-4 w-4' />
                Advanced
            </SmartButtonBase>
            <EntityRecordSheet
                className='w-full'
                selectedEntity={entityKey}
                recordId={recordId}
                unifiedLayoutProps={unifiedLayoutProps}
                updateKey={0}
                open={sheetStates[recordId]}
                onOpenChange={(open) => setSheetStates((prev) => ({ ...prev, [recordId]: open }))}
                title='Advanced Settings'
                size='xl'
            />
        </>
    );
};

SmartAdvancedButton.displayName = 'SmartAdvancedButton';

export default SmartAdvancedButton;
