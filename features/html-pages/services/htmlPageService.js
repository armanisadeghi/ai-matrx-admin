import supabaseHtml from '@/features/html-pages/lib/supabase-html';

export class HTMLPageService {
  /**
   * Create a new HTML page
   * @param {string} htmlContent - Complete HTML content
   * @param {string} metaTitle - SEO meta title (required)
   * @param {string} metaDescription - SEO meta description (optional)
   * @param {string} userId - User ID from your main app
   * @param {Object} metaFields - Optional meta fields
   * @param {string} metaFields.metaKeywords - SEO meta keywords
   * @param {string} metaFields.ogImage - Open Graph image URL
   * @param {string} metaFields.canonicalUrl - Canonical URL
   * @param {boolean} metaFields.isIndexable - Whether the page should be indexed (defaults to false)
   * @returns {Promise<{success: boolean, pageId: string, url: string}>}
   */
  static async createPage(htmlContent, metaTitle, metaDescription = '', userId, metaFields = {}) {
    try {

      const insertData = {
        html_content: htmlContent,
        user_id: userId,
        // Meta fields
        meta_title: metaTitle,
        meta_description: metaDescription,
        meta_keywords: metaFields.metaKeywords || null,
        og_image: metaFields.ogImage || null,
        canonical_url: metaFields.canonicalUrl || null,
        is_indexable: metaFields.isIndexable || false
      };

      const { data, error } = await supabaseHtml
        .from('html_pages')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Failed to create HTML page:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const pageUrl = `${process.env.NEXT_PUBLIC_HTML_SITE_URL}/p/${data.id}`;

      return {
        success: true,
        pageId: data.id,
        url: pageUrl,
        metaTitle: data.meta_title,
        metaDescription: data.meta_description,
        isIndexable: data.is_indexable,
        createdAt: data.created_at
      };

    } catch (error) {
      console.error('HTMLPageService.createPage error:', error);
      throw error;
    }
  }

  /**
   * Get user's HTML pages
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  static async getUserPages(userId) {
    try {
      const { data, error } = await supabaseHtml
        .from('html_pages')
        .select('id, meta_title, meta_description, is_indexable, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data.map(page => ({
        ...page,
        url: `${process.env.NEXT_PUBLIC_HTML_SITE_URL}/p/${page.id}`
      }));

    } catch (error) {
      console.error('HTMLPageService.getUserPages error:', error);
      throw error;
    }
  }

  /**
   * Update an existing HTML page
   * @param {string} pageId - Page ID
   * @param {string} htmlContent - Updated HTML content
   * @param {string} metaTitle - Updated meta title
   * @param {string} metaDescription - Updated meta description
   * @param {string} userId - User ID (for security)
   * @param {Object} metaFields - Optional meta fields
   * @param {boolean} metaFields.isIndexable - Whether the page should be indexed
   * @returns {Promise<{success: boolean, pageId: string, url: string}>}
   */
  static async updatePage(pageId, htmlContent, metaTitle, metaDescription = '', userId, metaFields = {}) {
    try {

      const updateData = {
        html_content: htmlContent,
        // Meta fields
        meta_title: metaTitle,
        meta_description: metaDescription,
        meta_keywords: metaFields.metaKeywords || null,
        og_image: metaFields.ogImage || null,
        canonical_url: metaFields.canonicalUrl || null,
        is_indexable: metaFields.isIndexable !== undefined ? metaFields.isIndexable : false,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseHtml
        .from('html_pages')
        .update(updateData)
        .eq('id', pageId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update HTML page:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const pageUrl = `${process.env.NEXT_PUBLIC_HTML_SITE_URL}/p/${data.id}`;

      return {
        success: true,
        pageId: data.id,
        url: pageUrl,
        metaTitle: data.meta_title,
        metaDescription: data.meta_description,
        isIndexable: data.is_indexable,
        updatedAt: data.updated_at
      };

    } catch (error) {
      console.error('HTMLPageService.updatePage error:', error);
      throw error;
    }
  }

  /**
   * Delete a HTML page
   * @param {string} pageId - Page ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<boolean>}
   */
  static async deletePage(pageId, userId) {
    try {
      const { error } = await supabaseHtml
        .from('html_pages')
        .delete()
        .eq('id', pageId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return true;

    } catch (error) {
      console.error('HTMLPageService.deletePage error:', error);
      throw error;
    }
  }

  /**
   * Get a single HTML page (for viewing)
   * @param {string} pageId - Page ID
   * @returns {Promise<Object>}
   */
  static async getPage(pageId) {
    try {
      const { data, error } = await supabaseHtml
        .from('html_pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        ...data,
        url: `${process.env.NEXT_PUBLIC_HTML_SITE_URL}/p/${data.id}`
      };

    } catch (error) {
      console.error('HTMLPageService.getPage error:', error);
      throw error;
    }
  }
}
