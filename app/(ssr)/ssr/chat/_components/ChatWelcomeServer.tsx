// app/(ssr)/ssr/chat/_components/ChatWelcomeServer.tsx
//
// Pure server component — renders the welcome screen structure.
// All visual elements are server-rendered HTML. The ChatWelcomeClient island
// handles interactivity (input, submit, variable changes) without altering
// the visible layout during hydration.

import ChatWelcomeClient from './ChatWelcomeClient';

export interface WelcomeAgent {
    promptId: string;
    name: string;
    description?: string;
    variableDefaults?: Array<{
        name: string;
        defaultValue?: string;
        required?: boolean;
    }>;
}

interface ChatWelcomeServerProps {
    agent: WelcomeAgent;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

export default function ChatWelcomeServer({
    agent,
    isAuthenticated,
    isAdmin,
}: ChatWelcomeServerProps) {
    const hasVariables = (agent.variableDefaults?.length ?? 0) > 0;
    const varCount = agent.variableDefaults?.length ?? 0;
    const showDescription = agent.description && varCount <= 3;

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Single scroll region */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div
                    className={`min-h-full flex flex-col items-center px-3 md:px-8 ${
                        varCount > 2
                            ? 'justify-start pt-8 md:pt-16 md:justify-center'
                            : 'justify-center'
                    }`}
                >
                    <div className="w-full max-w-3xl">
                        {/* Agent name + description — fully server rendered */}
                        <div
                            className={`text-center ${
                                varCount > 2 ? 'mb-3 md:mb-6' : 'mb-6 md:mb-8'
                            }`}
                        >
                            <h1
                                className={`font-semibold text-foreground ${
                                    varCount > 2
                                        ? 'text-xl md:text-3xl'
                                        : 'text-2xl md:text-3xl'
                                }`}
                            >
                                {agent.name || 'What can I help with?'}
                            </h1>
                            {showDescription ? (
                                <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                    {agent.description}
                                </p>
                            ) : !hasVariables ? (
                                <p className="mt-1 text-sm text-muted-foreground/70">
                                    AI with Matrx superpowers
                                </p>
                            ) : null}
                        </div>

                        {/* Client island — handles input, variables, mode buttons, submit.
                            Server renders the outer container so the layout is stable. */}
                        <ChatWelcomeClient
                            agent={agent}
                            isAuthenticated={isAuthenticated}
                            isAdmin={isAdmin}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
