import { PostgrestError } from '@supabase/supabase-js';

interface SupabaseErrorDetails {
  message: string;
  details: string;
  hint: string;
  code: string;
}

/**
 * Formats Supabase/Postgres errors into readable messages
 */
export function formatSupabaseError(error: PostgrestError | any): SupabaseErrorDetails {
  // Handle PostgrestError from Supabase
  if (error && typeof error === 'object') {
    const message = error.message || 'Unknown error occurred';
    const details = error.details || 'No additional details available';
    const hint = error.hint || 'No hint available';
    const code = error.code || 'UNKNOWN';

    // Add common error code translations
    let readableMessage = message;
    
    switch (code) {
      case '42501': // insufficient_privilege
        readableMessage = 'Permission denied. You may not have access to perform this operation.';
        break;
      case '23505': // unique_violation
        readableMessage = 'A record with this unique value already exists.';
        break;
      case '23503': // foreign_key_violation
        readableMessage = 'Referenced record does not exist or has been deleted.';
        break;
      case '23502': // not_null_violation
        readableMessage = 'Required field is missing.';
        break;
      case '22P02': // invalid_text_representation
        readableMessage = 'Invalid data format provided.';
        break;
      case 'PGRST116': // No rows found
        readableMessage = 'No matching records found.';
        break;
      case 'PGRST204': // No content
        readableMessage = 'Operation completed but no data returned.';
        break;
    }

    return {
      message: readableMessage,
      details: details,
      hint: hint,
      code: code,
    };
  }

  // Fallback for non-Supabase errors
  return {
    message: error?.toString() || 'Unknown error',
    details: JSON.stringify(error, null, 2),
    hint: 'Check console for full error details',
    code: 'UNKNOWN',
  };
}

/**
 * Logs error to console (production-safe)
 */
export function logDetailedError(context: string, error: any) {
  // Simple error logging for production
  if (process.env.NODE_ENV === 'development') {
    console.log('Error in ', context, ':', error);
    console.error(`Error in ${context}:`, error);
  }
}

/**
 * Gets user-friendly error message for toast notifications
 */
export function getUserFriendlyError(error: any): string {
  const formatted = formatSupabaseError(error);
  
  // Return a concise message for users
  if (formatted.code === '42501') {
    return 'Permission denied. Please ensure you have admin access.';
  }
  
  if (formatted.hint && formatted.hint !== 'No hint available') {
    return `${formatted.message} Hint: ${formatted.hint}`;
  }
  
  return formatted.message;
}

