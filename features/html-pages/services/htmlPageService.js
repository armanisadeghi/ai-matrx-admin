'use client';

/**
 * HTMLPageService
 *
 * Routes all write/read operations through the Next.js API route at /api/html-pages,
 * which uses the HTML Supabase service role key to bypass RLS and verifies the
 * caller's main-app session server-side.
 *
 * This avoids the cross-project auth problem that arises when writing directly to a
 * separate Supabase project from the browser with an unauthenticated client.
 */
export class HTMLPageService {
    static async #call(action, params = {}) {
        const response = await fetch('/api/html-pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...params }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `API error: ${response.status}`);
        }

        return data;
    }

    /**
     * Create a new HTML page
     */
    static async createPage(htmlContent, metaTitle, metaDescription = '', userId, metaFields = {}) {
        return HTMLPageService.#call('create', {
            htmlContent,
            metaTitle,
            metaDescription,
            metaFields,
        });
    }

    /**
     * Get user's HTML pages
     */
    static async getUserPages(userId) {
        const data = await HTMLPageService.#call('list');
        return data.pages;
    }

    /**
     * Update an existing HTML page
     */
    static async updatePage(pageId, htmlContent, metaTitle, metaDescription = '', userId, metaFields = {}) {
        return HTMLPageService.#call('update', {
            pageId,
            htmlContent,
            metaTitle,
            metaDescription,
            metaFields,
        });
    }

    /**
     * Delete a HTML page
     */
    static async deletePage(pageId, userId) {
        await HTMLPageService.#call('delete', { pageId });
        return true;
    }

    /**
     * Get a single HTML page (for viewing)
     */
    static async getPage(pageId) {
        return HTMLPageService.#call('get', { pageId });
    }
}
