import {Button, Input} from "@/components/ui";
import {Image as ImageIcon, Maximize2, Minimize2, MoreHorizontal, Paperclip, Smile} from "lucide-react";
import React from "react";

const EmailReply = () => (
    <div className="border-t bg-card/50 flex-shrink-0"> {/* Added flex-shrink-0 */}
        <div className="p-2">
            <div className="rounded-lg border bg-background">
                <div className="flex items-center gap-2 p-2 border-b">
                    <span className="text-sm text-muted-foreground">
                        Reply to Sender Name
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Minimize2 className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Maximize2 className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
                <div className="p-2">
                    <Input
                        placeholder="Write your reply..."
                        className="bg-background mb-2"
                    />
                    <div className="flex items-center justify-between">
                        <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Paperclip className="h-4 w-4"/>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ImageIcon className="h-4 w-4"/>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Smile className="h-4 w-4"/>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4"/>
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                                Save Draft
                            </Button>
                            <Button size="sm">
                                Send
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default EmailReply;
