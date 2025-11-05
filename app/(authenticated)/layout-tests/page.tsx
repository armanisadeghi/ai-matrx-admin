'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Ruler, Smartphone, Monitor, Layers, AlertCircle } from 'lucide-react';

export default function LayoutTestsPage() {
  const [activeTest, setActiveTest] = useState<string>('overview');
  const [inputValue, setInputValue] = useState('');

  const tests = [
    { id: 'overview', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
    { id: 'viewport', label: 'Viewport Units', icon: <Ruler className="w-4 h-4" /> },
    { id: 'safe-areas', label: 'Safe Areas', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'chat-layout', label: 'Chat Layout', icon: <Monitor className="w-4 h-4" /> },
  ];

  return (
    <div className="h-[calc(100vh-2.5rem)] lg:h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-gradient-to-br from-purple-50 to-blue-50 dark:from-zinc-900 dark:to-zinc-800">
      {/* Header with test selector */}
      <div className="flex-shrink-0 p-4 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-purple-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-purple-900 dark:text-purple-100">Layout Tests</h1>
            <p className="text-sm text-purple-600 dark:text-purple-300">Mobile viewport debugging</p>
          </div>
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            TEST ROUTE
          </Badge>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tests.map((test) => (
            <Button
              key={test.id}
              variant={activeTest === test.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTest(test.id)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {test.icon}
              {test.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Test content area - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTest === 'overview' && <OverviewTest />}
        {activeTest === 'viewport' && <ViewportUnitsTest />}
        {activeTest === 'safe-areas' && <SafeAreasTest />}
        {activeTest === 'chat-layout' && <ChatLayoutTest inputValue={inputValue} setInputValue={setInputValue} />}
      </div>
    </div>
  );
}

function OverviewTest() {
  return (
    <div className="space-y-4">
      <Card className="border-red-500 border-2">
        <CardHeader className="bg-red-50 dark:bg-red-950/20">
          <CardTitle className="text-red-900 dark:text-red-100">Issues Found</CardTitle>
          <CardDescription>Problems with current mobile layout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-lg border-l-4 border-red-500">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">1. Using min-h-screen instead of min-h-dvh</h4>
            <p className="text-sm text-red-800 dark:text-red-200">
              MobileLayout.tsx line 45 & 178: Uses min-h-screen which doesn't account for mobile browser UI
            </p>
          </div>
          
          <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-lg border-l-4 border-red-500">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">2. No safe-area-inset-bottom usage</h4>
            <p className="text-sm text-red-800 dark:text-red-200">
              Bottom-fixed elements will be covered by mobile browser UI and home indicators
            </p>
          </div>
          
          <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-lg border-l-4 border-red-500">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">3. Fixed header height assumption</h4>
            <p className="text-sm text-red-800 dark:text-red-200">
              Mobile header is h-12 (3rem) but calculations don't always account for this properly
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-500 border-2">
        <CardHeader className="bg-green-50 dark:bg-green-950/20">
          <CardTitle className="text-green-900 dark:text-green-100">Solutions Available</CardTitle>
          <CardDescription>Tools already in globals.css</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <div className="p-3 bg-green-100 dark:bg-green-950/40 rounded-lg border-l-4 border-green-500">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">Dynamic Viewport Units</h4>
            <code className="text-sm text-green-800 dark:text-green-200 block mt-1">
              .h-dvh, .min-h-dvh, .max-h-dvh
            </code>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Use these instead of h-screen for keyboard-aware heights
            </p>
          </div>
          
          <div className="p-3 bg-green-100 dark:bg-green-950/40 rounded-lg border-l-4 border-green-500">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">Safe Area Utilities</h4>
            <code className="text-sm text-green-800 dark:text-green-200 block mt-1">
              .pb-safe, .mb-safe
            </code>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              env(safe-area-inset-bottom, 1rem) - ensures visibility above browser UI
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-500 border-2">
        <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
          <CardTitle className="text-blue-900 dark:text-blue-100">Current Viewport Info</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ViewportInfo />
        </CardContent>
      </Card>
    </div>
  );
}

function ViewportInfo() {
  const [info, setInfo] = useState({
    innerHeight: 0,
    innerWidth: 0,
    screenHeight: 0,
    screenWidth: 0,
    visualHeight: 0,
    visualWidth: 0,
  });

  React.useEffect(() => {
    const updateInfo = () => {
      setInfo({
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        screenHeight: window.screen.height,
        screenWidth: window.screen.width,
        visualHeight: window.visualViewport?.height || 0,
        visualWidth: window.visualViewport?.width || 0,
      });
    };

    updateInfo();
    window.addEventListener('resize', updateInfo);
    window.visualViewport?.addEventListener('resize', updateInfo);

    return () => {
      window.removeEventListener('resize', updateInfo);
      window.visualViewport?.removeEventListener('resize', updateInfo);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded">
        <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Window Inner</div>
        <div className="font-mono font-bold text-blue-900 dark:text-blue-100">
          {info.innerWidth} × {info.innerHeight}
        </div>
      </div>
      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded">
        <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Screen</div>
        <div className="font-mono font-bold text-blue-900 dark:text-blue-100">
          {info.screenWidth} × {info.screenHeight}
        </div>
      </div>
      <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded col-span-2">
        <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Visual Viewport (visible area)</div>
        <div className="font-mono font-bold text-purple-900 dark:text-purple-100">
          {info.visualWidth} × {info.visualHeight}
        </div>
        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
          ↑ This changes when keyboard appears
        </div>
      </div>
    </div>
  );
}

function ViewportUnitsTest() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Viewport Unit Comparison</CardTitle>
          <CardDescription>See the difference between vh, dvh, and svh</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 100vh box */}
          <div className="relative">
            <div className="h-[100vh] border-4 border-red-500 bg-red-100 dark:bg-red-950/20 rounded-lg p-4 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 p-2 bg-red-500 text-white text-xs font-bold text-center">
                TOP: 100vh (Static Viewport Height)
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-red-500 text-white text-xs font-bold text-center">
                BOTTOM: This may be hidden below mobile browser UI ❌
              </div>
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="font-mono text-lg font-bold text-red-900 dark:text-red-100">height: 100vh</p>
                  <p className="text-sm text-red-700 dark:text-red-300">Doesn't account for browser UI</p>
                </div>
              </div>
            </div>
          </div>

          {/* 100dvh box */}
          <div className="relative">
            <div className="h-dvh border-4 border-green-500 bg-green-100 dark:bg-green-950/20 rounded-lg p-4 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 p-2 bg-green-500 text-white text-xs font-bold text-center">
                TOP: 100dvh (Dynamic Viewport Height)
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-green-500 text-white text-xs font-bold text-center">
                BOTTOM: Adjusts for keyboard & browser UI ✅
              </div>
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="font-mono text-lg font-bold text-green-900 dark:text-green-100">height: 100dvh</p>
                  <p className="text-sm text-green-700 dark:text-green-300">Dynamically adjusts for browser UI</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-700 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-2">
              📱 Test Instructions:
            </p>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
              <li>Scroll and observe which boxes have their bottom visible</li>
              <li>Tap an input field below to open keyboard</li>
              <li>Watch how dvh adjusts but vh doesn't</li>
              <li>The green (dvh) bottom should stay visible above keyboard</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SafeAreasTest() {
  return (
    <div className="space-y-4 pb-32">
      <Card>
        <CardHeader>
          <CardTitle>Safe Area Testing</CardTitle>
          <CardDescription>Testing env(safe-area-inset-bottom) utilities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Scroll to bottom to see the test elements. On mobile devices with home indicators or browser chrome,
            the safe area utilities should prevent content from being obscured.
          </p>
        </CardContent>
      </Card>

      {/* Filler content to make scrolling necessary */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Filler content {i} - Keep scrolling down...
            </p>
          </CardContent>
        </Card>
      ))}

      {/* Fixed bottom elements - WITHOUT safe area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-red-500 text-white z-50 pointer-events-none">
        <div className="text-center text-xs font-bold mb-2">
          ❌ NO SAFE AREA (pb-4 only)
        </div>
        <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg text-gray-900 dark:text-white text-xs text-center">
          This text might be hidden by mobile browser UI or home indicator
        </div>
      </div>

      {/* Fixed bottom elements - WITH safe area */}
      <div className="fixed bottom-20 left-0 right-0 pb-safe px-4 bg-green-500 text-white z-50 pointer-events-none">
        <div className="text-center text-xs font-bold mb-2">
          ✅ WITH SAFE AREA (pb-safe)
        </div>
        <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg text-gray-900 dark:text-white text-xs text-center">
          This text should always be visible above browser UI
        </div>
      </div>
    </div>
  );
}

function ChatLayoutTest({ inputValue, setInputValue }: { inputValue: string; setInputValue: (v: string) => void }) {
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello! This is a test message.', sender: 'user' },
    { id: 2, text: 'Hi there! How can I help you today?', sender: 'assistant' },
    { id: 3, text: 'I want to test the mobile layout.', sender: 'user' },
    { id: 4, text: 'Great! Try typing in the input below and watch how the layout behaves when the keyboard appears.', sender: 'assistant' },
  ]);

  return (
    <div className="fixed inset-0 top-12 lg:top-10 lg:left-64 flex flex-col bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-800">
      {/* Messages area - should scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          ))}
          
          {/* More filler messages for scrolling */}
          {[5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700">
                <p className="text-sm">Test message {i} - Scroll down to see the input</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input area - WRONG WAY (no safe area) */}
      <div className="flex-shrink-0 border-t-4 border-red-500 bg-red-100 dark:bg-red-950/80 p-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-red-900 dark:text-red-100 font-bold mb-2 text-center">
            ❌ WITHOUT pb-safe - This may get hidden!
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Type here and watch keyboard behavior..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-white dark:bg-zinc-800"
            />
            <Button>Send</Button>
          </div>
        </div>
      </div>

      {/* Input area - RIGHT WAY (with safe area) */}
      <div className="flex-shrink-0 border-t-4 border-green-500 bg-green-100 dark:bg-green-950/80 pb-safe px-4 pt-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-green-900 dark:text-green-100 font-bold mb-2 text-center">
            ✅ WITH pb-safe - Always visible!
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="This input should stay above browser UI..."
              className="flex-1 bg-white dark:bg-zinc-800"
            />
            <Button variant="default" className="bg-green-600 hover:bg-green-700">Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

