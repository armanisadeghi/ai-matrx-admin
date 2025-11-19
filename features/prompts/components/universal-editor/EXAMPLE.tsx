/**
 * Example usage of UniversalPromptEditor
 * 
 * This file demonstrates how to use the UniversalPromptEditor component
 * with all three table types: prompts, templates, and builtins.
 * 
 * Copy these patterns to your own components as needed.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { UniversalPromptEditor, normalizePromptData, UniversalPromptData } from './index';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Example 1: Edit a Prompt from the prompts table
 */
export function ExamplePromptEditor({ promptId }: { promptId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [promptData, setPromptData] = useState<UniversalPromptData | null>(null);
    const [models, setModels] = useState<any[]>([]);
    const [tools, setTools] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        loadData();
    }, [promptId]);

    async function loadData() {
        try {
            // Load models
            const { data: modelsData } = await supabase
                .from('ai_models')
                .select('*')
                .eq('is_enabled', true)
                .order('sort_order');
            setModels(modelsData || []);

            // Load tools
            const { data: toolsData } = await supabase
                .from('ai_tools')
                .select('*')
                .eq('is_active', true);
            setTools(toolsData || []);

            // Load prompt
            const { data: promptRecord } = await supabase
                .from('prompts')
                .select('*')
                .eq('id', promptId)
                .single();

            if (promptRecord) {
                setPromptData(normalizePromptData(promptRecord, 'prompt'));
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load prompt data');
        }
    }

    async function handleSave(updated: UniversalPromptData) {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('prompts')
                .update({
                    name: updated.name,
                    description: updated.description,
                    messages: updated.messages,
                    variable_defaults: updated.variable_defaults,
                    settings: updated.settings,
                })
                .eq('id', promptId);

            if (error) throw error;

            toast.success('Prompt saved successfully');
            setIsOpen(false);
            
            // Refresh the data
            await loadData();
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Failed to save prompt');
        } finally {
            setIsSaving(false);
        }
    }

    if (!promptData) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <Button onClick={() => setIsOpen(true)}>Edit Prompt</Button>

            <UniversalPromptEditor
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                promptData={promptData}
                models={models}
                availableTools={tools}
                onSave={handleSave}
                isSaving={isSaving}
            />
        </div>
    );
}

/**
 * Example 2: Edit a Template from the prompt_templates table
 */
export function ExampleTemplateEditor({ templateId }: { templateId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [templateData, setTemplateData] = useState<UniversalPromptData | null>(null);
    const [models, setModels] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        loadData();
    }, [templateId]);

    async function loadData() {
        try {
            // Load models
            const { data: modelsData } = await supabase
                .from('ai_models')
                .select('*')
                .eq('is_enabled', true);
            setModels(modelsData || []);

            // Load template
            const { data: templateRecord } = await supabase
                .from('prompt_templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (templateRecord) {
                setTemplateData(normalizePromptData(templateRecord, 'template'));
            }
        } catch (error) {
            console.error('Failed to load template:', error);
            toast.error('Failed to load template');
        }
    }

    async function handleSave(updated: UniversalPromptData) {
        try {
            const { error } = await supabase
                .from('prompt_templates')
                .update({
                    name: updated.name,
                    description: updated.description,
                    category: updated.category, // Template-specific field
                    messages: updated.messages,
                    variable_defaults: updated.variable_defaults,
                    settings: updated.settings,
                })
                .eq('id', templateId);

            if (error) throw error;

            toast.success('Template saved successfully');
            setIsOpen(false);
            await loadData();
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Failed to save template');
        }
    }

    if (!templateData) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <Button onClick={() => setIsOpen(true)}>Edit Template</Button>

            <UniversalPromptEditor
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                promptData={templateData}
                models={models}
                onSave={handleSave}
            />
        </div>
    );
}

/**
 * Example 3: Edit a Builtin from the prompt_builtins table
 */
