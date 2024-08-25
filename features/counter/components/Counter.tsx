// File: @/components/counter/Counter.tsx

'use client'

import { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useCounter } from '@/features/counter/hooks/useCounter';

export const Counter = () => {
    const {
        count,
        inputValue,
        isInputValueLoaded,
        isLoading,
        error,
        pendingUpdates,
        handleIncrement,
        handleDecrement,
        handleFetchInputValue,
        handleClearInputValue,
        handleUpdateInputValue,
        handleIncrementByAmount,
    } = useCounter();

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleUpdateInputValue(Number(e.target.value));
    }, [handleUpdateInputValue]);

    const isPending = Object.keys(pendingUpdates).length > 0;

    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <h1 className="text-2xl font-bold">Counter: {count}</h1>
            <div className="flex space-x-2">
                <Button onClick={handleDecrement}>Decrement</Button>
                <Button onClick={handleIncrement}>Increment</Button>
            </div>
            <div className="flex space-x-2">
                <Button onClick={handleFetchInputValue} disabled={isLoading}>
                    {isInputValueLoaded ? 'Refresh' : 'Fetch'} Increment Value
                </Button>
                <Button onClick={handleClearInputValue}>Clear Input Value</Button>
                <input
                    type="number"
                    className={`border rounded-md p-2 ${isPending ? 'bg-yellow-100' : 'bg-white'} ${error ? 'border-red-500' : 'border-gray-300'}`}
                    value={inputValue ?? ''}
                    onChange={handleInputChange}
                    placeholder={isInputValueLoaded ? undefined : 'Fetch value first'}
                    disabled={!isInputValueLoaded || isLoading}
                />
                <Button onClick={handleIncrementByAmount} disabled={inputValue === null}>
                    Increment by {inputValue ?? 'N/A'}
                </Button>
            </div>
            <div className="h-6 flex items-center">
                {isLoading && <p>Loading...</p>}
            </div>
            <div className="h-6 flex items-center">
                {isPending && <p className="text-yellow-500">Update pending...</p>}
            </div>
            {error && <p className="text-red-500">{error}</p>}
        </div>
    );
};
