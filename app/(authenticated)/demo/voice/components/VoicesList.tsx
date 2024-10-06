// // app/(authenticated)/demo/voice/components/VoicesList.tsx
// 'use client';
//
// import React, { useEffect, useState } from 'react';
// import { listVoices } from '@/lib/cartesia/cartesiaUtils';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
// import { FullJsonViewer } from '@/components/ui/JsonViewer';
// import { motion } from 'framer-motion';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// import { toast } from '@/components/ui/use-toast';
// import VoiceModal from './VoiceModal';
// import { useDispatch, useSelector } from 'react-redux';
// import { AppDispatch } from '@/lib/redux/store';
//
// type AiVoice = {
//     id: string;
//     name: string;
//     description: string;
// };
//
//
// const VoicesList = ({ moduleSelectors }: { moduleSelectors: any }) => {
//     const { getItems, getLoading, getError, setLoading, setError, setItems } = moduleSelectors;
//
//     const dispatch = useDispatch<AppDispatch>();
//
//     const items = useSelector(getItems) || {};
//
//     useEffect(() => {
//         if (Array.isArray(items.availableVoices)) {
//             if (items.voices.length < 3) {
//                 console.log("Only default voices. Fetching available voices.");
//                 loadVoices();
//
//
//             } else {
//                 console.log("Voices array has items.");
//             }
//         } else {
//             console.log("'voices' key does not exist or is not an array.");
//         }
//     }, [voices.length]);
//
//
//
//     const voices = items.voices<AiVoice[]>([]);
//
//
//     const loading = useSelector(getLoading);
//     const error = useSelector(getError);
//
//     const [selectedVoice, setSelectedVoice] = useState<AiVoice | null>(null);
//
//
//     // Function to load voices from API
//     const loadVoices = async () => {
//         dispatch(setLoading(true));
//         try {
//             const voicesData = await listVoices();  // Fetch voices from API
//             const filteredVoices = voicesData.map(({ id, name, description }) => ({
//                 id,
//                 name,
//                 description,
//             }));
//             dispatch(setItems(filteredVoices));  // Update Redux state with voices
//         } catch (err) {
//             dispatch(setError('Failed to fetch voices.'));
//             console.error('Error fetching voices:', err);
//             toast({
//                 title: "Error",
//                 description: "Failed to fetch voices. Please try again.",
//                 variant: "destructive",
//             });
//         } finally {
//             dispatch(setLoading(false));
//         }
//     };
//
//     // Function to refresh voices manually
//     const refreshVoices = () => {
//         loadVoices();  // Trigger voices reload
//     };
//
//     const handleCopyId = (id: string, e: React.MouseEvent) => {
//         e.stopPropagation();
//         navigator.clipboard.writeText(id);
//         toast({
//             title: "Voice ID Copied",
//             description: "The voice ID has been copied to your clipboard.",
//         });
//     };
//
//     const handleCardClick = (voice: AiVoice) => {
//         setSelectedVoice(voice);  // Set the selected voice for the modal
//     };
//
//     // Render loading state
//     if (loading) {
//         return (
//             <div className="flex justify-center items-center h-full">
//                 <p className="text-primary">Loading voices...</p>
//             </div>
//         );
//     }
//
//     // Render error state if error exists
//     if (error) {
//         return (
//             <div className="flex justify-center items-center h-full">
//                 <p className="text-red-500">{error}</p>
//             </div>
//         );
//     }
//
//     return (
//         <TooltipProvider>
//             <div className="space-y-8 p-4 min-h-screen">
//                 <div className="max-w-3xl mx-auto text-center space-y-4">
//                     <h1 className="text-3xl font-bold text-foreground">Voice Data Management</h1>
//                     <p className="text-lg text-muted-foreground">
//                         Manage and explore the available voice profiles below.
//                     </p>
//                 </div>
//
//                 {/* Button to refresh voices manually */}
//                 <div className="flex justify-center mb-4">
//                     <button
//                         onClick={refreshVoices}
//                         className="bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark"
//                     >
//                         Refresh Voices
//                     </button>
//                 </div>
//
//                 {/* Display list of voices */}
//                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//                     {voices.map((voice: AiVoice) => (
//                         <motion.div
//                             key={voice.id}
//                             className="cursor-pointer h-full"
//                             whileHover={{ scale: 1.05 }}
//                             transition={{ type: 'spring', stiffness: 100 }}
//                             onClick={() => handleCardClick(voice)}
//                         >
//                             <Card className="bg-matrix-card-background shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col">
//                                 <CardHeader>
//                                     <CardTitle className="text-xl text-foreground">{voice.name}</CardTitle>
//                                 </CardHeader>
//                                 <CardContent className="flex-grow flex flex-col justify-between">
//                                     <p className="text-muted-foreground mb-4">{voice.description}</p>
//                                     <Tooltip>
//                                         <TooltipTrigger asChild>
//                                             <p
//                                                 className="text-xs text-muted-foreground truncate cursor-pointer hover:text-primary"
//                                                 onClick={(e) => handleCopyId(voice.id, e)}
//                                             >
//                                                 ID: {voice.id}
//                                             </p>
//                                         </TooltipTrigger>
//                                         <TooltipContent>
//                                             <p>Click to copy ID</p>
//                                         </TooltipContent>
//                                     </Tooltip>
//                                 </CardContent>
//                             </Card>
//                         </motion.div>
//                     ))}
//                 </div>
//
//                 {/* Display full JSON data */}
//                 <FullJsonViewer data={voices} title="All Voices Data" />
//
//                 {/* Voice modal */}
//                 {selectedVoice && (
//                     <VoiceModal
//                         voice={selectedVoice}
//                         onClose={() => setSelectedVoice(null)}  // Close modal
//                     />
//                 )}
//             </div>
//         </TooltipProvider>
//     );
// };
//
// export default VoicesList;
