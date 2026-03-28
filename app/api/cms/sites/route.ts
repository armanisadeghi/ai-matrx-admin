/**
 * CMS Sites API Route
 *
 * Proxies CRUD operations for client_sites to the My Matrx Supabase project.
 * Auth: verifies caller via main-app session, writes via service role key.
 *
 * POST body: { action, ...params }
 *   action: 'list' | 'get' | 'create' | 'update'
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
                const { data, error } = await db
                    .from('client_sites')
                    .select('id, slug, name, domain, is_active, owner_user_id, favicon, created_at, updated_at')
                    .order('name');

                if (error) {
                    console.error('[cms/sites] list error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ sites: data ?? [] });
            }

            case 'get': {
                const { siteId } = params;
                if (!siteId) {
                    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
                }

                const { data, error } = await db
                    .from('client_sites')
                    .select('*')
                    .eq('id', siteId)
                    .single();

                if (error) {
                    console.error('[cms/sites] get error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ site: data });
            }

            case 'create': {
                const { name, slug, domain, themeConfig, navigation, footerConfig, metaDefaults, contactInfo, socialLinks, settings, globalCss, favicon } = params;

                if (!name || !slug) {
                    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 });
                }

                const { data, error } = await db
                    .from('client_sites')
                    .insert({
                        name,
                        slug,
                        domain: domain || null,
                        owner_user_id: user.id,
                        theme_config: themeConfig || {},
                        navigation: navigation || [],
                        footer_config: footerConfig || {},
                        meta_defaults: metaDefaults || {},
                        contact_info: contactInfo || {},
                        social_links: socialLinks || {},
                        settings: settings || {},
                        global_css: globalCss || null,
                        favicon: favicon || null,
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('[cms/sites] create error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ success: true, site: data });
            }

            case 'update': {
                const { siteId, ...updateFields } = params;
                if (!siteId) {
                    return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
                }

                // Map camelCase params to snake_case DB columns
                const updateData: Record<string, unknown> = {};
                const fieldMap: Record<string, string> = {
                    name: 'name',
                    slug: 'slug',
                    domain: 'domain',
                    themeConfig: 'theme_config',
                    navigation: 'navigation',
                    footerConfig: 'footer_config',
                    metaDefaults: 'meta_defaults',
                    contactInfo: 'contact_info',
                    socialLinks: 'social_links',
                    settings: 'settings',
                    isActive: 'is_active',
                    globalCss: 'global_css',
                    favicon: 'favicon',
                };

                for (const [camel, snake] of Object.entries(fieldMap)) {
                    if (updateFields[camel] !== undefined) {
                        updateData[snake] = updateFields[camel];
                    }
                }

                const { data, error } = await db
                    .from('client_sites')
                    .update(updateData)
                    .eq('id', siteId)
                    .select()
                    .single();

                if (error) {
                    console.error('[cms/sites] update error:', error);
                    return NextResponse.json({ error: error.message }, { status: 500 });
                }

                return NextResponse.json({ success: true, site: data });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err: any) {
        console.error('[cms/sites] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
