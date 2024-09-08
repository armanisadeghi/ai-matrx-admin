'use client';

import {useState, useCallback} from "react";
import Image from "next/image";
import Camera from "@/components/matrx/camera/camera";
import {Dialog, DialogContent, DialogTrigger} from "@/components/ui/dialog";
import {CameraIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {CameraProvider, useCamera} from "@/components/matrx/camera/camera-provider";
import {Carousel, Card} from "@/components/ui/added-ui/cards/apple-cards-carousel";

function CameraComponent() {
    const [showDialog, setShowDialog] = useState(false);
    const {images, addImage} = useCamera();

    const handleCapturedImages = useCallback((newImages: string[]) => {
        newImages.forEach(img => addImage(img));
        setShowDialog(false);
    }, [addImage]);

    const carouselItems = images.map((image, index) => ({
        src: image,
        title: `Webcam Image ${index + 1}`,
        category: "Instant Images",
        content: (
            <div className="flex flex-col items-center">
                <Image
                    src={image}
                    alt={`Product ${index + 1}`}
                    width={400}
                    height={300}
                    className="w-full h-auto max-h-96 object-contain"
                />
                <p className="mt-4 text-lg">Details for Image {index + 1}</p>
                <p className="mt-2 text-gray-600">Add more image details here...</p>
            </div>
        ),
    }));

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div
                className="flex flex-1 flex-col items-center justify-start rounded-lg border border-dashed shadow-sm p-4">
                <div className="flex flex-col items-center justify-center space-y-4 p-8">
                    <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium">Take Photos With Your Webcam</h3>
                    </div>
                    <div className="flex items-center justify-center space-x-4">
                        <Dialog
                            open={showDialog}
                            onOpenChange={setShowDialog}
                        >
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <CameraIcon className="mr-2 h-5 w-5"/>
                                    Capture Photo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="h-svh w-svw max-w-full p-0">
                                <Camera
                                    onClosed={() => setShowDialog(false)}
                                    onCapturedImages={handleCapturedImages}
                                />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Advanced Carousel */}
                {images.length > 0 && (
                    <div className="w-full mt-8">
                        <Carousel
                            items={carouselItems.map((item, index) => (
                                <Card key={index} card={item} index={index} layout={true}/>
                            ))}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}

export default function CameraPage() {
    return (
        <CameraProvider>
            <CameraComponent/>
        </CameraProvider>
    )
}