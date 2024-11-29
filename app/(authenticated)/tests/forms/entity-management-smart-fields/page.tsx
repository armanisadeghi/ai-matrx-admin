// app/(authenticated)/tests/forms/entity-management-smart-fields/page.tsx
import { Metadata } from 'next';
import EntitySmartLayout from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/EntitySmartLayout";
import React from "react";
import {
    DEFAULT_DYNAMIC_STYLE_OPTIONS,
    DEFAULT_FORM_COMPONENT_OPTIONS,
    DEFAULT_FORM_STYLE_OPTIONS,
    DEFAULT_INLINE_ENTITY_OPTIONS
} from './configs';

export const metadata: Metadata = {
    title: 'Entity Smart Layout',
    description: 'Manage and edit entities with a predefined layout',
};

export default async function EntityManagementPage() {
    return (
        <div className="flex-1">
            <EntitySmartLayout
                componentOptions={DEFAULT_FORM_COMPONENT_OPTIONS}
                formStyleOptions={DEFAULT_FORM_STYLE_OPTIONS}
                inlineEntityOptions={DEFAULT_INLINE_ENTITY_OPTIONS}
                dynamicStyleOptions={DEFAULT_DYNAMIC_STYLE_OPTIONS}
                className="h-full"
            />
        </div>
    );
}
