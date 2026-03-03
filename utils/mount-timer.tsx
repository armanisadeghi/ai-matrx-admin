'use client';

import { useEffect } from 'react';

/**
 * Wraps children and logs mount time to the console.
 * Zero DOM overhead — renders as a fragment.
 *
 * @example
 * <MountTimer name="MyProvider">
 *   <MyProvider>{children}</MyProvider>
 * </MountTimer>
 */
export function MountTimer({ name, children }: { name: string; children: React.ReactNode }) {
    useEffect(() => {
        console.debug(`⚡${name} mounted at ${performance.now().toFixed(2)}ms since page start`);
    }, [name]);
    return <>{children}</>;
}
