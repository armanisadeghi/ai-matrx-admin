'use client';

import { PromptExecutionCard, PromptExecutionCardsGrid, createPromptCard } from '@/features/prompts';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Book } from 'lucide-react';

/**
 * Educational Content Card Demo
 * 
 * This demonstrates the correct usage of PromptExecutionCard for educational content.
 * Cards display custom content and trigger a predefined prompt with hidden variables.
 */

// Full page content (this is the "context")
const fullPageContent = `
# History of the Persian Empire

Essential Vocabulary

Achaemenid Empire
The first Persian Empire, founded by Cyrus the Great, known for its vast size and efficient administration.

Cyrus the Great
Founder of the Persian Empire, famous for his military conquests and policy of tolerance.

Darius I
Persian ruler who expanded the empire and organized it into satrapies.

Satrap
A provincial governor in the Persian Empire who ruled a satrapy.

Satrapy
A province or administrative region within the Persian Empire.

Royal Road
A major road built by the Persians to facilitate communication and trade across the empire.

Zoroastrianism
The main religion of the Persian Empire, emphasizing the struggle between good and evil.

Persepolis
The ceremonial capital of the Persian Empire.

Immortals
Elite Persian infantry soldiers who served as the king's guard.

Historical Significance

Empire Building
The Persian Empire was one of the largest empires in the ancient world, demonstrating early examples of imperial governance over diverse peoples.

Administrative Innovation
Use of satrapies and a system of roads (Royal Road) allowed efficient control and communication across vast distances.

Cultural Tolerance
The empire is notable for respecting local customs and religions, which helped maintain stability.

Religious Influence
Zoroastrianism influenced later religious and philosophical traditions.

Military Organization
The Persian military, including the Immortals, was highly organized and effective.

Why It's Covered in AP World History

Demonstrates early examples of large-scale empire-building and governance.
Shows how empires managed cultural diversity and maintained control.
Highlights the role of infrastructure (like the Royal Road) in unifying empires.
Provides context for later historical events, such as the Persian Wars and the spread of ideas.
`;

// Define vocabulary terms and concepts
const vocabularyTerms = [
  {
    title: "Achaemenid Empire",
    description: "The first Persian Empire, founded by Cyrus the Great, known for its vast size and efficient administration.",
  },
  {
    title: "Cyrus the Great",
    description: "Founder of the Persian Empire, famous for his military conquests and policy of tolerance.",
  },
  {
    title: "Darius I",
    description: "Persian ruler who expanded the empire and organized it into satrapies.",
  },
  {
    title: "Satrap",
    description: "A provincial governor in the Persian Empire who ruled a satrapy.",
  },
  {
    title: "Satrapy",
    description: "A province or administrative region within the Persian Empire.",
  },
  {
    title: "Royal Road",
    description: "A major road built by the Persians to facilitate communication and trade across the empire.",
  },
  {
    title: "Zoroastrianism",
    description: "The main religion of the Persian Empire, emphasizing the struggle between good and evil.",
  },
  {
    title: "Persepolis",
    description: "The ceremonial capital of the Persian Empire.",
  },
  {
    title: "Immortals",
    description: "Elite Persian infantry soldiers who served as the king's guard.",
  },
];

const historicalSignificance = [
  {
    title: "Empire Building",
    description: "The Persian Empire was one of the largest empires in the ancient world, demonstrating early examples of imperial governance over diverse peoples.",
  },
  {
    title: "Administrative Innovation",
    description: "Use of satrapies and a system of roads (Royal Road) allowed efficient control and communication across vast distances.",
  },
  {
    title: "Cultural Tolerance",
    description: "The empire is notable for respecting local customs and religions, which helped maintain stability.",
  },
  {
    title: "Religious Influence",
    description: "Zoroastrianism influenced later religious and philosophical traditions.",
  },
  {
    title: "Military Organization",
    description: "The Persian military, including the Immortals, was highly organized and effective.",
  },
];

// IMPORTANT: Replace this with your actual prompt ID after you create the "Content Card Expander" prompt
const CONTENT_EXPANDER_PROMPT_ID = "e95d37f4-e983-4f20-a5fd-0fccfe5253a9";

