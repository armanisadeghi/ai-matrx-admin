// features/math/service.ts
import { createClient } from '@/utils/supabase/server';
import { MathProblem, MathProblemInsert } from './types';

/**
 * Fetch all published math problems
 */
export async function getAllMathProblems(): Promise<MathProblem[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('math_problems')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching math problems:', error);
        throw new Error('Failed to fetch math problems');
    }
    
    return data || [];
}

/**
 * Fetch a single math problem by ID
 */
export async function getMathProblemById(id: string): Promise<MathProblem | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('math_problems')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();
    
    if (error) {
        console.error('Error fetching math problem:', error);
        return null;
    }
    
    return data;
}

/**
 * Get math problems by course, topic, and module
 */
export async function getMathProblemsByModule(
    courseName: string,
    topicName: string,
    moduleName: string
): Promise<MathProblem[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('math_problems')
        .select('*')
        .eq('course_name', courseName)
        .eq('topic_name', topicName)
        .eq('module_name', moduleName)
        .eq('is_published', true)
        .order('sort_order', { ascending: true });
    
    if (error) {
        console.error('Error fetching math problems by module:', error);
        throw new Error('Failed to fetch math problems');
    }
    
    return data || [];
}

/**
 * Get unique course/topic/module combinations
 */
export async function getMathCourseStructure() {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('math_problems')
        .select('course_name, topic_name, module_name')
        .eq('is_published', true);
    
    if (error) {
        console.error('Error fetching course structure:', error);
        throw new Error('Failed to fetch course structure');
    }
    
    // Group by course > topic > module
    const structure: Record<string, Record<string, Set<string>>> = {};
    
    data?.forEach((item) => {
        if (!structure[item.course_name]) {
            structure[item.course_name] = {};
        }
        if (!structure[item.course_name][item.topic_name]) {
            structure[item.course_name][item.topic_name] = new Set();
        }
        structure[item.course_name][item.topic_name].add(item.module_name);
    });
    
    // Convert Sets to arrays
    return Object.entries(structure).map(([courseName, topics]) => ({
        courseName,
        topics: Object.entries(topics).map(([topicName, modules]) => ({
            topicName,
            modules: Array.from(modules)
        }))
    }));
}

/**
 * Insert a new math problem (for admin use)
 */
export async function insertMathProblem(problem: MathProblemInsert): Promise<MathProblem | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('math_problems')
        .insert(problem)
        .select()
        .single();
    
    if (error) {
        console.error('Error inserting math problem:', error);
        throw new Error('Failed to insert math problem');
    }
    
    return data;
}

/**
 * Bulk insert math problems (for migrations)
 */
export async function bulkInsertMathProblems(problems: MathProblemInsert[]): Promise<void> {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('math_problems')
        .insert(problems);
    
    if (error) {
        console.error('Error bulk inserting math problems:', error);
        throw new Error('Failed to bulk insert math problems');
    }
}

