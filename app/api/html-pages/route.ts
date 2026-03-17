/**
 * HTML Pages API Route
 *
 * Proxies create/update/delete operations to the HTML Supabase project
 * using the service role key to bypass RLS.
 *
 * Auth: Verifies the caller is authenticated against the main Supabase project
 * by reading the Authorization header passed from the client.
 *
 * Required env var:
 *   SUPABASE_HTML_SERVICE_ROLE_KEY — service role key for the HTML Supabase project
 *   (project: viyklljfdhtidwecakwx — find in Supabase Dashboard > Settings > API Keys)
 *
 * POST body: { action, ...params }
 *   action: 'create' | 'update' | 'delete' | 'get' | 'list'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createMainSupabaseClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';

const HTML_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_HTML_URL!;
// Prefer service role key (bypasses RLS). Falls back to anon key during transition —
// with anon key the HTML Supabase RLS must allow inserts by the anon role.
// Add SUPABASE_HTML_SERVICE_ROLE_KEY to .env.local from:
//   Supabase Dashboard > project viyklljfdhtidwecakwx > Settings > API Keys > service_role
const HTML_SUPABASE_SERVICE_KEY =
    process.env.SUPABASE_HTML_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_HTML_ANON_KEY ||
    '';

const HTML_SITE_URL = process.env.NEXT_PUBLIC_HTML_SITE_URL || 'https://mymatrx.com';

function getHtmlAdminClient() {
    if (!HTML_SUPABASE_URL || !HTML_SUPABASE_SERVICE_KEY) {
        throw new Error('Missing HTML Supabase environment variables');
    }
    return createClient(HTML_SUPABASE_URL, HTML_SUPABASE_SERVICE_KEY, {
        auth: { persistSession: false }
    });
}

export async function POST(request: NextRequest) {
    try {
        // Verify main-app session
        const mainSupabase = await createMainSupabaseClient();
        const { data: { user }, error: authError } = await mainSupabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { action, ...params } = body;

        if (!process.env.SUPABASE_HTML_SERVICE_ROLE_KEY) {
            console.warn(
                '[html-pages API] SUPABASE_HTML_SERVICE_ROLE_KEY not set — using anon key fallback. ' +
                'RLS must allow anon inserts, or add the service role key to .env.local: ' +
                'Supabase Dashboard > project viyklljfdhtidwecakwx > Settings > API Keys > service_role'
            );
        }

        const htmlDb = getHtmlAdminClient();

        switch (action) {
            case 'create': {
                const { htmlContent, metaTitle, metaDescription = '', metaFields = {} } = params;

                if (!htmlContent || !metaTitle) {
                    return NextResponse.json({ error: 'htmlContent and metaTitle are required' }, { status: 400 });
                }

                const { data, error } = await htmlDb
                    .from('html_pages')
                    .insert({
                        html_content: htmlContent,
                        user_id: user.id,
                        meta_title: metaTitle,
                        meta_description: metaDescription,
                        meta_keywords: metaFields.metaKeywords || null,
                        og_image: metaFields.ogImage || null,
                        canonical_url: metaFields.canonicalUrl || null,
                        is_indexable: metaFields.isIndexable || false,
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('[html-pages API] create error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({
                    success: true,
                    pageId: data.id,
                    url: `${HTML_SITE_URL}/p/${data.id}`,
                    metaTitle: data.meta_title,
                    metaDescription: data.meta_description,
                    isIndexable: data.is_indexable,
                    createdAt: data.created_at,
                });
            }

            case 'update': {
                const { pageId, htmlContent, metaTitle, metaDescription = '', metaFields = {} } = params;

                if (!pageId || !htmlContent || !metaTitle) {
                    return NextResponse.json({ error: 'pageId, htmlContent and metaTitle are required' }, { status: 400 });
                }

                const { data, error } = await htmlDb
                    .from('html_pages')
                    .update({
                        html_content: htmlContent,
                        meta_title: metaTitle,
                        meta_description: metaDescription,
                        meta_keywords: metaFields.metaKeywords || null,
                        og_image: metaFields.ogImage || null,
                        canonical_url: metaFields.canonicalUrl || null,
                        is_indexable: metaFields.isIndexable !== undefined ? metaFields.isIndexable : false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', pageId)
                    .eq('user_id', user.id)
                    .select()
                    .single();

                if (error) {
                    console.error('[html-pages API] update error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                if (!data) {
                    return NextResponse.json({ error: 'Page not found or access denied' }, { status: 404 });
                }

                return NextResponse.json({
                    success: true,
                    pageId: data.id,
                    url: `${HTML_SITE_URL}/p/${data.id}`,
                    metaTitle: data.meta_title,
                    metaDescription: data.meta_description,
                    isIndexable: data.is_indexable,
                    updatedAt: data.updated_at,
                });
            }

            case 'delete': {
                const { pageId } = params;
                if (!pageId) {
                    return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
                }

                const { error } = await htmlDb
                    .from('html_pages')
                    .delete()
                    .eq('id', pageId)
                    .eq('user_id', user.id);

                if (error) {
                    console.error('[html-pages API] delete error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ success: true });
            }

            case 'list': {
                const { data, error } = await htmlDb
                    .from('html_pages')
                    .select('id, meta_title, meta_description, is_indexable, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('[html-pages API] list error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({
                    pages: (data || []).map(page => ({
                        ...page,
                        url: `${HTML_SITE_URL}/p/${page.id}`,
                    })),
                });
            }

            case 'get': {
                const { pageId } = params;
                if (!pageId) {
                    return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
                }

                const { data, error } = await htmlDb
                    .from('html_pages')
                    .select('*')
                    .eq('id', pageId)
                    .single();

                if (error) {
                    console.error('[html-pages API] get error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({
                    ...data,
                    url: `${HTML_SITE_URL}/p/${data.id}`,
                });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err: any) {
        console.error('[html-pages API] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
