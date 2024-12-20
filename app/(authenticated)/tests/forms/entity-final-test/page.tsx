// app/(authenticated)/tests/forms/entity-management-smart-fields/page.tsx
'use client'
import MergedEntityLayout from "./MergedEntityLayout";
import React from "react";
import {getUnifiedLayoutProps} from './configs';

export default function EntityManagementPage() {
    const layoutProps = getUnifiedLayoutProps({
        entityKey: 'emails',
        defaultFormComponent: 'ArmaniFormSmart',
        quickReferenceType: 'LIST',
        isExpanded: true,
        handlers: {}
    });

    return (
        <div className="flex-1 p-0 gap-0 ">
            <MergedEntityLayout
                {...layoutProps}
                className="h-full"
            />
        </div>
    );
}

