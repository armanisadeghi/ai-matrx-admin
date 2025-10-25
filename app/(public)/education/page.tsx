import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EducationPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
            <div className="max-w-4xl w-full space-y-8 text-center">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="rounded-full bg-primary/10 p-6">
                        <BookOpen className="w-16 h-16 text-primary" />
                    </div>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-800 via-neutral-700 to-neutral-700 dark:from-neutral-800 dark:via-white dark:to-white">
                    Education Center
                </h1>

                {/* Subheading */}
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                    Coming Soon
                </p>

                {/* Description */}
                <p className="text-base md:text-lg text-muted-foreground/80 max-w-2xl mx-auto">
                    We&apos;re preparing comprehensive educational content, tutorials, and resources to help you make the most of AI Matrx. 
                    Check back soon for guides, best practices, and learning materials.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                    <Link href="/">
                        <Button
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button className="flex items-center gap-2">
                            Go to Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Additional Info */}
                <div className="pt-8 border-t border-border max-w-2xl mx-auto">
                    <p className="text-sm text-muted-foreground">
                        Have questions or need help in the meantime?{' '}
                        <Link href="/contact" className="text-primary hover:underline">
                            Contact our team
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

