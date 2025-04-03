// Format the relative time for a conversation
const formatRelativeTime = (timestamp: string | Date | undefined): string => {
    if (!timestamp) return "Unknown date";

    let dateInput: string | Date;

    // If the timestamp is a string and doesn't already specify a timezone (Z or +/- offset),
    // assume it's UTC and append 'Z'.
    if (typeof timestamp === 'string' && !/[Z+-]\d{2}:?\d{2}$/.test(timestamp)) {
        // Check if it looks like an ISO-ish string that just needs the Z
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestamp)) {
           dateInput = timestamp + 'Z';
           console.log("dateInput", dateInput);
        } else {
            // If it's not in the expected format, parse as is, but it might be unreliable
            dateInput = timestamp;
        }
    } else {
        dateInput = timestamp; // It's already a Date object or has timezone info
    }

    const date = new Date(dateInput);

    // Check if the date is valid after parsing
    if (isNaN(date.getTime())) {
        console.warn("formatRelativeTime: Failed to parse date input.", { original: timestamp, processed: dateInput });
        return "Invalid date";
    }

    const now = new Date();

    // Calculate time difference in milliseconds
    const diffMs = now.getTime() - date.getTime();

    // --- Conditional Log for Negative Difference ---
    // Log a warning if the calculated date is still in the future after attempting UTC parsing.
    // This might indicate clock skew or an actual future date entry.
    if (diffMs < 0) {
      console.warn("formatRelativeTime: Calculated date is in the future.", {
          inputTimestamp: timestamp,
          parsedDateUTC: date.toISOString(),
          nowUTC: now.toISOString(),
          differenceMs: diffMs
      });
      // Decide how to handle future dates. Returning the formatted date is often reasonable.
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    // --- End Conditional Log ---


    // Calculate positive differences
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Format relative time (now only for past/present dates)
    if (diffMins < 1) {
      // Difference is less than 60 seconds
      return "Just now";
    } else if (diffMins < 60) {
      // Difference is less than 60 minutes
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      // Difference is less than 24 hours
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      // Difference is less than 7 days
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      // For older dates (7 days or more), return the formatted date
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  export default formatRelativeTime;