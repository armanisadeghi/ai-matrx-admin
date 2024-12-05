import { Assistant, AssistantType } from "@/types/voice/voiceAssistantTypes";

const DEFAULT_IMAGE = '/assistants/happy-robot-avatar.jpg';

export const assistants: Assistant[] = [
    {
        id: 'voiceAssistant',
        name: 'Voice Assistant',
        title: 'AI Voice Assistant',
        description: 'A general-purpose AI assistant ready to help with any task.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Voice interaction', 'General assistance', 'Task management']
    },
    {
        id: 'debateCoach',
        name: 'Debate Coach',
        title: 'Professional Debate Coach',
        description: 'Expert in argumentation, rhetoric, and public speaking.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Debate strategies', 'Argument analysis', 'Public speaking tips']
    },
    {
        id: 'mathTutor',
        name: 'Math Tutor',
        title: 'Mathematics Tutor',
        description: 'Provides step-by-step explanations of complex math problems, from algebra to calculus.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Algebra', 'Calculus', 'Problem-solving techniques', 'Math theory']
    },
    {
        id: 'historyTeacher',
        name: 'History Teacher',
        title: 'History Educator',
        description: 'Helps students understand historical events, movements, and figures with a passion for the past.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['World history', 'Historical context', 'Research guidance', 'Essay writing tips']
    },
    {
        id: 'scienceTeacher',
        name: 'Science Teacher',
        title: 'Scientific Educator',
        description: 'A science teacher that can explain physics, chemistry, and biology in simple terms.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Physics', 'Chemistry', 'Biology', 'Scientific method']
    },
    {
        id: 'englishTeacher',
        name: 'English Teacher',
        title: 'Literature and Language Expert',
        description: 'Guides students in mastering the English language, from grammar to literary analysis.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Grammar', 'Literary analysis', 'Essay writing', 'Creative writing']
    },
    {
        id: 'reactDevelopmentExpert',
        name: 'React Development Expert',
        title: 'React Web Development Specialist',
        description: 'Provides in-depth knowledge on React.js and modern web development practices.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['React.js', 'Frontend development', 'State management', 'Component design']
    },
    {
        id: 'pythonDevelopmentExpert',
        name: 'Python Development Expert',
        title: 'Python Programming Specialist',
        description: 'Offers expert advice on Python programming, from beginner concepts to advanced techniques.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Python programming', 'Data analysis', 'Web development', 'Machine learning']
    },
    {
        id: 'typeScriptDevelopmentExpert',
        name: 'TypeScript Development Expert',
        title: 'TypeScript Specialist',
        description: 'Master of TypeScript, providing guidance on strong typing and modern JavaScript practices.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['TypeScript', 'Frontend development', 'Static typing', 'Web application architecture']
    },
    {
        id: 'businessCoach',
        name: 'Business Coach',
        title: 'Entrepreneurship and Leadership Coach',
        description: 'Offers strategic guidance on business growth, leadership, and entrepreneurship.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Business strategy', 'Leadership skills', 'Entrepreneurship', 'Team building']
    },
    {
        id: 'hrExpert',
        name: 'HR Expert',
        title: 'Human Resources Consultant',
        description: 'Helps with HR practices including recruitment, employee relations, and organizational development.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Recruitment', 'Employee relations', 'Performance management', 'HR compliance']
    },
    {
        id: 'candy',
        name: 'Candice AI',
        title: 'AI for Creative Writing and Storytelling',
        description: 'A creative AI assistant that helps you with writing stories, scripts, and creative content.',
        imagePath: DEFAULT_IMAGE,
        capabilities: ['Creative writing', 'Storytelling', 'Scriptwriting', 'Idea generation']
    }
];

export const getAssistant = (id: AssistantType): Assistant => {
    return assistants.find(a => a.id === id) || assistants[0];
};
export const assistantOptions = assistants.map(assistant => ({
    value: assistant.id,
    label: assistant.name,
    description: assistant.title,
    image: assistant.imagePath,
    capabilities: assistant.capabilities
}));
