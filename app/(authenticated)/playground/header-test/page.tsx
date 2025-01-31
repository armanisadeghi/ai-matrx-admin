'use client';

import PlaygroundHeaderCenter from '@/components/playground/header/PlaygroundHeaderCenter';
import AICockpit from '@/components/playground/concepts/_dev/AICockpit';
import AICockpitIntro from '@/components/playground/components/AICockpitIntro';
import { BackgroundBeamsWithCollisionDemo } from './Beams';

export default function page() {
    return (
        <>
            <PlaygroundHeaderCenter />
            <AICockpitIntro />
        </>
    );
}
