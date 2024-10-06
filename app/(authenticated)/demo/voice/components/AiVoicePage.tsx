// // app/(authenticated)/demo/voice/AiVoicePage.tsx
//
// 'use client';
//
// import React from 'react';
// import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
// import VoicesList from './VoicesList';
// import VoiceActions from './VoiceActions';
// import {createModuleSelectors} from "@/lib/redux/selectors/moduleSelectors";
//
//
// const moduleName = 'aiAudio';
// const moduleData = {
//     availableVoices: [{
//         "id": "156fb8d2-335b-4950-9cb3-a2d33befec77",
//         "name": "Ms. Matrx",
//         "description": "This voice is friendly and conversational, designed for customer support agents and casual conversations"
//     },
//         {
//             "id": "ee7ea9f8-c0c1-498c-9279-764d6b56d189",
//             "name": "Mr. Matrx",
//             "description": "This voice is polite and conversational, with a slight accent, designed for customer support and casual conversations"
//         }],
//     customVoices: [],
//     voiceClones: [],
//     transcripts: [],
//     savedAudio: [],
//     meetingNotes: [],
//     userAudioFiles: [],
// };
//
// const moduleItems = {
//     model_id: "sonic-english",
//     voice: {
//         mode: "id",
//         id: "156fb8d2-335b-4950-9cb3-a2d33befec77",
//         __experimental_controls: {
//             "speed": "normal",
//             "emotion": [
//                 "positivity:high",
//                 "curiosity"
//             ]
//         },
//
//     },
//     transcript: "text"
// };
//
// const moduleUserPreferences = {
//     audio: {
//         voiceId: '156fb8d2-335b-4950-9cb3-a2d33befec77',
//         language: 'en',
//         speed: "normal",
//
//         emotion: 'happy',
//         microphone: true,
//         speaker: true,
//         wakeWord: 'Hey Matrix',
//     },
//     customVocab: {}
// };
//
//
// const initialState = {
//     moduleName: moduleName,
//     initiated: false,
//     data: moduleData,
//     items: moduleItems,
//     userPreferences: moduleUserPreferences,
//     loading: false,
//     error: null,
//     staleTime: 600000,
// };
//
//
// const AiVoicePage = () => {
//     return (
//         <div className="container mx-auto py-8 bg-background text-foreground">
//             <h1 className="text-4xl font-bold mb-6">Cartesia Voice Testing</h1>
//
//             <Tabs defaultValue="actions" className="w-full">
//                 <TabsList className="mb-6">
//                     <TabsTrigger value="actions">Voice Actions</TabsTrigger>
//                     <TabsTrigger value="voices">Available Voices</TabsTrigger>
//                 </TabsList>
//
//                 <TabsContent value="actions">
//                     <div className="bg-card rounded-lg shadow-lg p-6">
//                         <h2 className="text-2xl font-semibold mb-4">Voice Actions</h2>
//                         <VoiceActions moduleSelectors={aiAudioSelectors}/>
//                     </div>
//                 </TabsContent>
//
//                 <TabsContent value="voices">
//                     <div className="bg-card rounded-lg shadow-lg p-6">
//                         <h2 className="text-2xl font-semibold mb-4">Available Voices</h2>
//                         <VoicesList moduleSelectors={aiAudioSelectors}/>
//                     </div>
//                 </TabsContent>
//             </Tabs>
//         </div>
//     );
// };
//
// export default AiVoicePage;
