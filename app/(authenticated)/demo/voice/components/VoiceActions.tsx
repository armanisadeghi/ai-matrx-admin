// // app/(authenticated)/demo/voice/components/VoiceActions.tsx
//
// 'use client';
//
// import { cloneVoiceFromFile, createVoice } from '@/lib/cartesia/cartesiaUtils';
// import { Button, Input, Textarea, FileUpload } from '@/components/ui';
//
// const VoiceActions = (moduleSelectors) => {
//     const { aiAudioSelectors } = moduleSelectors;
//
//
//     const { name = '', description = '', file = null, newVoice = null } = aiAudioSelectors.getState();
//
//     const handleCreateVoice = async () => {
//         try {
//             const voice = await createVoice(name, description, Array(192).fill(1.0));
//             setState('newVoice', voice);
//         } catch (error) {
//             console.error('Error creating voice:', error);
//         }
//     };
//
//     const handleCloneVoice = async () => {
//         if (file) {
//             try {
//                 const clonedVoice = await cloneVoiceFromFile(file);
//                 console.log(clonedVoice);
//             } catch (error) {
//                 console.error('Error cloning voice:', error);
//             }
//         }
//     };
//
//     const handleFileUpload = (files: File[]) => {
//         setState('file', files[0]);
//         console.log("File uploaded:", files[0]);
//     };
//
//     return (
//         <div className="space-y-6 max-w-3xl mx-auto">
//             <div className="space-y-4">
//                 <Input
//                     placeholder="Voice Name"
//                     value={name}
//                     onChange={(e) => setState('name', e.target.value)}
//                     className="w-full"
//                     autoComplete="off"
//                 />
//                 <Textarea
//                     placeholder="Voice Description"
//                     value={description}
//                     onChange={(e) => setState('description', e.target.value)}
//                     className="w-full"
//                 />
//             </div>
//
//             <div className="flex justify-center">
//                 <Button onClick={handleCreateVoice} className="bg-primary text-primary-foreground hover:bg-primary/90">
//                     Create Voice
//                 </Button>
//             </div>
//
//             <FileUpload onChange={handleFileUpload} />
//
//             <div className="flex justify-center">
//                 <Button onClick={handleCloneVoice} className="bg-primary text-primary-foreground hover:bg-primary/90">
//                     Clone Voice
//                 </Button>
//             </div>
//
//             {newVoice && (
//                 <div className="text-center">
//                     <h2 className="text-xl font-semibold">New Voice Created:</h2>
//                     <p className="text-muted-foreground">{newVoice.name}</p>
//                 </div>
//             )}
//         </div>
//     );
// };
//
// export default VoiceActions;
