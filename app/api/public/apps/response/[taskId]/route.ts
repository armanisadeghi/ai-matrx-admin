import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;
        const supabase = await createClient();

        // Query the ai_tasks table for the response
        const { data: task, error } = await supabase
            .from('ai_tasks')
            .select('status, result, error')
            .eq('id', taskId)
            .single();

        if (error) {
            return NextResponse.json({
                response: '',
                completed: false,
                error: null
            });
        }

        // Extract response from result
        let response = '';
        let completed = false;
        let taskError = null;

        if (task) {
            if (task.status === 'completed' || task.status === 'failed') {
                completed = true;
            }

            if (task.status === 'failed') {
                taskError = task.error || 'Task failed';
            }

            // Try to extract the response text from result
            if (task.result) {
                try {
                    const result = typeof task.result === 'string' 
                        ? JSON.parse(task.result) 
                        : task.result;
                    
                    // Different possible structures
                    response = result.response 
                        || result.text 
                        || result.content 
                        || result.message 
                        || (typeof result === 'string' ? result : '');
                } catch {
                    response = typeof task.result === 'string' ? task.result : '';
                }
            }
        }

        return NextResponse.json({
            response,
            completed,
            error: taskError
        });

    } catch (error) {
        console.error('Error fetching task response:', error);
        return NextResponse.json(
            { 
                response: '', 
                completed: false,
                error: 'Failed to fetch response' 
            },
            { status: 500 }
        );
    }
}

