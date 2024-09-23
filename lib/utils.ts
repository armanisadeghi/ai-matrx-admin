// File: lib/utils.ts

// NOTE: This is a duplicate just to help with the importing, since that's the library's default.


import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
