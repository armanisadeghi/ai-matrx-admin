import { useState } from 'react';
import { HTMLPageService } from '@/features/html-pages/services/htmlPageService';

export function useHTMLPages(userId) {
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const createHTMLPage = async (htmlContent, metaTitle, metaDescription = '', metaFields = {}) => {
    if (!userId) {
      throw new Error('User ID is required to create HTML pages');
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await HTMLPageService.createPage(
        htmlContent, 
        metaTitle, 
        metaDescription, 
        userId,
        metaFields
      );
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const getUserPages = async () => {
    if (!userId) {
      throw new Error('User ID is required to fetch HTML pages');
    }

    setIsLoading(true);
    setError(null);

    try {
      const pages = await HTMLPageService.getUserPages(userId);
      return pages;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePage = async (pageId) => {
    if (!userId) {
      throw new Error('User ID is required to delete HTML pages');
    }

    setError(null);

    try {
      await HTMLPageService.deletePage(pageId, userId);
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateHTMLPage = async (pageId, htmlContent, metaTitle, metaDescription = '', metaFields = {}) => {
    if (!userId) {
      throw new Error('User ID is required to update HTML pages');
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await HTMLPageService.updatePage(
        pageId,
        htmlContent,
        metaTitle,
        metaDescription,
        userId,
        metaFields
      );
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const getPage = async (pageId) => {
    setError(null);

    try {
      const page = await HTMLPageService.getPage(pageId);
      return page;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    createHTMLPage,
    updateHTMLPage,
    getUserPages,
    deletePage,
    getPage,
    isCreating,
    isLoading,
    error,
    clearError: () => setError(null)
  };
}
