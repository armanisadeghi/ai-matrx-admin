# Supabase-IndexedDB Integration Guide

This guide provides step-by-step instructions for integrating the Supabase-IndexedDB sync system into your Next.js 14 app router project.

## Prerequisites

- Ensure you have the `supabase-local-indexedDB.ts` file attached to this guide.
- Make sure you have the `@supabase/supabase-js` package installed in your project.

## Integration Steps

1. **Place the supabase-local-indexedDB.ts file**

   Move the attached `supabase-local-indexedDB.ts` file to the following location in your project structure:
   ```
   app/dashboard/code-editor/utils/supabase-local-indexedDB.ts
   ```

2. **Update Supabase credentials**

   Open `supabase-local-indexedDB.ts` and replace the placeholder Supabase credentials with your actual project credentials:
   ```typescript
   const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')
   ```

3. **Initialize SyncManager in your app**

   Open `app/dashboard/code-editor/layout.tsx` (or create it if it doesn't exist) and add the following code:

   ```typescript
   import { useEffect } from 'react'
   import { syncManager } from './utils/Supabase-IndexedDB'

   export default function CodeEditorLayout({ children }: { children: React.ReactNode }) {
     useEffect(() => {
       syncManager.startPeriodicSync()
       return () => syncManager.stopPeriodicSync()
     }, [])

     return <>{children}</>
   }
   ```

4. **Update IndexedDB operations**

   Modify `app/dashboard/code-editor/utils/local-indexedDB.ts` to include syncing after write operations. For example:

   ```typescript
   import { syncManager } from './Supabase-IndexedDB'

   // Example of updating an existing method
   async addRepository(repo: IRepoData): Promise<void> {
     await super.addRepository(repo)
     await syncManager.syncToSupabase()
   }

   // Add similar updates to other write methods (updateFile, deleteFile, etc.)
   ```

5. **Handle real-time updates in components**

   Update components that display repository or file data to react to real-time changes. For example, in `app/dashboard/code-editor/components/ProjectManager.tsx`:

   ```typescript
   import { useEffect, useState } from 'react'
   import { syncManager } from '../utils/Supabase-IndexedDB'
   import { indexedDBStore } from '../utils/indexedDB'

   export default function ProjectManager() {
     const [repositories, setRepositories] = useState([])

     useEffect(() => {
       const loadRepositories = async () => {
         const repos = await indexedDBStore.getRepositories()
         setRepositories(repos)
       }

       loadRepositories()

       const realtimeHandler = () => {
         loadRepositories()
       }

       syncManager.onRealtimeUpdate(realtimeHandler)

       return () => {
         syncManager.offRealtimeUpdate(realtimeHandler)
       }
     }, [])

     // Rest of the component...
   }
   ```

6. **Update Supabase schema**

   Ensure your Supabase database has the necessary tables:

    - `repositories` table:
        - `name` (primary key)
        - Other relevant fields from your `IRepoData` interface

    - `files` table:
        - `repo_name` (foreign key to repositories.name)
        - `path`
        - `content`
        - Primary key on (repo_name, path)

7. **Test the integration**

    - Run your app and test creating, updating, and deleting repositories and files.
    - Verify that changes are synced between IndexedDB and Supabase.
    - Test real-time updates by making changes in Supabase directly and observing the app's response.

## Notes

- The sync system is set to run every 5 minutes by default. You can adjust this in the `SyncManager` class if needed.
- Error handling and conflict resolution may need to be improved based on your specific requirements.
- Consider implementing a loading state while initial sync is in progress.

If you encounter any issues or need further assistance, please don't hesitate to ask for help.