export function ExampleBuiltinEditor({ builtinId }: { builtinId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [builtinData, setBuiltinData] = useState<UniversalPromptData | null>(null);
    const [models, setModels] = useState<any[]>([]);
    const [tools, setTools] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        loadData();
    }, [builtinId]);

    async function loadData() {
        try {
            // Load models
            const { data: modelsData } = await supabase
                .from('ai_models')
                .select('*')
                .eq('is_enabled', true);
            setModels(modelsData || []);

            // Load tools
            const { data: toolsData } = await supabase
                .from('ai_tools')
                .select('*')
                .eq('is_active', true);
            setTools(toolsData || []);

            // Load builtin
            const { data: builtinRecord } = await supabase
                .from('prompt_builtins')
                .select('*')
                .eq('id', builtinId)
                .single();

            if (builtinRecord) {
                setBuiltinData(normalizePromptData(builtinRecord, 'builtin'));
            }
        } catch (error) {
            console.error('Failed to load builtin:', error);
            toast.error('Failed to load builtin');
        }
    }

    async function handleSave(updated: UniversalPromptData) {
        try {
            const { error } = await supabase
                .from('prompt_builtins')
                .update({
                    name: updated.name,
                    description: updated.description,
                    is_active: updated.is_active, // Builtin-specific field
                    messages: updated.messages,
                    variable_defaults: updated.variable_defaults,
                    settings: updated.settings,
                })
                .eq('id', builtinId);

            if (error) throw error;

            toast.success('Builtin saved successfully');
            setIsOpen(false);
            await loadData();
        } catch (error) {
            console.error('Save failed:', error);
            toast.error('Failed to save builtin');
        }
    }

    if (!builtinData) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <Button onClick={() => setIsOpen(true)}>Edit Builtin</Button>

            <UniversalPromptEditor
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                promptData={builtinData}
                models={models}
                availableTools={tools}
                onSave={handleSave}
            />
        </div>
    );
}

/**
 * Example 4: Creating a new prompt (without existing ID)
 */
export function ExampleCreatePrompt() {
    const [isOpen, setIsOpen] = useState(false);
    const [models, setModels] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        loadModels();
    }, []);

    async function loadModels() {
        const { data } = await supabase
            .from('ai_models')
            .select('*')
            .eq('is_enabled', true);
        setModels(data || []);
    }

    // Create a blank prompt template
    const blankPrompt: UniversalPromptData = {
        name: 'New Prompt',
        description: '',
        messages: [
            { role: 'system', content: '' },
        ],
        variable_defaults: [],
        tools: [],
        settings: {
            model_id: models[0]?.id || '',
        },
        sourceType: 'prompt',
    };

    async function handleSave(updated: UniversalPromptData) {
        try {
            const { data, error } = await supabase
                .from('prompts')
                .insert({
                    name: updated.name,
                    description: updated.description,
                    messages: updated.messages,
                    variable_defaults: updated.variable_defaults,
                    settings: updated.settings,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Prompt created successfully');
            setIsOpen(false);

            // Optionally redirect to the new prompt's edit page
            // router.push(`/prompts/${data.id}`);
        } catch (error) {
            console.error('Create failed:', error);
            toast.error('Failed to create prompt');
        }
    }

    return (
        <div>
            <Button onClick={() => setIsOpen(true)}>Create New Prompt</Button>

            <UniversalPromptEditor
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                promptData={blankPrompt}
                models={models}
                onSave={handleSave}
            />
        </div>
    );
}

/**
 * Example 5: Advanced - with initial selection and validation
 */
export function ExampleAdvancedEditor({ promptId }: { promptId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [promptData, setPromptData] = useState<UniversalPromptData | null>(null);
    const [models, setModels] = useState<any[]>([]);
    const supabase = createClient();

    // Open directly to the variables tab
    const [initialSelection] = useState<any>({ type: 'variables' });

    async function handleSave(updated: UniversalPromptData) {
        // Validation example
        if (!updated.name.trim()) {
            toast.error('Prompt name is required');
            return;
        }

        if (updated.messages.length === 0) {
            toast.error('At least one message is required');
            return;
        }

        if (!updated.settings?.model_id) {
            toast.error('Please select a model');
            return;
        }

        // Proceed with save
        try {
            const { error } = await supabase
                .from('prompts')
                .update({
                    name: updated.name,
                    messages: updated.messages,
                    variable_defaults: updated.variable_defaults,
                    settings: updated.settings,
                })
                .eq('id', promptId);

            if (error) throw error;

            toast.success('Saved successfully');
            setIsOpen(false);
        } catch (error) {
            toast.error('Save failed');
        }
    }

    if (!promptData) return null;

    return (
        <UniversalPromptEditor
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            promptData={promptData}
            models={models}
            onSave={handleSave}
            initialSelection={initialSelection}
        />
    );
}

