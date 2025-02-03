import { supabase } from '@/utils/supabase/client';

interface CreateRelatedRecordsParams<T extends object, U extends object> {
  parentTable: string;
  childTable: string;
  parentData: T;
  childData: U;
  foreignKeyField: string;
}

interface CreateRelatedRecordsResult<T, U> {
  parent: T;
  child: U;
  error: Error | null;
}

export async function createRelatedRecords<T extends object, U extends object>({
  parentTable,
  childTable,
  parentData,
  childData,
  foreignKeyField,
}: CreateRelatedRecordsParams<T, U>): Promise<CreateRelatedRecordsResult<T, U>> {
  try {
    // Start a Supabase transaction
    const { data: parent, error: parentError } = await supabase
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

    const { data: child, error: childError } = await supabase
      .from(childTable)
      .insert(childWithFK)
      .select('*')
      .single();

    if (childError) {
      // If child creation fails, we should ideally delete the parent record
      await supabase.from(parentTable).delete().eq('id', parent.id);
      throw new Error(`Error creating child record: ${childError.message}`);
    }

    return {
      parent,
      child,
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
