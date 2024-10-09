'use client';

import React, { useState } from 'react';
import {
    IconAdjustmentsBolt,
    IconCloud,
    IconCurrencyDollar,
    IconEaseInOut,
    IconHeart,
    IconHelp,
    IconRouteAltLeft,
    IconFunction,
    IconArrowLeft,
    IconDatabase,
    IconPlus,
    IconPencil,
    IconTrash,
    IconCode,
    IconRefresh
} from "@tabler/icons-react";
import DatabaseInteractions from "@/app/(authenticated)/admin/schema-manager/components/DatabaseInteractions";
import SchemaAdmin from "@/app/(authenticated)/admin/schema-manager/components/SchemaAdmin";
import SchemaInteractions from "@/app/(authenticated)/admin/schema-manager/components/SchemaInteractions";
import FeatureSectionAnimatedGradientComponents from "@/components/animated/my-custom-demos/feature-section-animated-gradient-component";
import {Layers3} from "lucide-react";
import FetchOperations from "@/components/matrx/schema/ops/FetchOperations";
import CreateOperationJson from "@/components/matrx/schema/ops/CreateFromJson";
import UpdateOperation from "@/components/matrx/schema/ops/UpdateOperation";
import DeleteOperation from "@/components/matrx/schema/ops/DeleteOperation";
import PaginatedFetch from "@/components/matrx/schema/ops/PaginatedFetch";
import CustomQuery from "@/components/matrx/schema/ops/CustomQuery";
import RealtimeSubscription from "@/components/matrx/schema/ops/RealtimeSubscription";
import CreateOperation from "@/components/matrx/schema/ops/CreateOperation";


export default function AdminPage() {
    const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

    const features = [
        {
            title: "Database Interactions",
            description: "Manage database interactions.",
            icon: <IconAdjustmentsBolt />,
            component: <DatabaseInteractions />,
        },
        {
            title: "Schema Admin",
            description: "Administer database schemas.",
            icon: <IconFunction />,
            component: <SchemaAdmin />,
        },
        {
            title: "Schema Interactions",
            description: "Interact with database schemas.",
            icon: <IconEaseInOut />,
            component: <SchemaInteractions />,
        },
        {
            title: "Fetch Operations",
            description: "Test fetch operations on the database.",
            icon: <IconDatabase />,
            component: <FetchOperations />,
        },
        {
            title: "Create Operation",
            description: "Test create operation on the database.",
            icon: <IconPlus />,
            component: <CreateOperation />,
        },
        {
            title: "Create With JSON Operation",
            description: "Test create operation on the database using a JSON.",
            icon: <IconPlus />,
            component: <CreateOperationJson />,
        },
        {
            title: "Update Operation",
            description: "Test update operation on the database.",
            icon: <IconPencil />,
            component: <UpdateOperation />,
        },
        {
            title: "Delete Operation",
            description: "Test delete operation on the database.",
            icon: <IconTrash />,
            component: <DeleteOperation />,
        },
        {
            title: "Paginated Fetch",
            description: "Test paginated fetch from the database.",
            icon: <Layers3 />,
            component: <PaginatedFetch />,
        },
        {
            title: "Custom Query",
            description: "Execute custom queries on the database.",
            icon: <IconCode />,
            component: <CustomQuery />,
        },
        {
            title: "Realtime Subscription",
            description: "Test realtime subscriptions to database changes.",
            icon: <IconRefresh />,
            component: <RealtimeSubscription />,
        },
    ];

    const handleSelectComponent = (title: string) => {
        setSelectedComponent(title);
    };

    const handleBackToSelection = () => {
        setSelectedComponent(null);
    };

    if (selectedComponent) {
        const selectedFeature = features.find(f => f.title === selectedComponent);
        return (
            <div className="py-20 lg:py-40 bg-neutral-100 dark:bg-neutral-900">
                <div className="max-w-7xl mx-auto">
                    <button
                        onClick={handleBackToSelection}
                        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <IconArrowLeft className="mr-2" /> Back to Selection
                    </button>
                    <h2 className="text-2xl font-bold mb-4">{selectedComponent}</h2>
                    {selectedFeature?.component}
                </div>
            </div>
        );
    }

    return (
        <div className="py-20 lg:py-40 bg-neutral-100 dark:bg-neutral-900">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 max-w-7xl mx-auto">
                {features.map((feature, index) => (
                    <FeatureSectionAnimatedGradientComponents
                        key={feature.title}
                        {...feature}
                        index={index}
                        onClick={() => handleSelectComponent(feature.title)}
                    />
                ))}
            </div>
        </div>
    );
}
