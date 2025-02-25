// app/(authenticated)/tests/page.tsx
'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import NextWindowManager from "@/components/matrx/next-windows";
import type { RootState } from '@/lib/redux/store';
import type { TestDirectory } from '@/utils/directoryStructure';


// D:\app_dev\ai-matrx-admin\utils\directoryStructure.ts


// Helper function to check if an image exists
async function checkImageExists(imagePath: string): Promise<boolean> {
    try {
        const response = await fetch(imagePath, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

function formatTitle(name: string): string {
    try {
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    } catch (error) {
        console.error('Error formatting title:', name, error);
        return 'Untitled';
    }
}


export const testPages: Array<{
    id: number;
    title: string;
    content: string;
    href: string;
    images: string[];
  }> = [
    // {
    //   id: 1,
    //   title: "App Shell Test",
    //   content: "Test page for app-shell-test",
    //   href: "/tests/app-shell-test",
    //   images: [],
    // },
    // {
    //   id: 2,
    //   title: "Audio Recorder Test",
    //   content: "Test page for audio-recorder-test",
    //   href: "/tests/audio-recorder-test",
    //   images: [],
    // },
    {
      id: 3,
      title: "Broker Value Test",
      content: "Test page for broker-value-test",
      href: "/tests/broker-value-test",
      images: ["/assistants/business-coach-female-avatar.jpeg"],
    },
    {
      id: 4,
      title: "Crud Operations",
      content: "Test page for crud-operations",
      href: "/tests/crud-operations",
      images: ["/assistants/happy-robot-avatar"],
    },
    // {
    //   id: 5,
    //   title: "Dynamic Entity Test",
    //   content: "Test page for dynamic-entity-test",
    //   href: "/tests/dynamic-entity-test",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    // {
    //   id: 6,
    //   title: "Dynamic Layouts",
    //   content: "Test page for dynamic-layouts",
    //   href: "/tests/dynamic-layouts",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    {
      id: 7,
      title: "Flashcard App Tests",
      content: "Test page for flashcard-app-tests",
      href: "/tests/flashcard-app-tests",
      images: ["/assistants/history-tutor-male-avatar.jpeg"],
    },
    // {
    //   id: 8,
    //   title: "Forms",
    //   content: "Test page for forms",
    //   href: "/tests/forms",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    // {
    //   id: 9,
    //   title: "Links",
    //   content: "Test page for links",
    //   href: "/tests/links",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    // {
    //   id: 10,
    //   title: "Math",
    //   content: "Test page for math",
    //   href: "/tests/math",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    // {
    //   id: 11,
    //   title: "Matrx Table",
    //   content: "Test page for matrx-table",
    //   href: "/tests/matrx-table",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    {
      id: 12,
      title: "Monoco Editor",
      content: "Test page for monoco-editor",
      href: "/tests/monoco-editor",
      images: ["/assistants/business-coach-male-avatar.jpeg"],
    },
    {
      id: 13,
      title: "Notes App",
      content: "Test page for notes-app",
      href: "/tests/notes-app",
      images: ["/assistants/science-tutor-female-avatar.jpeg"],
    },
    // {
    //   id: 14,
    //   title: "OpenAI Chat",
    //   content: "Test page for openai-chat",
    //   href: "/tests/openai-chat",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    {
      id: 15,
      title: "Photo Video",
      content: "Test page for photo-video",
      href: "/tests/photo-video",
      images: ["/assistants/english-tutor-female-avatar.jpeg"],
    },
    // {
    //   id: 16,
    //   title: "Relationship Management",
    //   content: "Test page for relationship-management",
    //   href: "/tests/relationship-management",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    {
      id: 17,
      title: "Socket Tests",
      content: "Test page for socket-tests",
      href: "/tests/socket-tests",
      images: ["/assistants/candice-ai-avatar.jpeg"],
    },
    // {
    //   id: 18,
    //   title: "SSR Test",
    //   content: "Test page for ssr-test",
    //   href: "/tests/ssr-test",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    // {
    //   id: 19,
    //   title: "Storage Tests",
    //   content: "Test page for storage-tests",
    //   href: "/tests/storage-tests",
    //   images: ["/assistants/business-coach-male-avatar.jpeg"],
    // },
    // {
    //   id: 20,
    //   title: "Table Test",
    //   content: "Test page for table-test",
    //   href: "/tests/table-test",
    //   images: ["/assistants/candice-ai-avatar.jpeg"],
    // }
  ];
  


  export default function TestsPage() {
    const [validatedPages, setValidatedPages] = React.useState(testPages);

    // Handle image validation
    React.useEffect(() => {
        async function validateImages() {
            const pages = await Promise.all(testPages.map(async (page) => {
                const baseImagePath = `/images/${page.href.split('/').pop()}`;

                // Check which images exist
                const imageChecks = await Promise.all([
                    checkImageExists(`${baseImagePath}-1.jpg`),
                    // checkImageExists(`${baseImagePath}-2.jpg`),
                    // checkImageExists(`${baseImagePath}-3.jpg`)
                ]);

                // Only include images that exist
                const validImages = imageChecks.reduce<string[]>((acc, exists, idx) => {
                    if (exists) {
                        acc.push(`${baseImagePath}-${idx + 1}.jpg`);
                    }
                    return acc;
                }, []);

                return { ...page, images: validImages };
            }));

            setValidatedPages(pages);
        }

        validateImages();
    }, []);

    if (!validatedPages.length) {
        return (
            <div className="p-4 text-center">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <NextWindowManager
            windows={validatedPages}
            initialLayout={{ ratio: '3/2', columns: 4 }}
            allowLayoutChange={true}
        />
    );
}

// export default function TestsPage() {
//     return (
//         <div>
//             <h1>Temporary Placeholder for test directories page to see if it's what's causing some build issues.</h1>
//         </div>
//     );
// }
