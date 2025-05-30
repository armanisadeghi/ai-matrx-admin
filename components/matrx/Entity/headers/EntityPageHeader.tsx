// components/matrx/Entity/headers/EntityPageHeader.tsx
'use server';

import {CardHeader, CardTitle} from "@/components/ui/card";
import {getEntityIcon} from "@/components/matrx/Entity/utils/getEntityIcon";
import {EntityKeys} from "@/types/entityTypes";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import { formatName } from "@/utils/formatName";

interface EntityHeaderBaseProps {
    entityName: EntityKeys;
    entityPrettyName?: string;
    backUrl?: string;
    backLabel?: string;
}

interface EntityRecordHeaderProps extends EntityHeaderBaseProps {
    primaryKeyField: string;
    primaryKeyValue: string;
    fieldPrettyName?: string;
}

export async function EntityHeader(
    {
        entityName,
        entityPrettyName,
        backUrl,
        backLabel
    }: EntityHeaderBaseProps) {
    const Icon = getEntityIcon(entityPrettyName || entityName);
    const displayName = entityPrettyName || formatName(entityName);

    return (
        <CardHeader className="border-b bg-card">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold">
                            {displayName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage and view {displayName.toLowerCase()} records
                        </p>
                    </div>
                </div>
                {backUrl && (
                    <Link
                        href={backUrl}
                        className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1"/>
                        {backLabel || 'Back'}
                    </Link>
                )}
            </div>
        </CardHeader>
    );
}

export async function EntityRecordHeader(
    {
        entityName,
        entityPrettyName,
        primaryKeyField,
        primaryKeyValue,
        fieldPrettyName,
        backUrl,
        backLabel
    }: EntityRecordHeaderProps) {
    const Icon = getEntityIcon(entityPrettyName || entityName);
    const displayName = entityPrettyName || formatName(entityName);
    const displayFieldName = fieldPrettyName || formatName(primaryKeyField);

    return (
        <CardHeader className="border-b bg-card">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold">
                            {displayName} Record
                        </CardTitle>
                        <p className="text-sm font-medium mt-1">
                            {displayFieldName}: {primaryKeyValue}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            View and edit {displayName.toLowerCase()} record details
                        </p>
                    </div>
                </div>
                {backUrl && (
                    <Link
                        href={backUrl}
                        className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1"/>
                        {backLabel || `Back to ${displayName} Table`}
                    </Link>
                )}
            </div>
        </CardHeader>
    );
}
