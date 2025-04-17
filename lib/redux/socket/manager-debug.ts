
// Define logging functions at the top of the file, after imports
export const logTaskStart = (serviceName: string, data: any, sid: string) => {
    console.log("\n----------- [SOCKET MANAGER] STARTING TASK: ", serviceName, "-------------\n");
    console.log("Service name:", serviceName);
    console.log("Data:", JSON.stringify(data, null, 2));
    console.log("--------------------------------");
};

export const logFallbackResponse = (fallbackEventName: string, fallbackResponse: any) => {
    console.log("\n----------- [SOCKET MANAGER] FALLBACK RESPONSE FOR EVENT: ", fallbackEventName, "-------------\n");
    console.log("FALLBACK LISTENER TRIGGERED for:", fallbackEventName);
    console.log("Fallback Response Type:", typeof fallbackResponse);
    console.log(
        "Fallback Response Structure:",
        JSON.stringify({
            isObject: typeof fallbackResponse === "object",
            hasDataProperty: fallbackResponse && typeof fallbackResponse === "object" && "data" in fallbackResponse,
            keys: fallbackResponse && typeof fallbackResponse === "object" ? Object.keys(fallbackResponse) : [],
        })
    );
    console.log("Fallback Response Raw:", fallbackResponse);
    console.log("--------------------------------\n");
};

export const logFallbackData = (fallbackEventName: string, fallbackData: any) => {
    console.log("\n=================== [SOCKET MANAGER] FALLBACK DATA ===================");
    console.log("FALLBACK LISTENER TRIGGERED for:", fallbackEventName);
    console.log("Fallback Response Type:", typeof fallbackData);
    console.log(
        "Fallback Response Structure:",
        JSON.stringify({
            isObject: typeof fallbackData === "object",
            hasDataProperty: fallbackData && typeof fallbackData === "object" && "data" in fallbackData,
            keys: fallbackData && typeof fallbackData === "object" ? Object.keys(fallbackData) : [],
        })
    );
    console.log("Fallback Response Raw:", fallbackData);
    console.log("========================================\n");
};

// Add these logging functions alongside the previous ones
export const logTaskConfirmed = (eventName: string, newEventName: string) => {
    console.log("\n----------- [SOCKET MANAGER] TASK CONFIRMED: ", eventName, "-------------\n");
    console.log("Task confirmed. Switching listener to event:", newEventName);
    console.log("--------------------------------");
};

export const logDirectResponse = (eventName: string, finalResponse: any) => {
    console.log("\n----------- [SOCKET MANAGER] DIRECT RESPONSE FOR EVENT: ", eventName, "-------------\n");
    console.log("DIRECT LISTENER TRIGGERED for:", eventName);
    console.log("Direct Response Type:", typeof finalResponse);
    console.log(
        "Direct Response Structure:",
        JSON.stringify({
            isObject: typeof finalResponse === "object",
            hasDataProperty: finalResponse && typeof finalResponse === "object" && "data" in finalResponse,
            keys: finalResponse && typeof finalResponse === "object" ? Object.keys(finalResponse) : [],
        })
    );
    console.log("Direct Response Raw:", finalResponse);
    console.log("--------------------------------\n");
};
