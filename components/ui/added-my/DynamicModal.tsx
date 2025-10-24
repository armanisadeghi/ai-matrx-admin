import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const DynamicModal = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-textured rounded-lg shadow-lg w-full max-w-md p-6"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Product</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="hover:rotate-90 transition-transform duration-200"
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" placeholder="Type product name" className="mt-1" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="price">Price</Label>
                                    <Input id="price" type="number" placeholder="$2999" className="mt-1" />
                                </div>
                                <div>
                                    <Label htmlFor="category">Category</Label>
                                    <Select>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="tv">TV/Monitors</SelectItem>
                                            <SelectItem value="pc">PC</SelectItem>
                                            <SelectItem value="gaming">Gaming/Console</SelectItem>
                                            <SelectItem value="phones">Phones</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">Product Description</Label>
                                <Textarea id="description" placeholder="Write product description here" className="mt-1" />
                            </div>

                            <div>
                                <Label>Product Type</Label>
                                <RadioGroup defaultValue="physical" className="mt-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="physical" id="physical" />
                                        <Label htmlFor="physical">Physical</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="digital" id="digital" />
                                        <Label htmlFor="digital">Digital</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox id="terms" />
                                <Label htmlFor="terms">I agree to the terms and conditions</Label>
                            </div>

                            <div className="flex space-x-2">
                                <Button type="submit" className="flex-1">
                                    Add new product
                                </Button>
                                <Button variant="destructive" onClick={onClose} className="flex-1">
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DynamicModal;
