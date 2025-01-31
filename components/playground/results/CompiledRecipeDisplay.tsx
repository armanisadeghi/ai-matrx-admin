'use client';

import React, { useEffect, useState } from 'react';
import { Button, Card, Dialog, DialogContent, DialogTitle } from '@/components/ui';
import { CockpitControls } from '../types';
import { useRecipeCompiler } from '../hooks/recipes/useCompileRecipe';
import { RefreshCw, Copy, Maximize2 } from 'lucide-react';

interface CompiledRecipeDisplayProps {
    cockpitControls: CockpitControls;
}

interface ActionButtonProps {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, icon, label }) => (
    <Button
        variant='ghost'
        size='sm'
        className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground'
        onClick={onClick}
        aria-label={label}
    >
        {icon}
    </Button>
);

export function CompiledRecipeDisplay({ cockpitControls }: CompiledRecipeDisplayProps) {
    const { recipeRecord, compileRecipe } = useRecipeCompiler({ aiCockpitHook: cockpitControls.aiCockpitHook });
    const [compiledContent, setCompiledContent] = useState<any>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const result = compileRecipe();
        setCompiledContent(result);
    }, []);

    const handleCompile = () => {
        const result = compileRecipe();
        setCompiledContent(result);
    };

    const handleCopy = async () => {
        if (compiledContent) {
            await navigator.clipboard.writeText(JSON.stringify(compiledContent, null, 2));
        }
    };

    const formattedContent = compiledContent ? JSON.stringify(compiledContent, null, 2) : 'Click compile to view recipe';

    return (
        <>
            <Card className='relative h-full bg-background overflow-hidden'>
                <div className='absolute inset-0 flex flex-col'>
                    <div className='p-2 flex items-center justify-between'>
                        <div className='text-sm text-muted-foreground'>Compiled Recipe {recipeRecord?.name}</div>
                        <div className='flex gap-1'>
                            <ActionButton
                                onClick={handleCompile}
                                icon={<RefreshCw size={14} />}
                                label='Compile Recipe'
                            />
                            <ActionButton
                                onClick={handleCopy}
                                icon={<Copy size={14} />}
                                label='Copy to Clipboard'
                            />
                            <ActionButton
                                onClick={() => setIsFullScreen(true)}
                                icon={<Maximize2 size={14} />}
                                label='View Fullscreen'
                            />
                        </div>
                    </div>
                    <div className='flex-1 overflow-auto bg-background'>
                        <pre className='p-4 text-sm whitespace-pre-wrap break-all'>{formattedContent}</pre>
                    </div>
                </div>
            </Card>

            <Dialog
                open={isFullScreen}
                onOpenChange={setIsFullScreen}
            >
                <DialogContent className='max-w-[90vw] max-h-[90vh] flex flex-col'>
                    <div className='flex items-center gap-2 mb-4'>
                        <DialogTitle className='text-lg font-semibold'>Compiled Recipe View</DialogTitle>
                        <Button
                            variant='ghost'
                            size='sm'
                            className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground'
                            onClick={handleCopy}
                            aria-label='Copy to Clipboard'
                        >
                            <Copy size={16} />
                        </Button>
                    </div>
                    <div className='flex-1 overflow-auto'>
                        <pre className='p-4 text-sm whitespace-pre-wrap break-all'>{formattedContent}</pre>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default CompiledRecipeDisplay;
