'use client';

import "./module.css";
import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Move removeItem function inside the component
export default function App() {
    const count = useRef(0);
    const [items, setItems] = useState([0]);
    const [popLayout, setPopLayout] = useState(false);

    // Helper function to remove an item from an array
    const removeItem = <T,>(arr: T[], item: T) => {
        const index = arr.indexOf(item);
        if (index > -1) arr.splice(index, 1);
    };

    return (
        <div className="example">
            <div className="controls">
                <label className="enable">
                    <code>popLayout</code>
                    <input
                        type="checkbox"
                        checked={popLayout}
                        onChange={(e) => setPopLayout(e.currentTarget.checked)}
                    />
                </label>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        count.current++;
                        setItems([...items, count.current]);
                    }}
                >
                    Add item
                </motion.button>
            </div>
            <ul>
                <AnimatePresence mode={popLayout ? "popLayout" : "sync"}>
                    {items.map((id) => (
                        <motion.li
                            layout
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring" }}
                            key={id}
                            onClick={() => {
                                const newItems = [...items];
                                removeItem(newItems, id);
                                setItems(newItems);
                            }}
                        />
                    ))}
                </AnimatePresence>
            </ul>
        </div>
    );
}