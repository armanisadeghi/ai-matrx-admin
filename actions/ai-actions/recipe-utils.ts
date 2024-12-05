

const systemMessageOptions = {
    debateCoach: `- You are a professional debate coach brought in to help 8th graders prepare for an upcoming national debate.`,
    voiceAssistant: `- You are a voice assistant designed to help users with their daily tasks.`,
    mathTutor: `- You are a math tutor brought in to help students with their math homework.`,
    historyTeacher: `- You are a history teacher brought in to help students with their history project.`,
    scienceTeacher: `- You are a science teacher brought in to help students with their science project.`,
    englishTeacher: `- You are an English teacher brought in to help students with their English project.`,
    reactDevelopmentExpert: `- You are a React development expert brought in to help students with their React project.`,
    pythonDevelopmentExpert: `- You are a Python development expert brought in to help students with their Python project.`,
    typeScriptDevelopmentExpert: `- You are a TypeScript development expert brought in to help students with their TypeScript project.`,
    businessCoach: `- You are a business coach brought in to help students with their business project.`,
    hrExpert: `- You are an HR expert brought in to help students with their HR project.`,
};


const preDefinedInitialMessages = {
    debateCoach: [
        {
            role: 'system',
            content: systemMessageOptions.debateCoach,
        },
        {
            role: 'assistant',
            content: 'Hello, I am here to help.',
        },
        {
            role: 'user',
            content: 'Hi. My name is {c33aea28-8b61-4256-9c84-9483e93662d2}! and I am in {5fc6bbee-3674-4706-aff2-233c9d71ec73}! grade. I have a big debate coming up and I really need help.',
        }
    ],
    voiceAssistant: [
        {
            role: 'system',
            content: systemMessageOptions.voiceAssistant,
        },
    ],
    mathTutor: [
        {
            role: 'system',
            content: systemMessageOptions.mathTutor,
        },
    ],
    historyTeacher: [
        {
            role: 'system',
            content: systemMessageOptions.historyTeacher,
        },
    ],
    scienceTeacher: [
        {
            role: 'system',
            content: systemMessageOptions.scienceTeacher,
        },
    ],
    englishTeacher: [
        {
            role: 'system',
            content: systemMessageOptions.englishTeacher,
        },
    ],
    reactDevelopmentExpert: [
        {
            role: 'system',
            content: systemMessageOptions.reactDevelopmentExpert,
        },
    ],
    pythonDevelopmentExpert: [
        {
            role: 'system',
            content: systemMessageOptions.pythonDevelopmentExpert,
        },
    ],
    typeScriptDevelopmentExpert: [
        {
            role: 'system',
            content: systemMessageOptions.typeScriptDevelopmentExpert,
        },
    ],
    businessCoach: [
        {
            role: 'system',
            content: systemMessageOptions.businessCoach,
        },
    ],
    hrExpert: [
        {
            role: 'system',
            content: systemMessageOptions.hrExpert,
        },
    ],
}

const replacePlaceholders = (templateMessages, replacements) => {
    const replacementsMap = (replacements || []).reduce((map, { id, value }) => {
        map[id] = value;
        return map;
    }, {});

    const clonedMessages = JSON.parse(JSON.stringify(templateMessages));

    const replaceInContent = (content) => {
        return content.replace(/{(.*?)}/g, (match, uuid) => {
            return replacementsMap[uuid] || match;
        });
    };

    Object.keys(clonedMessages).forEach((key) => {
        clonedMessages[key] = clonedMessages[key].map((message) => {
            if (message.content) {
                message.content = replaceInContent(message.content);
            }
            return message;
        });
    });

    return clonedMessages;
};

// The orchestrator function
const getInitialMessages = (optionName, replacements = []) => {
    if (!preDefinedInitialMessages[optionName]) {
        throw new Error(`Message option "${optionName}" not found.`);
    }

    const templateMessages = { [optionName]: preDefinedInitialMessages[optionName] };
    const updatedMessages = replacePlaceholders(templateMessages, replacements);
    return updatedMessages[optionName];
};

/*
// Example usage
const replacements = [
    { id: "c33aea28-8b61-4256-9c84-9483e93662d2", value: "John Doe" },
    { id: "5fc6bbee-3674-4706-aff2-233c9d71ec73", value: "10th" },
];

try {
    const messages = getInitialMessages("debateCoach", replacements);
    console.log(messages);
} catch (error) {
    console.error(error.message);
}

try {
    const messagesWithoutReplacements = getInitialMessages("mathTutor");
    console.log(messagesWithoutReplacements);
} catch (error) {
    console.error(error.message);
}
*/
