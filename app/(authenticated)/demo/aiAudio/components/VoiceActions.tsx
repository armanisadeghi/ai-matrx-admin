'use client';

import {cloneVoiceFromFile, createVoice} from '@/lib/cartesia/cartesiaUtils';
import {Button, Input, Textarea, FileUpload} from '@/components/ui';
import {useAiAudio} from "@/app/(authenticated)/demo/aiAudio/components/AiVoicePage";

const VoiceActions = () => {
    const {loading, error, setLoading, setError, smartSetData, smartGetData,} = useAiAudio();

    const customVoiceName = smartGetData('customVoiceName') || '';
    const customVoiceDescription = smartGetData('customVoiceDescription') || '';
    const customVoiceFile = smartGetData('customVoiceFile') || null;

    const handleCreateVoice = async () => {
        try {
            const voice = await createVoice(customVoiceName, customVoiceDescription, Array(192).fill(1.0));
            smartSetData('customVoices', voice);
        } catch (error) {
            setError('Error creating aiAudio: ' + error);
            console.error('Error creating aiAudio:', error);
        }
    };

    const handleCloneVoice = async () => {
        if (customVoiceFile) {
            try {
                setLoading(true);
                const clonedVoice = await cloneVoiceFromFile(customVoiceFile);
                smartSetData('customVoices', clonedVoice);
                setLoading(false);
                console.log(clonedVoice);
            } catch (error) {
                setError('Error cloning aiAudio: ' + error);
                setLoading(false);
                console.error('Error cloning aiAudio:', error);
            }
        }
    };

    const handleFileUpload = (files: File[]) => {
        setLoading(true);
        smartSetData('customVoiceFile', files[0]);
        setLoading(false);
        console.log("File uploaded:", files[0]);
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="space-y-4">
                <Input
                    placeholder="Voice Name"
                    value={customVoiceName}
                    onChange={(e) => smartSetData('customVoiceName', e.target.value)}  // Update using smartSetData
                    className="w-full"
                    autoComplete="off"
                />
                <Textarea
                    placeholder="Voice Description"
                    value={customVoiceDescription}
                    onChange={(e) => smartSetData('customVoiceDescription', e.target.value)}  // Update using smartSetData
                    className="w-full"
                />
            </div>

            <div className="flex justify-center">
                <Button onClick={handleCreateVoice} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Create Voice
                </Button>
            </div>

            <FileUpload onChange={handleFileUpload}/>

            <div className="flex justify-center">
                <Button onClick={handleCloneVoice} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Clone Voice
                </Button>
            </div>

            {smartGetData('clonedVoice') && (
                <div className="text-center">
                    <h2 className="text-xl font-semibold">New Voice Created:</h2>
                    <p className="text-muted-foreground">{smartGetData('clonedVoice')?.name}</p>
                </div>
            )}
        </div>
    );
};

export default VoiceActions;
