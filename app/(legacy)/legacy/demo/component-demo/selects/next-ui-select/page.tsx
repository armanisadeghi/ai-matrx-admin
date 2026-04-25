'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const animals = [
  {key: "cat", label: "Cat"},
  {key: "dog", label: "Dog"},
  {key: "elephant", label: "Elephant"},
  {key: "lion", label: "Lion"},
  {key: "tiger", label: "Tiger"},
  {key: "giraffe", label: "Giraffe"},
  {key: "dolphin", label: "Dolphin"},
  {key: "penguin", label: "Penguin"},
  {key: "zebra", label: "Zebra"},
  {key: "shark", label: "Shark"},
  {key: "whale", label: "Whale"},
  {key: "otter", label: "Otter"},
  {key: "crocodile", label: "Crocodile"},
];

export default function App() {
  return (
    <div className="w-full max-w-xs space-y-2">
      <Label htmlFor="animal-select">Favorite Animal</Label>
      <Select>
        <SelectTrigger id="animal-select">
          <SelectValue placeholder="Select an animal" />
        </SelectTrigger>
        <SelectContent>
          {animals.map((animal) => (
            <SelectItem key={animal.key} value={animal.key}>
              {animal.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
