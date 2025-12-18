'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:9000/ws';

interface WebSocketMessage {
    type: string;
    payload?: any;
}

export const useWebSocket = (
    token?: string,
    onNotification?: (payload: any) => void   // 👈 NEW
) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [messages, setMessages] = useState<WebSocketMessage[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptsRef = useRef(0);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                setIsConnected(true);
                reconnectAttemptsRef.current = 0;

                if (token) {
                    ws.send(
                        JSON.stringify({
                            type: "authenticate",
                            payload: { token }
                        })
                    );
                }
            };

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                setMessages(prev => [message, ...prev].slice(0, 100));

                if (message.type === "auth:success") {
                    setIsAuthenticated(true);
                }

                // 👇 Handle new notification
                if (message.type === "notification:new") {
                    if (onNotification) {
                        onNotification(message.payload);
                    }
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                setIsAuthenticated(false);
                wsRef.current = null;

                if (reconnectAttemptsRef.current < 5) {
                    const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connect();
                    }, delay);
                }
            };

            wsRef.current = ws;
        } catch (err) {
            console.error("WS connection error", err);
        }
    }, [token, onNotification]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        wsRef.current?.close(1000, "Client closed");
        wsRef.current = null;
    }, []);

    const sendMessage = useCallback((msg: WebSocketMessage) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
        }
    }, []);

    useEffect(() => {
        if (token) connect();
        return () => disconnect();
    }, [token]);

    return {
        isConnected,
        isAuthenticated,
        messages,
        sendMessage,
        connect,
        disconnect
    };
};
