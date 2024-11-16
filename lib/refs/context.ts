// lib/refs/context.ts
import { createContext } from 'react';
import { RefCollection, RefManagerMethods } from './types';

export const RefContext = createContext<RefCollection>({});
export const RefManagerContext = createContext<RefManagerMethods | null>(null);

