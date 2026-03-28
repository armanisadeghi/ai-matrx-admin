/**
 * CMS Versions API Route
 *
 * Read-only access to client_page_versions.
 * Versions are created automatically by the DB trigger on publish.
 *
 * POST body: { action, ...params }
 *   action: 'list' | 'get'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createMainSupabaseClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';

const HTML_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_HTML_URL!;
const HTML_SUPABASE_SERVICE_KEY =
    process.env.SUPABASE_HTML_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_HTML_ANON_KEY ||
    '';

function getCmsClient() {
    if (!HTML_SUPABASE_URL || !HTML_SUPABASE_SERVICE_KEY) {
        throw new Error('Missing CMS Supabase environment variables');
    }
    return createClient(HTML_SUPABASE_URL, HTML_SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false },
    });
}

export async function POST(request: NextRequest) {
    try {
        const mainSupabase = await createMainSupabaseClient();
        const {
            data: { user },
            error: authError,
        } = await mainSupabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, ...params } = body;
        const db = getCmsClient();

        switch (action) {
            case 'list': {
                const { pageId } = params;
                if (!pageId) {
                    return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
                }

                const { data, error } = await db
                    .from('client_page_versions')
                    .select('id, page_id, version_number, version_label, published_by, published_at, change_summary, created_at')
                    .eq('page_id', pageId)
                    .order('version_number', { ascending: false });

                if (error) {
                    console.error('[cms/versions] list error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ versions: data ?? [] });
            }

            case 'get': {
                const { versionId } = params;
                if (!versionId) {
                    return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
                }

                const { data, error } = await db
                    .from('client_page_versions')
                    .select('*')
                    .eq('id', versionId)
                    .single();

                if (error) {
                    console.error('[cms/versions] get error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ version: data });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err: any) {
        console.error('[cms/versions] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
