// app/(authenticated)/tests/forms/entity-management-smart-fields/page.tsx
import {Metadata} from 'next';
import MergedEntityLayout from "./MergedEntityLayout";
import React from "react";
import {getUnifiedLayoutProps} from './configs';

export const metadata: Metadata = {
    title: 'Entity Smart Layout',
    description: 'Manage and edit entities with a predefined layout',
};

export default async function EntityManagementPage() {
    const layoutProps = getUnifiedLayoutProps({
        entityKey: 'registeredFunction',
        defaultFormComponent: 'ArmaniFormSmart',
        quickReferenceType: 'LIST',
        isExpanded: true,
        handlers: {}
    });

    console.log('EntityManagementPage: layoutProps:', layoutProps);

    return (
        <div className="flex-1 p-0 gap-0 ">
            <MergedEntityLayout
                {...layoutProps}
                className="h-full"
            />
        </div>
    );
}

