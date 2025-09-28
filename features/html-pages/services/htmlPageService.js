import supabaseHtml from '../lib/supabase-html';

export class HTMLPageService {
  /**
   * Create a new HTML page
   * @param {string} htmlContent - Complete HTML content
   * @param {string} title - Page title
   * @param {string} description - Optional description
   * @param {string} userId - User ID from your main app
   * @returns {Promise<{success: boolean, pageId: string, url: string}>}
   */
  static async createPage(htmlContent, title, description = '', userId) {
    try {
      console.log('Creating HTML page:', { title, userId });

      const { data, error } = await supabaseHtml
        .from('html_pages')
        .insert({
          html_content: htmlContent,
          title: title,
          description: description,
          user_id: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create HTML page:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      const pageUrl = `${process.env.NEXT_PUBLIC_HTML_SITE_URL}/p/${data.id}`;

      console.log('HTML page created successfully:', data.id);

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
