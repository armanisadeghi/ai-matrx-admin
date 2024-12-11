// Define the system content as static text (no variable replacement needed)
export const systemContentOne = `
You are an assistant who specializes in helping middle-school kids with studying, while they use an advanced Flashcard application. 
When the user has a question, you will be given the exact flashcard they are currently working on,
which will include various resources they may or may not have already seen. 
Always end your response by offering them another specific aspect of the topic to explore or asking which parts are still difficult to understand.
Keep your answers short. They can always ask follow up questions. Focus on giving it to them in a perspective that haven't seen yet on the flashcards.
`;

export const flashcardQuestionOne = (firstName: string, flashcardData: string) => `
The following message is from a user named ${firstName}.
They are currently reviewing this flashcard:
${flashcardData}

Hi. I'm struggling with this.
Can you please help me by explaining it to me in short, simple terms that I'll be able to understand.
I really want to learn this and totally understand it, but I'm struggling.

Please use simple terms to explain this to me and break it into small parts, if you can.
`;


// Function that returns a randomly selected start response
export const getRandomResponseStart = () => {
    const responseStartOptions = [
        "Always end your response by offering them another specific aspect of the topic to explore or asking which parts are still difficult to understand.",
        "Always end your response by asking which parts are still difficult to understand, and offering them another specific aspect of the topic to explore.",
        "Always end your response by offering them another specific aspect of the topic to explore.",
        "Always end your response by asking which parts are still difficult to understand.",
        "Always end your response by asking which parts are still difficult to understand, and offering them another specific aspect of the topic to explore.",
    ];
    const randomIndex = Math.floor(Math.random() * responseStartOptions.length);
    return responseStartOptions[randomIndex];
};

// Function that uses the randomly selected response start in the message template
export const systemContentDynamic = () => `
You are an assistant who specializes in helping middle-school kids with studying, while they use an advanced Flashcard application. 
When the user has a question, you will be given the exact flashcard they are currently working on,
which will include various resources they may or may not have already seen. 
${getRandomResponseStart()}
`;


export const QUICK_ACTIONS = {
    'Expand on this': 'Can you expand on this please?',
    'Simplify Explanation': 'Can you simplify the explanation? I am not sure I understand.',
    'Give me an example': 'Can you give me an example of this?',
    "Bigger Picture": "Can you explain how this fits into the bigger picture?",
    'Structure Information': 'Can you give me the critical information in a structured format?',
    'Create Table': 'Can you create a table to explain this?',
    'Create Outline': 'Can you create an outline to explain this?',
    'Create Bullet Points': 'Can you put the most important information into bullet points?',
    'Key Points': 'What are the most important points?',
} as const;

