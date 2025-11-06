'use client';

import { ArrowRight, Blocks, Bot, Layers, TestTube, Wrench, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTransition, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const routes = [
  {
    title: 'Prompt Builder',
    description: 'Advanced prompt construction with structured components',
    icon: Blocks,
    href: '/ai/prompts/experimental/builder',
  },
  {
    title: 'Chatbot Customizer',
    description: 'Customize and configure AI chatbot behavior',
    icon: Bot,
    href: '/ai/prompts/experimental/chatbot-customizer',
    nested: [
      {
        title: 'Instant Custom Chatbot',
        description: 'Quick chatbot setup and deployment',
        href: '/ai/prompts/experimental/chatbot-customizer/instant-custom-chatbot',
      },
      {
        title: 'Modular Chatbot',
        description: 'Build chatbots with modular components',
        href: '/ai/prompts/experimental/chatbot-customizer/modular',
      },
    ],
  },
  {
    title: 'Prompt Overlay Test',
    description: 'Test and validate prompt overlay functionality',
    icon: Layers,
    href: '/ai/prompts/experimental/prompt-overlay-test',
  },
  {
    title: 'Test Controls',
    description: 'Configure and manage testing parameters',
    icon: Wrench,
    href: '/ai/prompts/experimental/test-controls',
  },
];

export default function ExperimentalPromptsPage() {
  const [activeRoute, setActiveRoute] = useState<string | null>(null);

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-5xl">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-2">
              <TestTube className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Experimental Features</h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Explore and test cutting-edge prompt engineering tools
            </p>
          </div>

          {/* Main Routes */}
          <div className="space-y-3 sm:space-y-4">
            {routes.map((route) => {
              const Icon = route.icon;
              return (
                <div key={route.href}>
                  <Link
                    href={route.href}
                    onClick={() => setActiveRoute(route.href)}
                    className="block group"
                  >
                    <Card className="relative overflow-hidden transition-all hover:shadow-md hover:border-primary/50">
                      {activeRoute === route.href && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base sm:text-lg mb-1 group-hover:text-primary transition-colors">
                              {route.title}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                              {route.description}
                            </CardDescription>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>

                  {/* Nested Routes */}
                  {route.nested && (
                    <div className="ml-4 sm:ml-8 mt-2 sm:mt-3 space-y-2 sm:space-y-3 border-l-2 border-border pl-3 sm:pl-4">
                      {route.nested.map((nestedRoute) => (
                        <Link
                          key={nestedRoute.href}
                          href={nestedRoute.href}
                          onClick={() => setActiveRoute(nestedRoute.href)}
                          className="block group"
                        >
                          <Card className="relative overflow-hidden transition-all hover:shadow-sm hover:border-primary/50 bg-muted/30">
                            {activeRoute === nestedRoute.href && (
                              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              </div>
                            )}
                            <CardHeader className="p-3 sm:p-4">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-sm sm:text-base mb-0.5 group-hover:text-primary transition-colors">
                                    {nestedRoute.title}
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    {nestedRoute.description}
                                  </CardDescription>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                              </div>
                            </CardHeader>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
