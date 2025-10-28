// 1. Using the hook in a component
import { useAudioExplanation } from '@/hooks/tts/useAudioExplanation';

function MyComponent() {
    const { playExplanation } = useAudioExplanation();

    return (
        <button onClick={() => playExplanation({
            text: "Your explanation here",
            title: "Custom Title"
        })}>
            Play Explanation
        </button>
    );
}

// 2. Using it in a custom hook
import { useAudioModal } from '@/providers/AudioModalProvider';

function YourComponent() {
    const showAudioModal = useAudioModal();

    const handleExplanation = () => {
        showAudioModal({
            text: "Some text to be read",
            title: "Custom Title",
            description: "Custom description"
        });
    };

    return (
        <button onClick={handleExplanation}>
            Show Explanation
        </button>
    );
}


// 3. Using it in a regular function (after provider is mounted)
import { showAudioModal } from '@/utils/audio/audioModal';

function regularFunction() {
    showAudioModal({
        text: "Explanation text",
        title: "Title"
    });
}

