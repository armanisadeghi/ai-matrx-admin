// FlashcardFront.tsx
import { Card, CardContent } from "@/components/ui/card";

interface FlashcardFrontProps {
    content: string;
    fontSize: number;
}

export const FlashcardFront = ({ content, fontSize }: FlashcardFrontProps) => (
    <Card className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
        <CardContent className="flex-grow flex items-center justify-center p-6 overflow-auto h-full">
            <p className="text-center text-white" style={{ fontSize: `${fontSize + 20}px` }}>
                {content}
            </p>
        </CardContent>
    </Card>
);
