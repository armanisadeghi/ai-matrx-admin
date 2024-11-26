'use client';

import "./module.css";
import * as React from "react";
import { useState } from "react";
import { Reorder } from "framer-motion";
import { Item } from "./item";

const initialItems = ["🍅 Tomato", "🥒 Cucumber", "🧀 Cheese", "🥬 Lettuce"];

export default function App() {
    const [items, setItems] = useState(initialItems);

    return (
        <Reorder.Group axis="y" onReorder={setItems} values={items}>
            {items.map((item) => (
                <Item key={item} item={item} />
            ))}
        </Reorder.Group>
    );
}
