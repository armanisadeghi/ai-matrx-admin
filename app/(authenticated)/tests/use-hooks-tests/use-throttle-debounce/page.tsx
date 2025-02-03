'use client';

import React, { useState } from 'react';
import { useThrottle } from "@uidotdev/usehooks";
import { useDebounce } from "@uidotdev/usehooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export default function ThrottleDebounceTest() {
  const [val, setVal] = useState("");
  const [throttleDelay, setThrottleDelay] = useState(500);
  const [debounceDelay, setDebounceDelay] = useState(500);
  
  const throttledValue = useThrottle(val, throttleDelay);
  const debouncedValue = useDebounce(val, debounceDelay);

  return (
    <div className="w-full p-4 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {/* Input Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Type some text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              className="mb-4"
            />
            <p className="text-sm">Current: {val}</p>
          </CardContent>
        </Card>

        {/* Throttle Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Throttle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Delay: {throttleDelay}ms</p>
                <Slider
                  value={[throttleDelay]}
                  onValueChange={(value) => setThrottleDelay(value[0])}
                  min={0}
                  max={2000}
                  step={100}
                  className="mb-4"
                />
              </div>
              <p className="text-sm">Throttled: {throttledValue}</p>
            </div>
          </CardContent>
        </Card>

        {/* Debounce Card */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Debounce</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Delay: {debounceDelay}ms</p>
                <Slider
                  value={[debounceDelay]}
                  onValueChange={(value) => setDebounceDelay(value[0])}
                  min={0}
                  max={2000}
                  step={100}
                  className="mb-4"
                />
              </div>
              <p className="text-sm">Debounced: {debouncedValue}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}