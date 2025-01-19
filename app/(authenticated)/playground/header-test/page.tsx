'use client';

import PlaygroundHeaderCenter from '@/components/playground/header/PlaygroundHeaderCenter';
import AICockpit from '@/components/playground/panel-manager/_dev/AICockpit';
import AICockpitIntro from '@/components/playground/panel-manager/AICockpitIntro';
import { BackgroundBeamsWithCollisionDemo } from './Beams';

export default function page() {
    return (
        <>
            <PlaygroundHeaderCenter />
            <AICockpitIntro />
        </>
    );
}
