// ModeSwitcher.tsx
import React from 'react';
import { Eye, Edit, Plus } from 'lucide-react';
import { ViewModeOptions } from './types';
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { MatrxButton, ButtonGroup } from '@/components/ui/samples';

interface ModeSwitcherProps {
    matrxRecordId: MatrxRecordId;
    onModeChange: (mode: ViewModeOptions, recordId?: MatrxRecordId) => void;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ matrxRecordId, onModeChange }) => (
    <ButtonGroup size="sm" variant="outline" className="ml-auto">
        <MatrxButton
            onClick={() => onModeChange('view', matrxRecordId)}
        >
            <Eye className="h-4 w-4 mr-1"/>
            View
        </MatrxButton>
        <MatrxButton
            onClick={() => onModeChange('edit', matrxRecordId)}
        >
            <Edit className="h-4 w-4 mr-1"/>
            Edit
        </MatrxButton>
        <MatrxButton
            onClick={() => onModeChange('create')}
        >
            <Plus className="h-4 w-4 mr-1"/>
            New
        </MatrxButton>
    </ButtonGroup>
);
