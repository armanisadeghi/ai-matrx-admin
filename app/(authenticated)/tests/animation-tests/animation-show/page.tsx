'use client';

import "./module.css";
import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "./Input";

export default function App() {
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
    const [rotate, setRotate] = useState(0);

    return (
        <div className="example">
            <div>
                <motion.div
                    className="box"
                    animate={{ x, y, rotate }}
                    transition={{ type: "spring" }}
                />
            </div>
            <div className="inputs">
                <Input value={x} set={setX}>
                    x
                </Input>
                <Input value={y} set={setY}>
                    y
                </Input>
                <Input value={rotate} set={setRotate} min={-180} max={180}>
                    rotate
                </Input>
            </div>
        </div>
    );
}
