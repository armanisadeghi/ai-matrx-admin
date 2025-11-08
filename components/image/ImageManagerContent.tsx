import { useState, useEffect } from 'react';
import { useSelectedImages, ImageSource } from './context/SelectedImagesProvider';
import { ResponsiveGallery } from './ResponsiveGallery';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { X, Plus, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ImageManagerProps {
  initialSelectionMode?: 'single' | 'multiple';
  initialTab?: string;
  onClose?: () => void;
  onSave?: (urls: string[]) => void;
  userImages?: string[];
}

export default function ImageManagerContent({ 
  initialSelectionMode = 'multiple',
  initialTab = 'user-images', 
  onClose, 
  onSave,
  userImages = []
}: ImageManagerProps) {
  const { selectedImages, addImage, removeImage, clearImages, replaceImages } = useSelectedImages();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectionMode, setIsSelectionMode] = useState(initialSelectionMode === 'multiple');
  
  console.log('ImageManagerContent rendering with', {
    selectedImagesCount: selectedImages.length,
    initialTab,
    userImagesCount: userImages.length,
    isSelectionMode
  });

  // When the component mounts, log the initial state
  useEffect(() => {
    console.log('ImageManagerContent mounted:', {
      initialSelectedImages: selectedImages,
      initialSelectionMode,
      initialTab,
      userImages
    });
  }, []);

  const handleSave = () => {
    console.log('handleSave called in ImageManagerContent', {
      selectedImages,
      selectedCount: selectedImages.length
    });
    
    // If images are selected, pass their URLs to the onSave callback
    if (selectedImages.length > 0) {
      const imageUrls = selectedImages.map((img: ImageSource) => 
        typeof img === 'string' ? img : img.url || ''
      ).filter(url => url.length > 0);
      
      console.log('Passing image URLs to onSave:', imageUrls);
      onSave?.(imageUrls);
    }
    
    onClose?.();
  };

  const handleClearSelection = () => {
    console.log('Clearing selected images');
    clearImages();
  };

  // Handle clicking an image in the gallery
  const handleImageClick = (imageUrl: string) => {
    console.log('Image clicked:', imageUrl);
    
    if (isSelectionMode) {
      // Check if image is already selected
      const isSelected = selectedImages.some((img: ImageSource) => 
        typeof img === 'string' ? img === imageUrl : img.url === imageUrl
      );
      
      if (isSelected) {
        console.log('Removing image from selection:', imageUrl);
        removeImage(imageUrl);
      } else {
        console.log('Adding image to selection:', imageUrl);
        addImage({
          type: 'public',
          url: imageUrl,
          id: imageUrl
        });
      }
    } else {
      // Single selection mode
      console.log('Setting image as single selection:', imageUrl);
      replaceImages([{
        type: 'public',
        url: imageUrl,
        id: imageUrl
      }]);
      // Optionally, you might want to automatically save in single selection mode
      // handleSave();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-border">
        <h2 className="text-lg font-medium">Image Manager</h2>
        
        <div className="flex items-center gap-2">
          {selectedImages.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
            </span>
          )}
          
          {selectedImages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearSelection}
              className="text-xs"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
          
          <Button onClick={handleSave} size="sm">
            Use Selected Images
          </Button>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="w-full flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="user-images">Your Images</TabsTrigger>
            <TabsTrigger value="unsplash">Unsplash</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="user-images" className="flex-1 p-4 overflow-y-auto">
          <ResponsiveGallery 
            type="direct" 
            imageUrls={userImages}
          />
        </TabsContent>
        
        <TabsContent value="unsplash" className="flex-1 p-4 overflow-y-auto">
          <div className="flex mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for images..."
                className="w-full rounded-md border border-input pl-9 pr-4 py-2 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsSearchActive(true);
                  }
                }}
              />
            </div>
            <Button 
              variant="secondary" 
              className="ml-2"
              onClick={() => setIsSearchActive(true)}
            >
              Search
            </Button>
          </div>
          
          {isSearchActive ? (
            searchTerm ? (
              <ResponsiveGallery 
                type="unsplash"
              />
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                Please enter a search term
              </div>
            )
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              Search for images to display results
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 