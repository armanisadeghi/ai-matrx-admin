# Supabase Setup Requirements and Assumptions

## Required Changes in Supabase

1. **Table Structure**:
   The script assumes the existence of two main tables:

   a) `repositories` table:
    - Primary key: `name` (string)
    - Other fields to match your `IRepoData` interface

   b) `files` table:
    - `repo_name` (string, foreign key to repositories.name)
    - `path` (string)
    - `content` (text or jsonb, depending on how you store file content)
    - Primary key: Composite key of (`repo_name`, `path`)

2. **Realtime Enabled**:
   The script uses Supabase's realtime features. Ensure realtime is enabled for both `repositories` and `files` tables.

3. **RLS (Row Level Security) Policies**:
   Depending on your security requirements, you may need to set up RLS policies to control access to these tables.

4. **Indexes**:
   For performance, consider adding an index on the `repo_name` column in the `files` table.

## Assumptions Made by the Script

1. **Authentication**:
   The script assumes it's operating in an authenticated context. It doesn't handle authentication itself.

2. **Data Structure**:
    - Repositories are uniquely identified by their `name`.
    - Files are uniquely identified within a repository by their `path`.
    - The script assumes that the entire file content can be stored and transferred as a single field.

3. **Conflict Resolution**:
   The script uses `upsert` operations, which will overwrite existing data. It doesn't implement complex conflict resolution strategies.

4. **Realtime Subscriptions**:
   The script assumes it can subscribe to all changes on the `repositories` and `files` tables.

5. **Data Consistency**:
   It assumes that IndexedDB is the source of truth for the client, and periodic syncs will resolve any inconsistencies.

6. **Network Connectivity**:
   The script doesn't explicitly handle offline scenarios, assuming the app is always online when in use.

## Implementation Steps in Supabase

1. Create the `repositories` table:
   ```sql
   CREATE TABLE repositories (
     name TEXT PRIMARY KEY,
     -- Add other fields as needed
   );
   ```

2. Create the `files` table:
   ```sql
   CREATE TABLE files (
     repo_name TEXT REFERENCES repositories(name),
     path TEXT,
     content TEXT, -- or JSONB if storing structured data
     PRIMARY KEY (repo_name, path)
   );
   ```

3. Enable realtime for both tables in the Supabase dashboard.

4. Set up RLS policies as needed. For example, to allow read/write for authenticated users:
   ```sql
   ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
   ALTER TABLE files ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Allow full access to authenticated users" ON repositories
     FOR ALL USING (auth.role() = 'authenticated');

   CREATE POLICY "Allow full access to authenticated users" ON files
     FOR ALL USING (auth.role() = 'authenticated');
   ```

5. Add an index to the `files` table for `repo_name`:
   ```sql
   CREATE INDEX idx_files_repo_name ON files(repo_name);
   ```

Ensure these changes are implemented in your Supabase project before integrating the sync script into your application.