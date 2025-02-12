import React, { useEffect } from 'react';
import { ChevronDown, RotateCcw, RotateCw, Copy } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useMockBrokerInput } from '../mock-parts/useMockBrokerValue';
import { DataBroker, DataInputComponent } from '../types';
import { useHistoryState } from '@uidotdev/usehooks';
import { useToast } from '@/components/ui/use-toast';

export const withBrokerInput = <P extends object>(
    WrappedComponent: React.ComponentType<
        P & {
            value: any;
            onChange: (value: any) => void;
            broker: DataBroker;
            inputComponent: DataInputComponent;
        }
    >
) => {
    return function BrokerInput({ brokerId, className, ...props }: BrokerInputProps & Omit<P, 'value' | 'onChange' | 'broker' | 'inputComponent'>) {
        const { value: originalValue, setValue: setOriginalValue, broker, inputComponent } = useMockBrokerInput(brokerId);
        const { toast } = useToast();
        const hasDescription = inputComponent.description && inputComponent.description.length > 0;

        // Extract feature flags from additionalParams
        const showCopy = inputComponent.additionalParams?.copy !== false;
        const showHistory = inputComponent.additionalParams?.history !== false;

        const { state: value, set: setValue, undo, redo, canUndo, canRedo } = useHistoryState(originalValue);

        useEffect(() => {
            setOriginalValue(value);
        }, [value, setOriginalValue]);

        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                    if (e.shiftKey && canRedo) {
                        e.preventDefault();
                        redo();
                    } else if (canUndo) {
                        e.preventDefault();
                        undo();
                    }
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [undo, redo, canUndo, canRedo]);

        const handleCopy = async () => {
            try {
                // If the value is a string (likely code), copy it directly
                const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

                await navigator.clipboard.writeText(textToCopy);
                toast({
                    title: 'Copied!',
                    description: 'Value copied to clipboard',
                    duration: 2000,
                });
            } catch (err) {
                toast({
                    title: 'Error',
                    description: 'Failed to copy to clipboard',
                    variant: 'destructive',
                    duration: 2000,
                });
            }
        };

        const containerBaseClasses = 'grid flex flex-col w-full h-full space-y-4';
        const collapsibleBaseClasses = 'w-full';
        const labelBaseClasses = 'text-base cursor-pointer select-none';
        const descriptionBaseClasses = 'pt-2 pb-2 text-sm text-muted-foreground';
        const mainComponentBaseClasses = 'w-full h-full';
        const headerClasses = 'flex items-center w-full';
        const clickableAreaClasses =
            'flex-1 flex items-center justify-between hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer px-2 py-1';
        const controlsClasses = 'flex items-center space-x-2 ml-2';
        const iconClasses = 'h-4 w-4 shrink-0 text-muted-foreground cursor-pointer hover:text-foreground transition-colors';
        const disabledIconClasses = 'opacity-40 cursor-not-allowed hover:text-muted-foreground';

        return (
            <div className={cn(containerBaseClasses, inputComponent?.containerClassName || '', className)}>
                <Collapsible className={cn(collapsibleBaseClasses, inputComponent?.collapsibleClassName || '')}>
                    <div className={headerClasses}>
                        {hasDescription ? (
                            <CollapsibleTrigger className='flex-1'>
                                <div className={clickableAreaClasses}>
                                    <Label className={cn(labelBaseClasses, inputComponent?.labelClassName || '')}>{inputComponent.name}</Label>
                                    <ChevronDown className='h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 [data-state=open]:rotate-180' />
                                </div>
                            </CollapsibleTrigger>
                        ) : (
                            <div className={clickableAreaClasses}>
                                <Label className={cn(labelBaseClasses, inputComponent?.labelClassName || '')}>{inputComponent.name}</Label>
                            </div>
                        )}

                        <div className={controlsClasses}>
                            {showCopy && (
                                <Copy
                                    className={iconClasses}
                                    onClick={handleCopy}
                                />
                            )}
                            {showHistory && (
                                <>
                                    <RotateCcw
                                        className={cn(iconClasses, !canUndo && disabledIconClasses)}
                                        onClick={() => canUndo && undo()}
                                    />
                                    <RotateCw
                                        className={cn(iconClasses, !canRedo && disabledIconClasses)}
                                        onClick={() => canRedo && redo()}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {hasDescription && (
                        <CollapsibleContent className='w-full overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up'>
                            <div className={cn(descriptionBaseClasses, inputComponent?.descriptionClassName || '')}>{inputComponent.description}</div>
                        </CollapsibleContent>
                    )}
                </Collapsible>

                <WrappedComponent
                    className={cn(mainComponentBaseClasses, inputComponent?.componentClassName || '')}
                    value={value}
                    onChange={setValue}
                    broker={broker}
                    inputComponent={inputComponent}
                    {...(props as P)}
                />
            </div>
        );
    };
};

export type BrokerInputProps = {
    brokerId: string;
    className?: string;
    // Add any other common props here
};

export const withBrokerCustomInput = <P extends object>(
    WrappedComponent: React.ComponentType<
        P & {
            value: any;
            onChange: (value: any) => void;
            broker: DataBroker;
            inputComponent: DataInputComponent;
        }
    >
) => {
    return function BrokerInput({ brokerId, className, ...props }: BrokerInputProps & Omit<P, 'value' | 'onChange' | 'broker' | 'inputComponent'>) {
        const { value, setValue, broker, inputComponent } = useMockBrokerInput(brokerId);

        return (
            <div className={cn('space-y-2', inputComponent.containerClassName || '', className)}>
                <WrappedComponent
                    value={value}
                    onChange={setValue}
                    broker={broker}
                    inputComponent={inputComponent}
                    {...(props as P)}
                />
            </div>
        );
    };
};
