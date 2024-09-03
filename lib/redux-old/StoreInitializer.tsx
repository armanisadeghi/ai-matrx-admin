'use client'

import { useRef } from 'react'
import { useStore } from 'react-redux'
import { RootState } from './store'

export function StoreInitializer({ preloadedState }: { preloadedState: RootState }) {
    const initialized = useRef(false)
    const store = useStore()

    if (!initialized.current) {
        store.dispatch({ type: 'HYDRATE', payload: preloadedState })
        initialized.current = true
    }

    return null
}
