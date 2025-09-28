// utils/useStaticSite.js
import { useState } from 'react';
import { StaticSiteAPI } from './staticSiteAPI';

export function useStaticSite() {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedPages, setDeployedPages] = useState([]);
  const [error, setError] = useState(null);

  const deployPage = async (htmlContent, title, description) => {
    setIsDeploying(true);
    setError(null);
    
    try {
      const result = await StaticSiteAPI.deployPage(htmlContent, title, description);
      
      const newPage = {
        id: result.pageId,
        title,
        description,
        url: result.url,
        createdAt: new Date().toISOString()
      };
      
      setDeployedPages(prev => [newPage, ...prev]);
      return newPage;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsDeploying(false);
    }
  };

  const testConnection = async () => {
    try {
      const result = await StaticSiteAPI.testConnection();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    deployPage,
    testConnection,
    isDeploying,
    deployedPages,
    error,
    clearError: () => setError(null)
  };
}