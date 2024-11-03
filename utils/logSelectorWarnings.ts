// utils/logSelectorWarning.ts

export const logSelectorWarning = (
    category: string,
    name: string,
    args: any[],
    issue: Error | string // Accept either an Error or a warning message
) => {
    const isWarning = typeof issue === 'string';
    const message = isWarning
                    ? issue
                    : issue.stack; // Use error stack if available, otherwise use the warning message.

    console.warn(
        `%c⚠️ Selector Warning in ${category} - ${name}:\n\n` +
        `%cDetails:\n` +
        `%cSelector Name: %c${name}\n` +
        `%cCategory: %c${category}\n` +
        `%cArguments: %c${JSON.stringify(args, null, 2)}\n\n` +
        (isWarning ? `%cWarning Message:\n${message}` : `%cError Stack:\n${message}`),
        "color: orange; font-weight: bold; font-size: 16px;",
        "color: #d9534f; font-weight: bold;",
        "color: #5bc0de;", "color: #0275d8; font-weight: bold;",
        "color: #5bc0de;", "color: #0275d8; font-weight: bold;",
        "color: #5bc0de;", "color: #0275d8; font-weight: bold;",
        "color: #d9534f;"
    );
};
