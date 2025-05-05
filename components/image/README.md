# Image Management System

This system provides a comprehensive solution for managing and selecting images across the application. It includes components for displaying, selecting, and managing images from different sources.

## Core Components

### Context Provider

- `SelectedImagesProvider`: Manages the state of selected images across the application.
- `SelectedImagesWrapper`: A convenience wrapper component to wrap parts of the application that need access to the selected images state.

> **Note:** The `SelectedImagesProvider` is already included in the app's global providers, so you can directly use the `useSelectedImages` hook anywhere in the application without additional setup.

### User Interface Components

- `ImageManager`: The main full-screen component for browsing and selecting images from different sources. It includes tabs for:
  - Public images (Unsplash)
  - User images
  - Cloud storage (placeholder for future integration)

- `ImagePreviewRow`: A responsive row component for displaying selected image previews in various sizes.

- `SelectableImageCard`: A wrapper component that adds selection functionality to any image component.

## How to Use

### Basic Usage

Since the provider is globally available, you can directly use the hooks and components:

```tsx
import { useSelectedImages } from '@/components/image/context/SelectedImagesProvider';
import { ImagePreviewRow } from '@/components/image/shared/ImagePreviewRow';

function MyComponent() {
  const { selectedImages, clearImages } = useSelectedImages();
  
  return (
    <div>
      <p>Selected Images: {selectedImages.length}</p>
      <ImagePreviewRow size="m" />
      <button onClick={clearImages}>Clear All</button>
    </div>
  );
}
```

### Using the Image Manager

```tsx
import { useState } from 'react';
import { ImageManager } from '@/components/image/ImageManager';
import { useSelectedImages } from '@/components/image/context/SelectedImagesProvider';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedImages } = useSelectedImages();
  
  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Image Manager</button>
      
      <div>
        Selected images: {selectedImages.length}
      </div>
      
      <ImageManager 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        initialSelectionMode="multiple" 
      />
    </div>
  );
}
```

### For Local State Management (when global state isn't desired)

If you need isolated image selection state for a specific part of your application, you can use the wrapper component:

```tsx
import { SelectedImagesWrapper } from '@/components/image/context/SelectedImagesWrapper';

function MyPageWithLocalState() {
  return (
    <SelectedImagesWrapper>
      {/* Components here will use an isolated image selection state */}
      <MyComponent />
    </SelectedImagesWrapper>
  );
}
```

## Size Variants

The `ImagePreviewRow` component supports 5 size variants:

- `xs`: Extra small (icon size)
- `s`: Small
- `m`: Medium (default)
- `lg`: Large
- `xl`: Extra large

## Example

An example implementation is available at `/examples/image-manager`.

## Selection Modes

The system supports three selection modes:

- `single`: Only one image can be selected at a time
- `multiple`: Multiple images can be selected
- `none`: Selection is disabled

Selection mode can be set through the `setSelectionMode` function from the `useSelectedImages` hook.

## Image Data Structure

Each image in the system is represented as an `ImageSource` object with the following structure:

```typescript
interface ImageSource {
  type: 'public' | 'temporary' | 'local' | 'bucket';
  url: string;
  id: string;
  metadata?: {
    description?: string;
    title?: string;
    [key: string]: any;
  };
}
``` 