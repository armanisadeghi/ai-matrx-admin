'use client';

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"

interface ImageCardProps {
    photo: any
    onClick: () => void
    onMouseEnter: () => void
    onMouseLeave: () => void
}

export function ImageCard({ photo, onClick, onMouseEnter, onMouseLeave }: ImageCardProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="cursor-pointer"
        >
            <Card className="overflow-hidden group">
                <CardContent className="p-0 relative">
                    <img
                        src={photo.urls.small}
                        alt={photo.alt_description}
                        className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            whileHover={{ scale: 1 }}
                            className="bg-white text-black rounded-full p-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                <line x1="11" y1="8" x2="11" y2="14"></line>
                                <line x1="8" y1="11" x2="14" y2="11"></line>
                            </svg>
                        </motion.div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}