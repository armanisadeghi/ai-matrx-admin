// app/math/page.tsx
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { problemsData } from './local-data/sample-data';
import { BackgroundGradient } from '@/components/ui';
import { Cover } from "@/components/ui/cover";
import { cn } from "@/lib/utils";

export default function MathProblemSelectionPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <h1 className="text-4xl md:text-4xl lg:text-6xl font-semibold w-full text-center py-6 bg-clip-text text-transparent bg-gradient-to-b from-neutral-800 via-neutral-700 to-neutral-700 dark:from-neutral-800 dark:via-white dark:to-white">
                Algebra: <Cover>Foundations of Algebra</Cover>
            </h1>
            <div className="container mx-auto grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
                {problemsData.map((problem) => (
                    <Link href={`/tests/math/${problem.id}`} key={problem.id} className="group">
                        <BackgroundGradient containerClassName={cn("p-[2px]")}>
                            <Card className="h-full bg-card group-hover:bg-background transition-colors">
                                <CardHeader>
                                    <CardTitle className="line-clamp-2 min-h-[3rem]">{problem.title}</CardTitle>
                                    <CardDescription>Less than 5 minutes.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-md line-clamp-2 min-h-[3rem]">{problem.description}</p>
                                </CardContent>
                            </Card>
                        </BackgroundGradient>
                    </Link>
                ))}
            </div>
        </div>
    );
}
