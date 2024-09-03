import { supabase } from '@/lib/supabaseClient';

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
