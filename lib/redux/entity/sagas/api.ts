import { supabase } from '@/utils/supabase/client';
import type { Database } from '@/types/database.types';

type TableName = keyof Database['public']['Tables'];

interface CreateRelatedRecordsParams<T extends object, U extends object> {
  parentTable: TableName;
  childTable: TableName;
  parentData: T;
  childData: U;
  foreignKeyField: string;
}

interface CreateRelatedRecordsResult<T, U> {
  parent: T | null;
  child: U | null;
  error: Error | null;
}

/**
 * Generic helper. Supabase's per-table `Insert`/`Row` types can't be resolved
 * from a generic `TableName`, so we bypass the typed client locally. The
 * public signature still constrains the caller to a real table name (via
 * `TableName`), so removing or renaming a table surfaces at call sites.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any;

export async function createRelatedRecords<T extends object, U extends object>({
  parentTable,
  childTable,
  parentData,
  childData,
  foreignKeyField,
}: CreateRelatedRecordsParams<T, U>): Promise<CreateRelatedRecordsResult<T, U>> {
  try {
    const client = supabase as unknown as UntypedClient;
    const { data: parent, error: parentError } = await client
      .from(parentTable)
      .insert(parentData)
      .select('*')
      .single();

    if (parentError) {
      throw new Error(`Error creating parent record: ${parentError.message}`);
    }

    // Add the foreign key to the child data
    const childWithFK = {
      ...childData,
      [foreignKeyField]: parent.id,
    };

    const { data: child, error: childError } = await client
      .from(childTable)
      .insert(childWithFK)
      .select('*')
      .single();

    if (childError) {
      // If child creation fails, we should ideally delete the parent record
      await client.from(parentTable).delete().eq('id', parent.id);
      throw new Error(`Error creating child record: ${childError.message}`);
    }

    return {
      parent: parent as T,
      child: child as U,
      error: null,
    };
  } catch (error) {
    return {
      parent: null,
      child: null,
      error: error instanceof Error ? error : new Error('Unknown error occurred'),
    };
  }
}
