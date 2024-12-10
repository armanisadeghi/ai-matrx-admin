'use client';

import React, { useState } from 'react';
import LoadingButton from '@/components/ui/loaders/loading-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Mail, Save, Send, Settings, Star, Upload, User, Plus, Heart, Trash, ArrowRight } from 'lucide-react';

const VARIANTS = [
    'default',
    'destructive',
    'success',
    'outline',
    'secondary',
    'ghost',
    'link',
    'primary',
] as const;

const SIZES = ['xs', 'sm', 'default', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

const DEMO_ICONS = {
    Bell,
    Mail,
    Save,
    Send,
    Settings,
    Star,
    Upload,
    User,
};

const DemoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="w-full">
        <CardHeader>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-4">{children}</div>
        </CardContent>
    </Card>
);

export default function LoadingButtonDemo() {
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    const toggleLoading = (id: string) => {
        setLoadingStates(prev => {
            const newState = { ...prev, [id]: !prev[id] };
            if (newState[id]) {
                setTimeout(() => {
                    setLoadingStates(current => ({ ...current, [id]: false }));
                }, 2000);
            }
            return newState;
        });
    };

    return (
        <div className="flex min-h-screen w-full flex-col gap-6">
            {/* Variants Section */}
            <DemoSection title="Color Variants">
                {VARIANTS.map((variant) => (
                    <LoadingButton
                        key={variant}
                        variant={variant}
                        icon={Send}
                        isLoading={loadingStates[`variant-${variant}`]}
                        onClick={() => toggleLoading(`variant-${variant}`)}
                        className="min-w-[150px]"
                    >
                        {variant}
                    </LoadingButton>
                ))}
            </DemoSection>

            {/* Icon Buttons Section */}
            <DemoSection title="Icon-Only Buttons">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-4">
                        {VARIANTS.map((variant) => (
                            <LoadingButton
                                key={`icon-${variant}`}
                                variant={variant}
                                size="icon"
                                icon={Plus}
                                isLoading={loadingStates[`icon-${variant}`]}
                                onClick={() => toggleLoading(`icon-${variant}`)}
                            />
                        ))}
                    </div>
                </div>
            </DemoSection>

            {/* Round Icon Buttons Section */}
            <DemoSection title="Round Icon Buttons">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-4">
                        {VARIANTS.map((variant) => (
                            <LoadingButton
                                key={`round-${variant}`}
                                variant={variant}
                                size="roundIcon"
                                icon={Heart}
                                isLoading={loadingStates[`round-${variant}`]}
                                onClick={() => toggleLoading(`round-${variant}`)}
                            />
                        ))}
                    </div>
                </div>
            </DemoSection>

            {/* Sizes Section */}
            <DemoSection title="Size Variants">
                {SIZES.map((size) => (
                    <LoadingButton
                        key={size}
                        size={size}
                        icon={Star}
                        variant="primary"
                        isLoading={loadingStates[`size-${size}`]}
                        onClick={() => toggleLoading(`size-${size}`)}
                    >
                        Size {size}
                    </LoadingButton>
                ))}
            </DemoSection>

            {/* Common Actions */}
            <DemoSection title="Common Actions">
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <LoadingButton
                        icon={Upload}
                        variant="primary"
                        isLoading={loadingStates['action1']}
                        onClick={() => toggleLoading('action1')}
                        loadingText="Uploading..."
                    >
                        Upload File
                    </LoadingButton>

                    <LoadingButton
                        icon={Trash}
                        variant="destructive"
                        isLoading={loadingStates['action2']}
                        onClick={() => toggleLoading('action2')}
                        loadingText="Deleting..."
                    >
                        Delete Item
                    </LoadingButton>

                    <LoadingButton
                        icon={ArrowRight}
                        variant="success"
                        isLoading={loadingStates['action3']}
                        onClick={() => toggleLoading('action3')}
                        loadingText="Processing..."
                    >
                        Next Step
                    </LoadingButton>
                </div>
            </DemoSection>

            {/* Mixed Layout Example */}
            <DemoSection title="Mixed Layout Example">
                <div className="flex w-full flex-wrap items-center gap-4">
                    <LoadingButton
                        variant="primary"
                        icon={Save}
                        isLoading={loadingStates['mixed1']}
                        onClick={() => toggleLoading('mixed1')}
                    >
                        Save
                    </LoadingButton>

                    <LoadingButton
                        size="roundIcon"
                        variant="secondary"
                        icon={Heart}
                        isLoading={loadingStates['mixed2']}
                        onClick={() => toggleLoading('mixed2')}
                    />

                    <LoadingButton
                        size="icon"
                        variant="outline"
                        icon={Plus}
                        isLoading={loadingStates['mixed3']}
                        onClick={() => toggleLoading('mixed3')}
                    />

                    <LoadingButton
                        variant="ghost"
                        icon={Settings}
                        size="sm"
                        isLoading={loadingStates['mixed4']}
                        onClick={() => toggleLoading('mixed4')}
                    >
                        Settings
                    </LoadingButton>
                </div>
            </DemoSection>

            {/* Special States */}
            <DemoSection title="Special States">
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                    <LoadingButton
                        disabled
                        icon={Mail}
                        variant="primary"
                    >
                        Disabled
                    </LoadingButton>

                    <LoadingButton
                        isLoading
                        icon={Mail}
                        variant="secondary"
                        loadingText="Always Loading..."
                    >
                        Always Loading
                    </LoadingButton>

                    <LoadingButton
                        disabled
                        isLoading
                        icon={Mail}
                        variant="outline"
                        loadingText="Disabled & Loading"
                    >
                        Disabled & Loading
                    </LoadingButton>
                </div>
            </DemoSection>
        </div>
    );
}
