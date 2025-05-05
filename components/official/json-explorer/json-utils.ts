export const getKeysAtPath = (data, path = []) => {
    try {
        let currentData = data;

        // Navigate to the current path
        for (const key of path) {
            if (key === "All") continue;

            // Handle "Item X" and "Object X" formats
            if (key.startsWith("Item ")) {
                const index = parseInt(key.replace("Item ", ""));
                currentData = currentData[index];
            } else if (key.startsWith("Object ")) {
                const index = parseInt(key.replace("Object ", ""));
                currentData = currentData[index];
            } else {
                currentData = currentData[key];
            }
        }

        // Return keys at current level
        if (currentData && typeof currentData === "object") {
            if (Array.isArray(currentData)) {
                if (currentData.length === 0) {
                    return ["All"]; // Empty array
                }

                // Always show array items as "Item X"
                return ["All", ...currentData.map((_, index) => `Item ${index}`)];
            } else {
                // For regular objects with keys
                const keys = Object.keys(currentData);
                if (keys.length > 0) {
                    return ["All", ...keys];
                } else {
                    // Empty object
                    return ["All"];
                }
            }
        }

        return ["All"];
    } catch (error) {
        console.error("Error getting keys at path:", error);
        return ["All"];
    }
};

export const getDataAtPath = (data, path = []) => {
    try {
        let currentData = data;

        // Navigate through the path, but skip 'All' selections
        for (const key of path) {
            if (key === "All") continue;

            // Handle various key formats
            if (key.startsWith("Item ")) {
                const index = parseInt(key.replace("Item ", ""));
                currentData = currentData[index];
            } else if (key.startsWith("Object ")) {
                const index = parseInt(key.replace("Object ", ""));
                currentData = currentData[index];
            } else {
                currentData = currentData[key];
            }
        }

        return currentData;
    } catch (error) {
        console.error("Error getting data at path:", error);
        return null;
    }
};

// Helper to handle complex array structures
export const getNextLevelOptions = (data) => {
    if (!data || typeof data !== "object") return ["All"];

    if (Array.isArray(data)) {
        if (data.length === 0) return ["All"];

        // Special handling for arrays of arrays or arrays of objects
        return ["All", ...data.map((_, index) => `Item ${index}`)];
    } else {
        const keys = Object.keys(data);
        if (keys.length === 0) return ["All"];
        return ["All", ...keys];
    }
};

// Generate a comprehensive path description
export const generatePathDescription = (currentPath) => {
    if (currentPath.length === 0) return "Root object";

    const pathElements = [];

    // Iterate through all path elements
    for (let i = 0; i < currentPath.length; i++) {
        const [_, key] = currentPath[i];
        if (key === "All") continue; // Skip "All" selections

        // Ensure key is treated as a string
        const keyStr = String(key);

        if (keyStr.startsWith("Item ")) {
            // For array items
            const index = parseInt(keyStr.replace("Item ", ""));
            pathElements.push(`Item ${index}`);
        } else if (keyStr.startsWith("Object ")) {
            // For object items in arrays
            const index = parseInt(keyStr.replace("Object ", ""));
            pathElements.push(`Object ${index}`);
        } else {
            // For normal object keys
            pathElements.push(`"${keyStr}"`);
        }
    }

    return pathElements.length > 0 ? pathElements.join(" → ") : "Root object";
};


export const generateAccessPath = (currentPath) => {
    if (currentPath.length === 0) return "data";

    // Start with the base
    let accessPath = "data";

    // Iterate through all path elements
    for (let i = 0; i < currentPath.length; i++) {
        const [_, key] = currentPath[i];
        if (key === "All") continue; // Skip "All" selections

        // Ensure key is treated as a string
        const keyStr = String(key);

        if (keyStr.startsWith("Item ")) {
            // For array items
            const index = parseInt(keyStr.replace("Item ", ""));
            accessPath += `[${index}]`;
        } else if (keyStr.startsWith("Object ")) {
            // For object items in arrays
            const index = parseInt(keyStr.replace("Object ", ""));
            accessPath += `[${index}]`;
        } else {
            // For normal object keys
            accessPath += `["${keyStr}"]`;
        }
    }

    return accessPath;
};
