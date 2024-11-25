// Constants
export const APP_SETTINGS: AppSettings = {
    sheetTitle: "Configure Your Selection",
    sheetDescription: "Please complete the following steps",
    options: [
        {
            id: "opt1",
            label: "Option 1",
            processingChoices: {
                choice1: ["Premium A", "Premium B", "Premium C"],
                choice2: ["Gold Plan", "Platinum Plan"],
                choice3: ["Priority Support", "Standard Support"]
            }
        },
        {
            id: "opt2",
            label: "Option 2",
            processingChoices: {
                choice1: ["Basic A", "Basic B"],
                choice2: ["Silver Plan", "Bronze Plan"],
                choice3: ["Email Support", "Chat Support", "No Support"]
            }
        }
    ],
    validIdPattern: /^\d{5}$/,
};

