// File: @/hooks/useWindowAware.ts

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'next/navigation';
import { setIsInWindow, setLayoutStyle } from '@/lib/redux/slices/layoutSlice';
import { RootState } from '@/lib/redux/store'; // Adjust this import path as needed

export const useWindowAware = () => {
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const { isInWindow, layoutStyle } = useSelector((state: RootState) => state.layout);

    useEffect(() => {
        const inWindow = searchParams.get('inWindow') === 'true';
        if (inWindow !== isInWindow) {
            dispatch(setIsInWindow(inWindow));
        }

        const style = searchParams.get('layoutStyle') as 'normal' | 'extendedBottom' | 'window' | null;
        if (style && style !== layoutStyle) {
            dispatch(setLayoutStyle(style));
        }
    }, [searchParams, dispatch, isInWindow, layoutStyle]);

    return { isInWindow, layoutStyle };
};