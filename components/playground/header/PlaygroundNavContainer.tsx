'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Brain, Workflow, Bot, Combine } from 'lucide-react';
import { cn } from '@/utils/cn';

// Prompt Button Component
export const PromptButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
    <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size='sm'
        className={cn('gap-1.5 h-8 rounded-none', isActive && 'bg-primary text-primary-foreground')}
        onClick={onClick}
    >
        <MessageSquare size={16} />
        <span className='text-sm'>Prompt</span>
    </Button>
);


export const WorkflowButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
    <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size='sm'
        className={cn('gap-1.5 h-8 rounded-none', isActive && 'bg-primary text-primary-foreground')}
        onClick={onClick}
    >
        <Workflow size={16} />
        <span className='text-sm'>Workflow</span>
    </Button>
);

// Train Button Component
export const MatrxButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
    <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size='sm'
        className={cn('gap-1.5 h-8 rounded-none', isActive && 'bg-primary text-primary-foreground')}
        onClick={onClick}
    >
        <Combine size={16} />
        <span className='text-sm'>Matrx</span>
    </Button>
);

// Recipe Button Component
export const RecipeButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
    <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size='sm'
        className={cn('gap-1.5 h-8 rounded-none', isActive && 'bg-primary text-primary-foreground')}
        onClick={onClick}
    >
        <Brain size={16} />
        <span className='text-sm'>Recipe</span>
    </Button>
);

// Agent Button Component
export const AgentButton = ({ isActive, onClick }: { isActive: boolean; onClick: () => void }) => (
    <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size='sm'
        className={cn('gap-1.5 h-8 rounded-none', isActive && 'bg-primary text-primary-foreground')}
        onClick={onClick}
    >
        <Bot size={16} />
        <span className='text-sm'>Agent</span>
    </Button>
);

interface PlaygroundNavContainerProps {
    currentMode: string;
    onModeChange: (mode: string) => void;
}

const PlaygroundNavContainer = ({ currentMode, onModeChange }: PlaygroundNavContainerProps) => {
    return (
        <div className='flex items-center'>
            <div className='bg-elevation2 h-8 flex rounded-xl overflow-hidden'>
                <PromptButton
                    isActive={currentMode === 'prompt'}
                    onClick={() => onModeChange('prompt')}
                />
                <div className='w-px bg-border' />
                <AgentButton
                    isActive={currentMode === 'agent'}
                    onClick={() => onModeChange('agent')}
                />
                <div className='w-px bg-border' />
                <RecipeButton
                    isActive={currentMode === 'recipe'}
                    onClick={() => onModeChange('recipe')}
                />
                <div className='w-px bg-border' />
                <WorkflowButton
                    isActive={currentMode === 'workflow'}
                    onClick={() => onModeChange('workflow')}
                />
                <div className='w-px bg-border' />
                <MatrxButton
                    isActive={currentMode === 'matrx'}
                    onClick={() => onModeChange('matrx')}
                />
            </div>
        </div>
    );
};

export default PlaygroundNavContainer;
