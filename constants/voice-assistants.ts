import { Assistant, AvailableAssistants } from "@/types/voice/voiceAssistantTypes";

const DEFAULT_IMAGE = '/assistants/matrx-ai-avatar-male.jpeg';

export const assistants: Assistant[] = [
    {
        id: 'defaultVoiceAssistant',
        name: 'Matrx AI',
        title: 'Friendly AI Voice Assistant',
        description: 'A friendly and conversational assistant designed to help with any task in a clear and supportive manner.',
        imagePath: '/assistants/matrx-ai-avatar-female.jpeg',
        capabilities: ['General assistance', 'Conversational support', 'Task management']
    },
    {
        id: 'voiceAssistant',
        name: 'Matrx AI',
        title: 'Friendly AI Voice Assistant',
        description: 'A brief, conversational AI assistant with advanced speech synthesis, ideal for voice interactions.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Voice interaction', 'Task management', 'General help']
    },
    {
        id: 'developmentExpert',
        name: 'Development Expert',
        title: 'Professional Developer Assistant',
        description: 'Provides expert advice on software development, coding, and best practices for developers.',
        imagePath: '/assistants/development-expert-male-avatar.jpeg',
        capabilities: ['React.js', 'State management', 'Tailwind CSS', 'Python', 'TypeScript']
    },
    {
        id: 'debateCoach',
        name: 'Debate Coach',
        title: 'Professional Debate Coach',
        description: 'Helps students practice for debates by simulating tough arguments and offering constructive feedback.',
        imagePath: '/assistants/debate-coach-male-avatar.jpeg', // Change to female if applicable
        capabilities: ['Debate preparation', 'Rhetoric', 'Public speaking']
    },
    {
        id: 'mathTutor',
        name: 'Math Tutor',
        title: 'Mathematics Tutor',
        description: 'Provides clear and encouraging assistance with math problems and concepts tailored to student needs.',
        imagePath: '/assistants/math-tutor-avatar.jpeg',
        capabilities: ['Step-by-step math help', 'Algebra', 'Calculus', 'Geometry']
    },
    {
        id: 'historyTeacher',
        name: 'History Teacher',
        title: 'History Educator',
        description: 'Explains historical events and concepts in an engaging way, perfect for homework and test prep.',
        imagePath: '/assistants/history-tutor-male-avatar.jpeg', // Change to female if applicable
        capabilities: ['Historical analysis', 'Essay writing', 'World history']
    },
    {
        id: 'scienceTeacher',
        name: 'Science Teacher',
        title: 'Scientific Educator',
        description: 'Simplifies complex scientific concepts in physics, chemistry, and biology for better understanding.',
        imagePath: '/assistants/science-tutor-male-avatar.jpeg', // Change to female if applicable
        capabilities: ['Physics', 'Chemistry', 'Biology', 'Homework help']
    },
    {
        id: 'englishTeacher',
        name: 'English Teacher',
        title: 'English and Literature Expert',
        description: 'Assists with grammar, literary analysis, and creative writing while promoting language mastery.',
        imagePath: '/assistants/english-tutor-female-avatar.jpeg', // Change to male if applicable
        capabilities: ['Grammar', 'Essay writing', 'Literary analysis']
    },
    {
        id: 'reactDevelopmentExpert',
        name: 'React Development Expert',
        title: 'React Development Specialist',
        description: 'Offers best practices and guidance for efficient React.js development using modern tools.',
        imagePath: '/assistants/react-developer-male-avatar.jpeg',
        capabilities: ['React.js', 'State management', 'Tailwind CSS']
    },
    {
        id: 'pythonDevelopmentExpert',
        name: 'Python Development Expert',
        title: 'Python Programming Specialist',
        description: 'Delivers high-quality Python programming insights and modular development advice.',
        imagePath: '/assistants/python-developer-male-avatar.jpeg',
        capabilities: ['Python coding', 'Data analysis', 'Web development']
    },
    {
        id: 'typeScriptDevelopmentExpert',
        name: 'TypeScript Development Expert',
        title: 'TypeScript Specialist',
        description: 'Focuses on clean, efficient TypeScript development with attention to type safety and simplicity.',
        imagePath: '/assistants/typescript-developer-male-avatar.jpeg',
        capabilities: ['TypeScript', 'Static typing', 'Web application design']
    },
    {
        id: 'businessCoach',
        name: 'Business Coach',
        title: 'Entrepreneurship and Leadership Coach',
        description: 'Provides actionable advice on business strategy, leadership, and team building.',
        imagePath: '/assistants/business-coach-male-avatar.jpeg', // Change to female if applicable
        capabilities: ['Business strategy', 'Leadership', 'Growth planning']
    },
    {
        id: 'hrExpert',
        name: 'HR Expert',
        title: 'Human Resources Consultant',
        description: 'Advises on recruitment, workforce management, and building a strong organizational culture.',
        imagePath: '/assistants/hr-expoert-female-avatar.jpeg',
        capabilities: ['Recruitment', 'HR compliance', 'Workforce strategy']
    },
    {
        id: 'candy',
        name: 'Candice AI',
        title: 'Friendly and Fun AI Assistant',
        description: 'A lighthearted, fun assistant great for casual conversations and creative support.',
        imagePath: '/assistants/candice-ai-avatar.jpeg',
        capabilities: ['Creative writing', 'Engaging interactions', 'Entertainment']
    }
];

// Update the getAssistant function to correctly handle undefined values
export const getAssistant = (id: AvailableAssistants): Assistant => {
    const assistant = assistants.find(a => a.id === id);
    return assistant || assistants[0]; // Return the first assistant as a fallback
};

// Update assistantOptions with correct field references
export const assistantOptions = assistants.map(assistant => ({
    id: assistant.id,
    name: assistant.name,
    title: assistant.title,
    description: assistant.description,
    imagePath: assistant.imagePath,
    capabilities: assistant.capabilities
}));

