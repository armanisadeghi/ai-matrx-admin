import { Counter } from '@/features/counter/components/Counter'
import { StoreInitializer } from '@/lib/redux/StoreInitializer'
import { store } from '@/lib/redux/store'

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <StoreInitializer preloadedState={store.getState()} />
            <Counter />
        </main>
    )
}
