// Define the mapping for specific string conversions
const stringMap: Record<string, string> = {
    id: "ID",
    url: "URL",
    api: "API",
};

export const formatLabel = (key: string): string => {
    // Split the string into words
    let words = key.split("_");

    // Process each word
    words = words.map((word) => {
        // Capitalize first letter if word is longer than 2 letters
        if (word.length > 2) {
            word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        } else {
            // Keep short words (≤2 letters) in lowercase
            word = word.toLowerCase();
        }
        return word;
    });

    // Join the words back together with spaces
    let result = words.join(" ");

    // Apply mapped replacements last
    Object.entries(stringMap).forEach(([search, replacement]) => {
        // Create a case-insensitive regex for the word with word boundaries
        const regex = new RegExp(`\\b${search}\\b`, "gi");
        result = result.replace(regex, replacement);
    });

    return result;
};


export const formatPlaceholder = (key: string): string => {
    // Step 1: Convert the entire string to lowercase and split
    let words = key.toLowerCase().split('_');
    
    // Join the words with spaces
    let result = words.join(' ');
  
    // Step 2: Apply mapped replacements
    Object.entries(stringMap).forEach(([search, replacement]) => {
      const regex = new RegExp(`\\b${search}\\b`, 'gi');
      result = result.replace(regex, replacement);
    });
  
    // Step 3: Add "Enter " at start and "..." at end
    return `Enter ${result}...`;
  };