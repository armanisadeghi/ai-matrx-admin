// Types of date formats supported by Supabase
export type SupabaseDateType = 'timestamptz' | 'timestamp' | 'date' | 'time';

/**
 * Get the appropriate HTML input type and format for a Supabase date type
 */
export const getInputConfig = (dbType: SupabaseDateType): { 
  inputType: 'datetime-local' | 'date' | 'time',
  displayFormat: string 
} => {
  switch (dbType) {
    case 'timestamptz':
    case 'timestamp':
      return { 
        inputType: 'datetime-local',
        displayFormat: "yyyy-MM-dd'T'HH:mm"
      };
    case 'date':
      return { 
        inputType: 'date',
        displayFormat: "yyyy-MM-dd"
      };
    case 'time':
      return { 
        inputType: 'time',
        displayFormat: "HH:mm:ss"
      };
  }
};

/**
 * Formats a date according to Supabase's expected format based on the column type
 * @param date - The date to format (Date object or ISO string)
 * @param dbDataType - The Supabase column type
 * @returns Formatted date string according to Supabase's expectations
 */
export const formatDateForSupabase = (
  date: Date | string,
  dbDataType: SupabaseDateType
): string => {
  // Convert string dates to Date objects
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  switch (dbDataType) {
    case 'timestamptz':
      // Format: YYYY-MM-DDTHH:mm:ss.sssZ (ISO 8601 with timezone)
      return dateObj.toISOString();

    case 'timestamp':
      // Format: YYYY-MM-DD HH:mm:ss
      return dateObj
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '');

    case 'date':
      // Format: YYYY-MM-DD
      return dateObj.toISOString().split('T')[0];

    case 'time':
      // Format: HH:mm:ss
      return dateObj
        .toISOString()
        .split('T')[1]
        .replace(/\.\d{3}Z$/, '');

    default:
      throw new Error(`Unsupported date type: ${dbDataType}`);
  }
};

/**
 * Parse a Supabase date string into a JavaScript Date object
 * @param dateStr - The date string from Supabase
 * @param dbDataType - The Supabase column type
 * @returns JavaScript Date object
 */
export const parseSupabaseDate = (
  dateStr: string,
  dbDataType: SupabaseDateType
): Date => {
  switch (dbDataType) {
    case 'timestamptz':
    case 'timestamp':
      return new Date(dateStr);

    case 'date':
      // Add time component to ensure consistent timezone handling
      return new Date(`${dateStr}T00:00:00Z`);

    case 'time':
      // Use current date with the specified time
      const today = new Date().toISOString().split('T')[0];
      return new Date(`${today}T${dateStr}Z`);

    default:
      throw new Error(`Unsupported date type: ${dbDataType}`);
  }
};

/**
 * Format a date to Supabase timestamptz format (ISO 8601 with timezone)
 * @param date - The date to format
 * @returns Formatted date string in timestamptz format
 */
export const formatTimestamptz = (date: Date | string): string => {
  return formatDateForSupabase(date, 'timestamptz');
};

/**
 * Format a date to Supabase timestamp format (without timezone)
 * @param date - The date to format
 * @returns Formatted date string in timestamp format
 */
export const formatTimestamp = (date: Date | string): string => {
  return formatDateForSupabase(date, 'timestamp');
};

/**
 * Format a date to Supabase date format (YYYY-MM-DD)
 * @param date - The date to format
 * @returns Formatted date string in date format
 */
export const formatDate = (date: Date | string): string => {
  return formatDateForSupabase(date, 'date');
};

/**
 * Format a date to Supabase time format (HH:mm:ss)
 * @param date - The date to format
 * @returns Formatted date string in time format
 */
export const formatTime = (date: Date | string): string => {
  return formatDateForSupabase(date, 'time');
};

// Usage examples:
/*
const now = new Date();

// Format current date for timestamptz
console.log(formatDateForSupabase(now, 'timestamptz'));
// Output: 2024-01-02T12:34:56.789Z

// Format current date for date only
console.log(formatDateForSupabase(now, 'date'));
// Output: 2024-01-02

// Parse a Supabase timestamptz
const parsed = parseSupabaseDate('2024-01-02T12:34:56.789Z', 'timestamptz');
console.log(parsed);
// Output: Date object
*/