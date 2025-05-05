# Current structure:

Directory: components/image

image/
├── ResponsiveGallery.tsx
├── tasks.md
├── ImageManager.tsx (NEW)
├── gallery/
│   ├── ResponsiveDirectGallery.tsx
│   ├── desktop/
│   │   ├── ImageGallery.tsx
│   │   ├── SimpleImageViewer.tsx
│   ├── mobile/
│   │   ├── MobileImageGallery.tsx
│   │   ├── MobileImageViewer.tsx
├── shared/
│   ├── DesktopImageCard.tsx (UPDATED)
│   ├── MobileImageCard.tsx (UPDATED)
│   ├── ResponsiveImageCard.tsx
│   ├── SearchBar.tsx
│   ├── ImagePreviewRow.tsx (NEW)
│   ├── SelectableImageCard.tsx (NEW)
├── unsplash/
│   ├── ResponsiveUnsplashGallery.tsx
│   ├── desktop/
│   │   ├── EnhancedImageViewer.tsx
│   │   ├── EnhancedUnsplashGallery.tsx
│   ├── mobile/
│   │   ├── MobileUnsplashGallery.tsx
│   │   ├── MobileUnsplashViewer.tsx
├── context/
│   ├── SelectedImagesProvider.tsx (NEW)
│   ├── SelectedImagesWrapper.tsx (NEW)
├── examples/
│   ├── ImageManagerExample.tsx (NEW)


These components are used in a production environment. DO NOT MAKE BREAKING CHNAGES!

# Image Gallery & Management Tasks:

✅ 1. Create a simple provider pattern that manages a list of selected images.
✅ 2. Create a very simple component that renders as a row of small icons or previews and can render one or many selected images from public urls. This must be a highly generic component that will not care what the source of the urls is and it will work directly with the provider so if the urls are updated elsewhere, it will update them as well.
 - ✅ This component must be fully responsive and the easiest way to do that would be to make it where it always displays as a single row and then it scrolles right and left when it runs out of space, very much like a carousel, but this component is small.
 - ✅ Create the component with options for 5 size settings: xs, s, m, lg, xl
 - ✅ When it's xs, each image should be no bigger than a typical icon
 - ✅ When it's xl, it still will not be a massive component because if we wanted something much bigger, we would just use a carrousel instead.
🔄 3. Update all of the current image gallary components, including the ones for unsplash and the regular ones to have an option that will trigger them for 'selection' including single selection mode and multi-select mode.
   - ✅ Created SelectableImageCard component that wraps around existing image cards
   - ✅ Updated DesktopImageCard to use the new selectable wrapper
   - ✅ Updated MobileImageCard to use the new selectable wrapper
   - 🔄 Need to update main gallery components to support selection mode
✅ 4. Ensure that the state management for storing selected urls works across all implementations, including Unsplash, the normal viewer and all internal variations. Nonne of them should manage this 'selected imgage or selected images' internally and should only rely on the centralized state.
✅ 5. None should ever reset the state, unless there is a specific user action to do so.
✅ 6. Create a wrapper using our reusable full screen component here: components\official\FullScreenOverlay.tsx that has separate tabs for 'public search' and 'user images' and a tab for 'cloud images' which will not have anything yet because this will use our already available supabase storage system, but we don't want to mess with it yet. Just create the placeholder for it and ensure it matches the API for the others in terms of viewing images and storing urls with the provider.

Overall:
- ✅ Ensure everything is mobile friendly.
- 🔄 Ensure everything has an identical api (Make the components/hooks/providers work hard so that the components that use them will not have to.)
- ✅ Ensure modularity. (Do not create complex components that try to do many different things when they could easily be split into ones with specific jobs)

# Stage 2 Tasks:
- ✅ Create Icon version with manager
- ✅ Create single image display with full management
- Incorporate the single image selection into the applet builder to show that the component is also capable of returning the url.
    1. features\applet\builder\components\AppInfoStep.tsx
    2. features\applet\builder\components\AppletsConfigStep.tsx
    * Make sure we update the UI to incorporate this seamlessly, save space by removing the url field and also make sure we stick to the proper styling for this part of our system.

# Stage 3 Tasks
- Create grid multi-image display with full management
