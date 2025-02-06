// page.tsx
import dynamic from 'next/dynamic'

const GamePageClient = dynamic(() => import('./GamePageClient'), { 
  ssr: false 
})

export default function GamePage() {
  return <GamePageClient />
}