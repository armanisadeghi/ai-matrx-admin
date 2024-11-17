'use client';

import React, {Suspense} from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {FormLoadingTwoColumn} from "@/components/matrx/LoadingComponents";
import EntityFormWrapper from "@/components/matrx/Entity/form/EntityFormWrapper";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui";
import {ArrowLeft, Database, ChevronRight} from "lucide-react";
import Link from "next/link";
import {useEntityForm} from "@/lib/redux/entity/hooks/useEntityForm";

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
    const entityFormState = useEntityForm(entityName,);


    if (entityFormState.isLoading) {
        return <FormLoadingTwoColumn/>;
    }

    if (entityFormState.hasError) {
        return (
            <div className="p-4 text-red-500">
                Error: {entityFormState.errorState.message}
                {entityFormState.errorState.details && (
                    <div className="mt-2 text-sm">
                        {entityFormState.errorState.details.toString()}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Suspense fallback={<FormLoadingTwoColumn/>}>
            <EntityFormWrapper entityFormState={entityFormState} entityName={entityName}/>
        </Suspense>
    );
}

export default EntityRecordServerWrapper;
