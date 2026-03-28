/**
 * CMS Components API Route
 *
 * CRUD for client_components (reusable headers, footers, etc.)
 * Auth: verifies caller via main-app session, writes via service role key.
 *
 * POST body: { action, ...params }
 *   action: 'list' | 'get' | 'create' | 'update' | 'delete'
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
                const { siteId } = params;

                let query = db
                    .from('client_components')
                    .select('id, client_id, component_type, name, is_active, has_draft, last_published_at, created_at, updated_at');

                if (siteId) {
                    query = query.eq('client_id', siteId);
                }

                const { data, error } = await query.order('component_type').order('name');

                if (error) {
                    console.error('[cms/components] list error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ components: data ?? [] });
            }

            case 'get': {
                const { componentId } = params;
                if (!componentId) {
                    return NextResponse.json({ error: 'componentId is required' }, { status: 400 });
                }

                const { data, error } = await db
                    .from('client_components')
                    .select('*')
                    .eq('id', componentId)
                    .single();

                if (error) {
                    console.error('[cms/components] get error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ component: data });
            }

            case 'create': {
                const { siteId, componentType, name, htmlContent, cssContent } = params;

                if (!siteId || !componentType || !name || !htmlContent) {
                    return NextResponse.json(
                        { error: 'siteId, componentType, name, and htmlContent are required' },
                        { status: 400 },
                    );
                }

                const { data, error } = await db
                    .from('client_components')
                    .insert({
                        client_id: siteId,
                        component_type: componentType,
                        name,
                        html_content: htmlContent,
                        css_content: cssContent || null,
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('[cms/components] create error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ success: true, component: data });
            }

            case 'update': {
                const { componentId, ...updateFields } = params;
                if (!componentId) {
                    return NextResponse.json({ error: 'componentId is required' }, { status: 400 });
                }

                const fieldMap: Record<string, string> = {
                    name: 'name',
                    componentType: 'component_type',
                    htmlContent: 'html_content',
                    htmlContentDraft: 'html_content_draft',
                    cssContent: 'css_content',
                    cssContentDraft: 'css_content_draft',
                    isActive: 'is_active',
                    hasDraft: 'has_draft',
                };

                const updateData: Record<string, unknown> = {};
                for (const [camel, snake] of Object.entries(fieldMap)) {
                    if (updateFields[camel] !== undefined) {
                        updateData[snake] = updateFields[camel];
                    }
                }

                const { data, error } = await db
                    .from('client_components')
                    .update(updateData)
                    .eq('id', componentId)
                    .select()
                    .single();

                if (error) {
                    console.error('[cms/components] update error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ success: true, component: data });
            }

            case 'delete': {
                const { componentId } = params;
                if (!componentId) {
                    return NextResponse.json({ error: 'componentId is required' }, { status: 400 });
                }

                const { error } = await db
                    .from('client_components')
                    .delete()
                    .eq('id', componentId);

                if (error) {
                    console.error('[cms/components] delete error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err: any) {
        console.error('[cms/components] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
