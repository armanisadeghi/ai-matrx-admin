import supabaseHtml from '@/features/html-pages/lib/supabase-html';

export class HTMLPageService {
  /**
   * Create a new HTML page
   * @param {string} htmlContent - Complete HTML content
   * @param {string} title - Page title
   * @param {string} description - Optional description
   * @param {string} userId - User ID from your main app
   * @param {Object} metaFields - Optional meta fields
   * @param {string} metaFields.metaTitle - SEO meta title
   * @param {string} metaFields.metaDescription - SEO meta description
   * @param {string} metaFields.metaKeywords - SEO meta keywords
   * @param {string} metaFields.ogImage - Open Graph image URL
   * @param {string} metaFields.canonicalUrl - Canonical URL
   * @returns {Promise<{success: boolean, pageId: string, url: string}>}
   */
  static async createPage(htmlContent, title, description = '', userId, metaFields = {}) {
    try {

      const insertData = {
        html_content: htmlContent,
        title: title,
        description: description,
        user_id: userId,
        // Meta fields with defaults
        meta_title: metaFields.metaTitle || title,
        meta_description: metaFields.metaDescription || description,
        meta_keywords: metaFields.metaKeywords || null,
        og_image: metaFields.ogImage || null,
        canonical_url: metaFields.canonicalUrl || null
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
        title: data.title,
        description: data.description,
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
        .select('id, title, description, created_at')
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
   * @param {string} title - Updated title
   * @param {string} description - Updated description
   * @param {string} userId - User ID (for security)
   * @param {Object} metaFields - Optional meta fields
   * @returns {Promise<{success: boolean, pageId: string, url: string}>}
   */
  static async updatePage(pageId, htmlContent, title, description = '', userId, metaFields = {}) {
    try {

      const updateData = {
        html_content: htmlContent,
        title: title,
        description: description,
        // Meta fields with defaults
        meta_title: metaFields.metaTitle || title,
        meta_description: metaFields.metaDescription || description,
        meta_keywords: metaFields.metaKeywords || null,
        og_image: metaFields.ogImage || null,
        canonical_url: metaFields.canonicalUrl || null,
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
        title: data.title,
        description: data.description,
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
