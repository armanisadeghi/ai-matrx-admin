'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Sparkles,
    Check,
    Zap,
    Shield,
    Infinity,
    TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

interface SignupConversionModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalUsed?: number;
}

const benefits = [
    { icon: Infinity, label: 'Unlimited Access', desc: 'Run as many apps as you want', color: 'green' },
    { icon: Zap, label: 'Create Your Own', desc: 'Build custom AI apps', color: 'blue' },
    { icon: TrendingUp, label: 'Track History', desc: 'Save and review your work', color: 'purple' },
    { icon: Shield, label: 'Priority Support', desc: 'Get help when you need it', color: 'orange' },
] as const;

const features = [
    'Access to all public apps',
    'Create custom prompt apps',
    'Advanced AI models',
    'Save conversation history',
    'Export and share results',
    'API access (coming soon)',
];

const colorMap = {
    green: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
} as const;

function ModalBody({ totalUsed, onSignup, onLogin, compact }: {
    totalUsed: number;
    onSignup: () => void;
    onLogin: () => void;
    compact?: boolean;
}) {
    return (
        <div className={compact ? 'space-y-3 px-4 pb-safe' : 'space-y-6'}>
            {/* Stats */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
                <CardContent className={compact ? 'pt-3 pb-3' : 'pt-6'}>
                    <div className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            You've completed
                        </p>
                        <p className={`font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${compact ? 'text-2xl' : 'text-4xl'}`}>
                            {totalUsed} Free Runs
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Ready for unlimited access?
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Benefits */}
            <div>
                <h3 className={`font-semibold text-center ${compact ? 'text-base mb-2' : 'text-lg mb-4'}`}>
                    Continue with a Free Account
                </h3>
                <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 gap-4'}`}>
                    {benefits.map(({ icon: Icon, label, desc, color }) => (
                        <div key={label} className="flex items-start gap-2">
                            <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center flex-shrink-0 ${colorMap[color].split(' ').slice(0, 2).join(' ')}`}>
                                <Icon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${colorMap[color].split(' ').slice(2).join(' ')}`} />
                            </div>
                            <div className="min-w-0">
                                <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>{label}</p>
                                {!compact && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{desc}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Features list */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2">What's included:</h4>
                <div className={`grid gap-1.5 text-sm ${compact ? 'grid-cols-1' : 'grid-cols-2 gap-2'}`}>
                    {features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300 text-xs">{feature}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-2">
                <Button
                    onClick={onSignup}
                    size={compact ? 'default' : 'lg'}
                    className="w-full text-base font-semibold"
                >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Free Account
                </Button>

                <Button
                    onClick={onLogin}
                    variant="outline"
                    size={compact ? 'default' : 'lg'}
                    className="w-full"
                >
                    Already have an account? Log in
                </Button>

                <p className="text-xs text-center text-gray-500 dark:text-gray-400 pb-1">
                    No credit card required
                </p>
            </div>
        </div>
    );
}

/**
 * Conversion modal shown when guest hits 5 execution limit.
 * Renders as a Dialog on desktop and a bottom Drawer on mobile.
 */
export function SignupConversionModal({
    isOpen,
    onClose,
    totalUsed = 5
}: SignupConversionModalProps) {
    const router = useRouter();
    const isMobile = useIsMobile();

    const handleSignup = () => {
        router.push('/signup?source=guest_limit');
    };

    const handleLogin = () => {
        router.push('/login?source=guest_limit');
    };

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onClose}>
                <DrawerContent className="max-h-[90dvh]">
                    <DrawerHeader className="pb-2">
                        <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <DrawerTitle className="text-lg text-center">
                            You've Experienced the Power of AI Matrx!
                        </DrawerTitle>
                    </DrawerHeader>
                    <div className="overflow-y-auto flex-1">
                        <ModalBody
                            totalUsed={totalUsed}
                            onSignup={handleSignup}
                            onLogin={handleLogin}
                            compact
                        />
                    </div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <DialogTitle className="text-2xl text-center">
                        You've Experienced the Power of AI Matrx!
                    </DialogTitle>
                </DialogHeader>
                <ModalBody
                    totalUsed={totalUsed}
                    onSignup={handleSignup}
                    onLogin={handleLogin}
                />
            </DialogContent>
        </Dialog>
    );
}
