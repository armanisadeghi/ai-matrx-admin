/**
 * Auth helpers for service files — reads from Redux store synchronously.
 *
 * No network requests. Requires the store to be initialized (i.e., the app
 * must have mounted and DeferredShellData must have run).
 *
 * For client components and hooks, prefer reading directly from the store via
 * `useAppSelector(selectUser)` instead.
 */
import { getStore } from '@/lib/redux/store';

interface StoreUser {
    id: string | null;
    email: string | null;
}

function getStoreUser(): StoreUser {
    const store = getStore();
    if (!store) return { id: null, email: null };
    const { id, email } = (store.getState() as { user: StoreUser }).user;
    return { id, email };
}

export function getUserId(): string | null {
    return getStoreUser().id;
}

/** Throws if no user ID is available in the store. */
export function requireUserId(): string {
    const id = getUserId();
    if (!id) throw new Error('Not authenticated');
    return id;
}

/** Returns the current user's email from the store, or null. */
export function getUserEmail(): string | null {
    return getStoreUser().email;
}

/** Returns both id and email, throws if not authenticated. */
export function requireUser(): { id: string; email: string | null } {
    const { id, email } = getStoreUser();
    if (!id) throw new Error('Not authenticated');
    return { id, email };
}
