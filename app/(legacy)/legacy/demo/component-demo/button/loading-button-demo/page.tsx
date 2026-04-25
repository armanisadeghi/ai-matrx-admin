'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { Save, Trash, Mail, ArrowRight, Check, X, Bell, Send } from 'lucide-react';
import LoadingButton from '@/components/ui/loaders/loading-button';

const variants = ['default', 'destructive', 'success', 'outline', 'secondary', 'ghost', 'link', 'primary'] as const;
const sizes = ['xs', 'sm', 'default', 'md', 'lg', 'xl', '2xl', '3xl'] as const;

export default function LoadingButtonDemo() {
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    const toggleLoading = (id: string) => {
        setLoadingStates(prev => {
            const newState = { ...prev, [id]: !prev[id] };

            // Auto-reset after 2 seconds
            if (newState[id]) {
                setTimeout(() => {
                    setLoadingStates(current => ({ ...current, [id]: false }));
                }, 2000);
            }

            return newState;
        });
    };

    return (
        <div className="space-y-6">
            {/* Basic Variants */}
            <Card>
                <CardHeader>
                    <CardTitle>Button Variants</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {variants.map(variant => (
                        <LoadingButton
                            key={variant}
                            variant={variant}
                            icon={Send}
                            isLoading={loadingStates[`variant-${variant}`]}
                            onClick={() => toggleLoading(`variant-${variant}`)}
                            className="w-full"
                            loadingText="Loading..."
                        >
                            {variant}
                        </LoadingButton>
                    ))}
                </CardContent>
            </Card>

            {/* Sizes */}
            <Card>
                <CardHeader>
                    <CardTitle>Button Sizes</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    {sizes.map(size => (
                        <LoadingButton
                            key={size}
                            size={size}
                            icon={Bell}
                            isLoading={loadingStates[`size-${size}`]}
                            onClick={() => toggleLoading(`size-${size}`)}
                            loadingText="Loading..."
                        >
                            Size {size}
                        </LoadingButton>
                    ))}
                </CardContent>
            </Card>

            {/* Common Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Common Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <LoadingButton
                        variant="primary"
                        icon={Save}
                        isLoading={loadingStates['save']}
                        onClick={() => toggleLoading('save')}
                        className="w-full"
                        loadingText="Saving..."
                    >
                        Save Changes
                    </LoadingButton>

                    <LoadingButton
                        variant="destructive"
                        icon={Trash}
                        isLoading={loadingStates['delete']}
                        onClick={() => toggleLoading('delete')}
                        className="w-full"
                        loadingText="Deleting..."
                    >
                        Delete Item
                    </LoadingButton>

                    <LoadingButton
                        variant="secondary"
                        icon={Mail}
                        isLoading={loadingStates['mail']}
                        onClick={() => toggleLoading('mail')}
                        className="w-full"
                        loadingText="Sending..."
                    >
                        Send Email
                    </LoadingButton>
                </CardContent>
            </Card>

            {/* Icon Buttons */}
            <Card>
                <CardHeader>
                    <CardTitle>Icon Buttons</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    {[
                        { icon: Save, variant: 'primary' as const, id: 'icon-save' },
                        { icon: Trash, variant: 'destructive' as const, id: 'icon-delete' },
                        { icon: Mail, variant: 'secondary' as const, id: 'icon-mail' }
                    ].map(({ icon: Icon, variant, id }) => (
                        <LoadingButton
                            key={id}
                            size="icon"
                            variant={variant}
                            icon={Icon}
                            isLoading={loadingStates[id]}
                            onClick={() => toggleLoading(id)}
                            className="h-10 w-10 p-0"
                        />
                    ))}
                </CardContent>
            </Card>

            {/* Styled Examples */}
            <Card>
                <CardHeader>
                    <CardTitle>Styled Examples</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <LoadingButton
                        variant="success"
                        icon={Check}
                        isLoading={loadingStates['submit']}
                        onClick={() => toggleLoading('submit')}
                        className="w-full"
                        loadingText="Submitting..."
                        iconClassName="text-green-500"
                        spinnerClassName="text-white"
                    >
                        Submit Form
                    </LoadingButton>

                    <LoadingButton
                        variant="outline"
                        icon={ArrowRight}
                        isLoading={loadingStates['next']}
                        onClick={() => toggleLoading('next')}
                        className="w-full"
                        loadingText="Processing..."
                    >
                        Next Step
                    </LoadingButton>

                    <LoadingButton
                        variant="destructive"
                        icon={X}
                        isLoading={loadingStates['cancel']}
                        onClick={() => toggleLoading('cancel')}
                        className="w-full"
                        loadingText="Cancelling..."
                        iconClassName="text-red-500"
                    >
                        Cancel Process
                    </LoadingButton>
                </CardContent>
            </Card>

            {/* Special States */}
            <Card>
                <CardHeader>
                    <CardTitle>Special States</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <LoadingButton
                        disabled
                        icon={X}
                        isLoading={loadingStates['disabled']}
                        onClick={() => toggleLoading('disabled')}
                        className="w-full"
                        loadingText="Loading..."
                    >
                        Disabled Button
                    </LoadingButton>

                    <LoadingButton
                        variant="primary"
                        icon={Send}
                        isLoading={true}
                        className="w-full"
                        loadingText="Always Loading..."
                    >
                        Always Loading
                    </LoadingButton>

                    <LoadingButton
                        variant="secondary"
                        icon={Mail}
                        disabled
                        isLoading={true}
                        className="w-full"
                        loadingText="Can't Click..."
                    >
                        Disabled & Loading
                    </LoadingButton>
                </CardContent>
            </Card>
        </div>
    );
}
