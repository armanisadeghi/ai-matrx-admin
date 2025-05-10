/**
 * Client-side utility for fetching app and applet data
 */

// Fetch app and applet by slug
export async function fetchAppBySlug(slug: string) {
  console.log('Client-side fetchAppBySlug:', slug);
  
  try {
    const response = await fetch(`/api/apps/${slug}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || `Failed to fetch app: ${response.status}`;
      console.error('Error fetching app by slug:', errorMessage);
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('App data fetched successfully by slug');
    return data;
  } catch (error) {
    console.error('Error in fetchAppBySlug:', error);
    throw error;
  }
}

// Fetch app and applet by ID
export async function fetchAppById(id: string) {
  console.log('Client-side fetchAppById:', id);
  
  try {
    const response = await fetch(`/api/apps/id/${id}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || `Failed to fetch app: ${response.status}`;
      console.error('Error fetching app by ID:', errorMessage);
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('App data fetched successfully by ID');
    return data;
  } catch (error) {
    console.error('Error in fetchAppById:', error);
    throw error;
  }
} 