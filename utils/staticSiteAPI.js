// utils/staticSiteAPI.js
const STATIC_SITE_URL = 'https://mymatrx.com'; // Replace with your deployed URL
const API_KEY = process.env.NEXT_PUBLIC_DEPLOY_API_KEY; // Set in your React app's env

export class StaticSiteAPI {
  static async deployPage(htmlContent, title, description = '') {
    if (!API_KEY) {
      throw new Error('NEXT_PUBLIC_DEPLOY_API_KEY environment variable is not set. Please add it to your .env.local file.');
    }

    console.log('Attempting to deploy to:', `${STATIC_SITE_URL}/api/deploy-page`);
    console.log('API Key present:', !!API_KEY);

    try {
      const response = await fetch(`${STATIC_SITE_URL}/api/deploy-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent,
          title,
          description,
          apiKey: API_KEY
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deploying page:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Failed to fetch')) {
        throw new Error(`Cannot connect to static site at ${STATIC_SITE_URL}. This could be due to:\n- CORS policy blocking the request\n- The static site is not deployed or accessible\n- Network connectivity issues\n- The API endpoints don't exist on the static site`);
      }
      
      throw error;
    }
  }

  static async testConnection() {
    console.log('Testing connection to:', `${STATIC_SITE_URL}/api/test`);
    
    try {
      const response = await fetch(`${STATIC_SITE_URL}/api/test`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Connection test successful:', result);
      return result;
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // Provide more specific error messages for connection test
      if (error.message.includes('Failed to fetch')) {
        throw new Error(`Cannot reach static site at ${STATIC_SITE_URL}. Please check:\n- Is the site deployed and accessible?\n- Are there CORS restrictions?\n- Is the /api/test endpoint available?`);
      }
      
      throw error;
    }
  }

  static getPageUrl(pageId) {
    return `${STATIC_SITE_URL}/pages/${pageId}`;
  }
}