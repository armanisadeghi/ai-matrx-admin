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
    const defaultEntityKey = 'recipe';
    return (
        <div className="flex-1 p-0 gap-0">
            <EntitySmartLayout
                entityKey={defaultEntityKey}
                componentOptions={DEFAULT_FORM_COMPONENT_OPTIONS}
                formStyleOptions={DEFAULT_FORM_STYLE_OPTIONS}
                inlineEntityOptions={DEFAULT_INLINE_ENTITY_OPTIONS}
                dynamicStyleOptions={DEFAULT_DYNAMIC_STYLE_OPTIONS}
                className="h-full"
            />
        </div>
    );
}

/*
App Root
├── Layout (border-red-500)
│   ├── ModuleHeader (sticky)
│   ├── MatrxDynamicPanel
│   └── Main Container (border-blue-500)
│       └── Page Container (border-green-500)
│           └── EntitySmartLayout Container (border-purple-500)
│               └── SmartLayoutSideBySide (border-orange-500)
│                   ├── Left Column (border-yellow-500)
│                   │   ├── Entity Selection Card (border-pink-500)
│                   │   │   ├── Header
│                   │   │   └── Content
│                   │   └── Quick Reference Card (border-cyan-500)
│                   │       ├── Header
│                   │       └── Content (ScrollArea)
│                   └── Right Column (border-emerald-500)
│                       └── Form Card (border-indigo-500)
│                           ├── Expand Button
│                           └── Content (ScrollArea)
*/
