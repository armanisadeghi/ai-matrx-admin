'use client';

import { supabase } from '@/utils/supabase/client';
import type { AiModelRow, AiProvider, ModelUsageResult } from './types';

export const aiModelService = {
    async fetchAll(): Promise<AiModelRow[]> {
        const { data, error } = await supabase
            .from('ai_model')
            .select('*')
            .order('common_name', { ascending: true, nullsFirst: false });
        if (error) throw error;
        return data as AiModelRow[];
    },

    async fetchProviders(): Promise<AiProvider[]> {
        const { data, error } = await supabase
            .from('ai_provider')
            .select('id, name, company_description, documentation_link, models_link')
            .order('name', { ascending: true });
        if (error) throw error;
        return data as AiProvider[];
    },

    async create(payload: Omit<AiModelRow, 'id'>): Promise<AiModelRow> {
        const { data, error } = await supabase
            .from('ai_model')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return data as AiModelRow;
    },

    async update(id: string, payload: Partial<Omit<AiModelRow, 'id'>>): Promise<AiModelRow> {
        const { data, error } = await supabase
            .from('ai_model')
            .update(payload)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AiModelRow;
    },

    async remove(id: string): Promise<void> {
        const { error } = await supabase
            .from('ai_model')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async fetchUsage(modelId: string): Promise<ModelUsageResult> {
        const [promptsResult, builtinsResult] = await Promise.all([
            supabase
                .from('prompts')
                .select('id, name, model_id')
                .eq('model_id', modelId),
            supabase
                .from('prompt_builtins')
                .select('id, name, source_prompt_id, settings')
                .filter('settings->>model_id', 'eq', modelId),
        ]);

        if (promptsResult.error) throw promptsResult.error;
        if (builtinsResult.error) throw builtinsResult.error;

        const prompts = (promptsResult.data ?? []).map((p) => ({
            id: p.id,
            name: p.name ?? p.id,
            table: 'prompts' as const,
        }));

        const promptBuiltins = (builtinsResult.data ?? []).map((b) => ({
            id: b.id,
            name: (b as { name?: string }).name ?? b.id,
            table: 'prompt_builtins' as const,
            source_prompt_id: b.source_prompt_id,
        }));

        return { prompts, promptBuiltins };
    },

    async replaceModelInPrompts(oldId: string, newId: string): Promise<number> {
        const { data, error } = await supabase
            .from('prompts')
            .update({ model_id: newId })
            .eq('model_id', oldId)
            .select('id');
        if (error) throw error;
        return data?.length ?? 0;
    },

    async replaceModelInBuiltins(oldId: string, newId: string): Promise<number> {
        const { data: rows, error: fetchErr } = await supabase
            .from('prompt_builtins')
            .select('id, settings')
            .filter('settings->>model_id', 'eq', oldId);
        if (fetchErr) throw fetchErr;
        if (!rows || rows.length === 0) return 0;

        const updates = rows.map((row) => {
            const settings = typeof row.settings === 'object' && row.settings !== null
                ? { ...(row.settings as Record<string, unknown>), model_id: newId }
                : { model_id: newId };
            return supabase
                .from('prompt_builtins')
                .update({ settings })
                .eq('id', row.id);
        });

        const results = await Promise.all(updates);
        const firstError = results.find((r) => r.error);
        if (firstError?.error) throw firstError.error;

        return rows.length;
    },
};
