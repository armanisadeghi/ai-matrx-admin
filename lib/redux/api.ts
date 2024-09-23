import { supabase } from '@/lib/supabase/client';

export const fetchWithFk = async (args: any): Promise<any> => {
    try {
        const { data, error } = await supabase.rpc('fetch_with_fk', args);
        if (error) {
            throw error;
        }
        return data;
    } catch (error: any) {
        console.error('Error in fetchWithFk:', error);
        return null;
    }
};

export const fetchWithIfk = async (args: any): Promise<any> => {
    try {
        const { data, error } = await supabase.rpc('fetch_with_ifk', args);
        if (error) {
            throw error;
        }
        return data;
    } catch (error: any) {
        console.error('Error in fetchWithIfk:', error);
        return null;
    }
};

export const fetchWithFkIfk = async (args: any): Promise<any> => {
    try {
        const { data, error } = await supabase.rpc('fetch_all_fk_ifk', args);
        if (error) {
            throw error;
        }
        return data;
    } catch (error: any) {
        console.error('Error in fetchWithFkIfk:', error);
        return null;
    }
};

export const fetchCustomRels = async (args: any): Promise<any> => {
    try {
        const { data, error } = await supabase.rpc('fetch_custom_rels', args);
        if (error) {
            throw error;
        }
        return data;
    } catch (error: any) {
        console.error('Error in fetchCustomRels:', error);
        return null;
    }
};


interface RelatedItem {
    id: string;
    name: string;
}

interface RegisteredFunctionWithRelsType {
    id: string;
    class_name: string | null;
    description: string | null;
    module_path: string;
    name: string;
    return_broker: RelatedItem | null;
    args: RelatedItem[];
    system_functions: RelatedItem[];
}

export const getRegisteredFunctionView = async (
    startIndex: number,
    endIndex: number
): Promise<any> => {
    try {
        const { data, error } = await supabase
            .from('view_registered_function')
            .select('*')
            .order('id', { ascending: true })
            .range(startIndex, endIndex);
        if (error) {
            throw error;
        }
        return data;
    } catch (error: any) {
        console.error('Error in getRegisteredFunctionView:', error);
        return null;
    }
};


