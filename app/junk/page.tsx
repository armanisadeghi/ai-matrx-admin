// app/page.tsx
import { Button } from '@/components/ui/button';

export default function Page() {
    return (
        <div className='p-4 space-y-4'>
            <div className='bg-red-500 p-4 rounded-lg'>Tailwind Test</div>
            <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer'>Test Button</button>{' '}
            <Button variant='primary'>shadcn Button</Button>
        </div>
    );
}
