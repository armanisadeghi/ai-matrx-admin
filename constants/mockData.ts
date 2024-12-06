// types/dataSelectionTypes.ts
export interface DataItem {
    id: string;
    title: string;
    content: string;
    category: string;
    tags?: string[];
}

// constants/mockData.ts
export const mockUserData: DataItem[] = [
    {
        id: '1',
        title: 'React useEffect Hook',
        content: `useEffect(() => {
  // Effect code here
  return () => {
    // Cleanup code
  };
}, [dependencies]);`,
        category: 'Code Snippets',
        tags: ['React', 'Hooks', 'Frontend']
    },
    {
        id: '2',
        title: 'API Error Handling',
        content: `try {
  const response = await fetch(url);
  const data = await response.json();
} catch (error) {
  console.error('Error:', error);
}`,
        category: 'Code Snippets',
        tags: ['API', 'Error Handling', 'JavaScript']
    },
    {
        id: '3',
        title: 'Project Requirements',
        content: "1. User authentication\n2. Real-time updates\n3. Mobile responsiveness",
        category: 'Documentation',
        tags: ['Requirements', 'Planning']
    },
    {
        id: '4',
        title: 'Database Schema',
        content: `users:
  - id: uuid
  - email: string
  - name: string
  
posts:
  - id: uuid
  - userId: uuid
  - content: text`,
        category: 'Documentation',
        tags: ['Database', 'Schema']
    }
];

export const categories = Array.from(new Set(mockUserData.map(item => item.category)));
