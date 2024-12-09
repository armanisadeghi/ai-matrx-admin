import { getTopics, getFlashcardSets } from "./constants";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function FlashcardsPage() {
    const [topics, availableSets] = await Promise.all([
        getTopics(),
        getFlashcardSets(),
    ]);

    return (
        <div className="w-full">
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-bold">Flashcards</h1>
                    <p className="text-muted-foreground">
                        Select a topic to explore available flashcard sets
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(topics).map(([key, topic]) => {
                        const topicSets = availableSets[`${key}_set_1`] || [];
                        const availableCount = topicSets.length;

                        return (
                            <Link
                                href={`/flash-cards/${topic.id}`}
                                key={key}
                                className="group transition-transform duration-200 hover:scale-[1.02]"
                            >
                                <Card className={`h-full ${topic.customStyles.backgroundColor} border-2 border-transparent transition-all duration-200 group-hover:border-primary group-hover:shadow-lg`}>
                                    <div className="p-6 flex flex-col items-start gap-4">
                                        <div className="w-full flex items-center justify-between">
                                            <div className="rounded-full p-3 bg-background/10 backdrop-blur-sm">
                                                <topic.icon className="w-6 h-6" />
                                            </div>
                                            {availableCount > 0 && (
                                                <span className="text-sm bg-background/20 backdrop-blur-sm px-2 py-1 rounded-full">
                                                    {availableCount} {availableCount === 1 ? 'set' : 'sets'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-2xl font-semibold tracking-tight">
                                                {topic.label}
                                            </h2>
                                            <p className="text-muted-foreground text-sm">
                                                {topic.description}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
