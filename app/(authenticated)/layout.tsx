// app/(authenticated)/layout.tsx

import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {Providers} from "@/app/Providers"

export default async function AuthenticatedLayout({children}: { children: React.ReactNode }) {
    const supabase = createClient()
    const {data, error} = await supabase.auth.getUser()

    if (error || !data?.user) {
        redirect('/sign-in')
    }

    return (
        <Providers>
            {children}
        </Providers>
    )
}
