"use client";

import { useSocketInit } from "@/lib/redux/socket-io/connection/useSocketInit";

export default function SocketInitializer() {
    useSocketInit();
    return null;
}
