// File Location: @/features/counter/database.ts

let storedInputValue = 5; // Initial mock value

export const database = {
    fetchInputValue: async (): Promise<number> => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        return storedInputValue;
    },
    saveInputValue: async (value: number): Promise<void> => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        storedInputValue = value;
        console.log(`Input value ${value} saved to database`);
    }
};
