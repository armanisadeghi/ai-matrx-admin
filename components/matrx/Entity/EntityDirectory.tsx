// components/matrx/SchemaTable/EntityDirectory.tsx
'use client';

import Link from 'next/link';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectFormattedEntityOptions } from '@/lib/redux/schema/globalCacheSelectors';
import { ArrowRight, Database } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {getEntityIcon} from "@/components/matrx/Entity/utils/getEntityIcon";


const EntityDirectory = () => {
    const entityOptions = useAppSelector(selectFormattedEntityOptions);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entityOptions.map(({ value, label }) => {
                const Icon = getEntityIcon(label);
                return (
                    <Link
                        key={value}
                        href={`/entity-crud/${value}?prettyName=${encodeURIComponent(label)}`}
                        className="transition-transform hover:-translate-y-1"
                    >
                        <Card className="h-full hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <CardTitle className="text-xl">{label}</CardTitle>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="line-clamp-2">
                                    Manage and view all {label.toLowerCase()} data
                                </CardDescription>
                                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                                    <Database className="h-4 w-4 mr-2" />
                                    View Records
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
};

export default EntityDirectory;
