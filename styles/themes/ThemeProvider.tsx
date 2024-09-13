'use client';

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { themes } from './themeColors';
import { ThemeMode } from './types';
import {RootState} from "@/lib/redux/store";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const dispatch = useDispatch();
    const { currentTheme, mode } = useSelector((state: RootState) => state.theme);

    useEffect(() => {
        const theme = themes.find(t => t.name === currentTheme) || themes[0];
        const root = document.documentElement;

        Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value[mode]);
        });

        root.classList.remove('light', 'dark');
        root.classList.add(mode);
    }, [currentTheme, mode]);

    return <>{children}</>;
};
