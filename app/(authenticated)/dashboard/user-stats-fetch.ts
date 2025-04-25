    // useUserStats.ts
    'use client';

    import { useState, useEffect } from 'react';
    import { useAppSelector } from "@/lib/redux/hooks";
    import { selectUserId } from "@/lib/redux/selectors/userSelectors";
    import { supabase } from "@/utils/supabase/client";

    export interface UserStats {
    user_conversation_count: number;
    total_conversation_count: number;
    user_recipe_count: number;
    total_recipe_count: number;
    user_tables_count: number;
    total_tables_count: number;
    }

    export function useUserStats() {
    const userId = useAppSelector(selectUserId);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    console.log(userId);

    useEffect(() => {
        const fetchStats = async () => {
        // Skip if we don't have a userId
        if (!userId) return;
        
        setLoading(true);
        try {
            const { data, error } = await supabase
            .rpc('get_user_stats', {
                p_user_id: userId
              });
                
            if (error) throw error;
            
            setStats(data);
        } catch (err) {
            console.error('Error fetching user stats:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
        };

        fetchStats();
    }, [userId]); // Only re-fetch when userId changes

    return { stats, loading, error };
    }
