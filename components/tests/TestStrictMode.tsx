'use client'

import { useEffect } from 'react'

export default function TestStrictMode() {
  useEffect(() => {
    console.log('Component mounted')
  }, [])

  console.log('Component rendered')
  
  return <div>Test Component</div>
}