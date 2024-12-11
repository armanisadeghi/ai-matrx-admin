// providers/recoil/utils.ts

import { RecoilState, snapshot_UNSTABLE } from 'recoil';

export function getRecoilValueFromAtom<T>(atom: RecoilState<T>): T | undefined {
    try {
        const snapshot = snapshot_UNSTABLE();
        return snapshot.getLoadable(atom).contents;
    } catch (error) {
        console.warn('Failed to get Recoil value:', error);
        return undefined;
    }
}
