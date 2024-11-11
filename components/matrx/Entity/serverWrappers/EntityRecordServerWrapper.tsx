'use client';

import React, {Suspense} from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {FormLoadingTwoColumn} from "@/components/matrx/LoadingComponents";
import {useEntityRecordOld} from '@/lib/redux/entity/hooks/useEntityRecordOld';
import EntityFormWrapper from "@/components/matrx/Entity/form/EntityFormWrapper";
import {formatName} from "@/utils/formatName";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui";
import {ArrowLeft, Database, ChevronRight} from "lucide-react";
import Link from "next/link";

interface EntityRecordServerWrapperProps {
    entityName: EntityKeys;
    primaryKeyField: string;
    primaryKeyValue: string;
    entityPrettyName?: string;
    entityFieldPrettyName?: string;
}

function EntityRecordServerWrapper(
    {
        entityName,
        primaryKeyField,
        primaryKeyValue,
    }: EntityRecordServerWrapperProps) {
    const {entity, error, isLoading} = useEntityRecordOld(
        entityName,
        primaryKeyField,
        primaryKeyValue,
    );

    if (isLoading) {
        return <FormLoadingTwoColumn/>;
    }

    if (error) {
        return (
            <div className="p-4 text-red-500">
                Error: {error.message}
                {error.details && (
                    <div className="mt-2 text-sm">
                        {error.details.toString()}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Suspense fallback={<FormLoadingTwoColumn/>}>
            <EntityFormWrapper entity={entity} entityName={entityName}/>
        </Suspense>
    );
}

export default EntityRecordServerWrapper;
