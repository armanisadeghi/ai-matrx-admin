// app/math/page.tsx
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { problemsData } from './local-data/sample-data';

export default function MathProblemSelectionPage() {
    return (
        <div className="container mx-auto grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {problemsData.map((problem) => (
                <Link href={`/tests/math/${problem.id}`} key={problem.id}>
                    <Card className="h-full hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle>{problem.title}</CardTitle>
                            <CardDescription>{problem.topicName}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-md">{problem.description}</p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