export default function CardDemoPage() {
  // Create a pre-configured card component (Method 1: Factory Pattern)
  const ContentExpanderCard = createPromptCard({
    systemPromptId: CONTENT_EXPANDER_PROMPT_ID,
    allowInitialMessage: false,
    allowChat: true,
  });

  return (
    <div className="h-page flex flex-col overflow-hidden bg-textured">
      {/* Header */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600">
              <Book className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Educational Content Cards Demo
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Interactive learning cards with AI-powered content expansion
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Setup Alert */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              <div className="space-y-2">
                <p className="font-semibold">How This Works:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                  <li>Each card displays a <strong>title</strong> and <strong>description</strong> from the lesson content</li>
                  <li>When clicked, the card triggers a predefined AI prompt with three hidden variables:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">title</code> - The card's title</li>
                      <li><code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">description</code> - The card's description</li>
                      <li><code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">context</code> - The full page content</li>
                    </ul>
                  </li>
                  <li>The AI provides detailed explanations about the topic in context</li>
                  <li><code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">allowChat: true</code> means you can continue the conversation</li>
                </ol>
                <p className="text-sm mt-2 pt-2 border-t border-blue-200">
                  <strong>Setup Required:</strong> Create a prompt with the structure shown below, then update 
                  <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded mx-1">CONTENT_EXPANDER_PROMPT_ID</code> 
                  in this file.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Essential Vocabulary Section */}
          <div className="space-y-4">
            <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
              <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                Essential Vocabulary
              </h2>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                Click any term to learn more about it in the context of the Persian Empire
              </p>
            </Card>

            <PromptExecutionCardsGrid columns={3}>
              {vocabularyTerms.map((term) => (
                <ContentExpanderCard
                  key={term.title}
                  title={term.title}
                  description={term.description}
                  context={fullPageContent}
                />
              ))}
            </PromptExecutionCardsGrid>
          </div>

          {/* Historical Significance Section */}
          <div className="space-y-4 mt-8">
            <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
              <h2 className="text-xl font-bold text-purple-900 dark:text-purple-100">
                Historical Significance
              </h2>
              <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                Explore why these aspects of the Persian Empire matter
              </p>
            </Card>

            {/* Method 2: Direct usage without factory */}
            <PromptExecutionCardsGrid columns={2}>
              {historicalSignificance.map((concept) => (
                <PromptExecutionCard
                  key={concept.title}
                  systemPromptId={CONTENT_EXPANDER_PROMPT_ID}
                  title={concept.title}
                  description={concept.description}
                  context={fullPageContent}
                  allowInitialMessage={false}
                  allowChat={true}
                  className="border-purple-200 hover:border-purple-400"
                />
              ))}
            </PromptExecutionCardsGrid>
          </div>

          {/* Implementation Notes */}
          <Card className="p-6 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-lg font-semibold mb-3">Implementation Notes</h3>
            <div className="space-y-3 text-sm">
              <div>
                <strong className="text-primary">Method 1: Factory Pattern (Recommended for multiple cards)</strong>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
{`const ContentExpanderCard = createPromptCard({
  systemPromptId: "your-prompt-id",
  allowInitialMessage: false,
  allowChat: true,
});

<ContentExpanderCard
  title="Cyrus the Great"
  description="Founder of the Persian Empire..."
  context={fullPageContent}
/>`}
                </pre>
              </div>

              <div>
                <strong className="text-primary">Method 2: Direct Usage (For one-off cards)</strong>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
{`<PromptExecutionCard
  systemPromptId="your-prompt-id"
  title="Cyrus the Great"
  description="Founder of the Persian Empire..."
  context={fullPageContent}
  allowInitialMessage={false}
  allowChat={true}
/>`}
                </pre>
              </div>

              <div>
                <strong className="text-primary">Required Prompt Structure:</strong>
                <p className="mt-2">Your prompt must have exactly these three variables:</p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li><code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">{`{{title}}`}</code> - The card's title</li>
                  <li><code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">{`{{description}}`}</code> - The card's description</li>
                  <li><code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">{`{{context}}`}</code> - The full page content</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

