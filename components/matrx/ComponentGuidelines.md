### Component Development Guidelines

Reusable Components for The Matrx Platform

---

### 1. **Proper Utilization of `cn` Utility for Class Names**
- **Description**: Always use the `cn` utility to manage class names dynamically within components.
- **Example**:
  ```tsx
  <Card className={cn("p-6 space-y-4", className)}>
      {/* Content */}
  </Card>
  ```
---

### 2. **Props Interface for Consistent Structure and Type Safety**
- **Description**: Define clear and consistent prop interfaces for each component, and always extend from relevant HTML attributes (e.g., `React.HTMLAttributes<HTMLDivElement>`).
- **Example**:
  ```tsx
  interface FullJsonEditorProps extends React.HTMLAttributes<HTMLDivElement> {
      initialData: string;
      onSave?: (data: string) => void;
      title?: string;
  }
  ```
---

### 3. **Client-Side Directive Usage (`'use client'`)**
- **Description**: Apply the `'use client'` directive at the top of every file that includes client-side logic (e.g., state, hooks) to ensure proper Next.js behavior.
- **Example**:
  ```tsx
  'use client';
  
  import React, { useState } from 'react';
  ```
---

### 4. **Component Flexibility and Reusability**
- **Description**: Components should be designed with reusability in mind. This involves:
    - Using composition over inheritance where possible.
    - Accepting dynamic data through props (e.g., JSON data for editors).
    - Using utility functions (e.g., `generateJsonTemplate`) to handle logic that might be reused across multiple components.
- **Purpose**: This ensures that components are not tightly coupled to specific implementations, allowing for maximum reusability.
- **Example**:
  ```tsx
  <FullJsonEditor
      initialData={jsonData}
      onSave={handleSave}
      title={`Create New ${selectedSchema} Record`}
      className="custom-style"
  />
  ```
---

### 5. **Consistent Use of Animation and Motion Libraries**
- **Description**: Use `framer-motion` for animations within components, ensuring animations are defined clearly and follow consistent patterns (e.g., `AnimatePresence`).
- **Example**:
  ```tsx
  <AnimatePresence>
      {isValidating && (
          <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 right-2"
          >
              <Loader2 className="h-4 w-4 animate-spin" />
          </motion.div>
      )}
  </AnimatePresence>
  ```
---

### 6. ****
