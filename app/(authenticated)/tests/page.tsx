// app/(authenticated)/tests/page.tsx
'use client';

// import React from 'react';
// import { useSelector } from 'react-redux';
// import NextWindowManager from "@/components/matrx/next-windows";
// import type { RootState } from '@/lib/redux/store';
// import type { TestDirectory } from '@/utils/directoryStructure';

// // Helper function to check if an image exists
// async function checkImageExists(imagePath: string): Promise<boolean> {
//     try {
//         const response = await fetch(imagePath, { method: 'HEAD' });
//         return response.ok;
//     } catch {
//         return false;
//     }
// }

// function formatTitle(name: string): string {
//     try {
//         return name
//             .split('-')
//             .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//             .join(' ');
//     } catch (error) {
//         console.error('Error formatting title:', name, error);
//         return 'Untitled';
//     }
// }

// export default function TestsPage() {
//     const testDirectories = useSelector((state: RootState) => state.testRoutes as TestDirectory[]) || [];
//     const [validatedPages, setValidatedPages] = React.useState<Array<{
//         id: number;
//         title: string;
//         content: string;
//         href: string;
//         images: string[];
//     }>>([]);

//     // Handle image validation and page creation
//     React.useEffect(() => {
//         async function validateAndCreatePages() {
//             const pages = await Promise.all(testDirectories.map(async (directory, index) => {
//                 const baseImagePath = `/images/${directory.name}`;

//                 // Check which images exist
//                 const imageChecks = await Promise.all([
//                     checkImageExists(`${baseImagePath}-1.jpg`),
//                     // checkImageExists(`${baseImagePath}-2.jpg`),
//                     // checkImageExists(`${baseImagePath}-3.jpg`)
//                 ]);

//                 // Only include images that exist
//                 const validImages = imageChecks.reduce<string[]>((acc, exists, idx) => {
//                     if (exists) {
//                         acc.push(`${baseImagePath}-${idx + 1}.jpg`);
//                     }
//                     return acc;
//                 }, []);

//                 return {
//                     id: index + 1,
//                     title: formatTitle(directory.name),
//                     content: `Test page for ${directory.name}`,
//                     href: directory.path,
//                     images: validImages,
//                 };
//             }));

//             setValidatedPages(pages);
//         }

//         validateAndCreatePages();
//     }, [testDirectories]);

//     if (!testDirectories.length) {
//         return (
//             <div className="p-4 text-center">
//                 <div className="animate-pulse">
//                     <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
//                     <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
//                 </div>
//             </div>
//         );
//     }

//     if (!validatedPages.length) {
//         return (
//             <div className="p-4 text-center">
//                 <div className="animate-pulse">
//                     <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
//                     <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <NextWindowManager
//             windows={validatedPages}
//             initialLayout={{ ratio: '3/2', columns: 4 }}
//             allowLayoutChange={true}
//         />
//     );
// }


export default function TestsPage() {
    return (
        <div>
            <h1>Temporary Placeholder for test directories page to see if it's what's causing some build issues.</h1>
        </div>
    );
}
