// 'use client';

// import { useEffect, useState, useCallback, useRef } from 'react';

// const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:9000/ws';

// interface WebSocketMessage {
//     type: string;
//     payload?: any;
// }

// interface UseWebSocketReturn {
//     isConnected: boolean;
//     isAuthenticated: boolean;
//     messages: WebSocketMessage[];
//     sendMessage: (message: WebSocketMessage) => void;
//     connect: () => void;
//     disconnect: () => void;
// }

// export const useWebSocket = (token?: string): UseWebSocketReturn => {
//     const [isConnected, setIsConnected] = useState(false);
//     const [isAuthenticated, setIsAuthenticated] = useState(false);
//     const [messages, setMessages] = useState<WebSocketMessage[]>([]);
//     const wsRef = useRef<WebSocket | null>(null);
//     const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
//     const reconnectAttemptsRef = useRef(0);

//     const connect = useCallback(() => {
//         if (wsRef.current?.readyState === WebSocket.OPEN) {
//             console.log('WebSocket already connected');
//             return;
//         }

//         try {
//             const ws = new WebSocket(WS_URL);

//             ws.onopen = () => {
//                 console.log('✅ WebSocket connected');
//                 setIsConnected(true);
//                 reconnectAttemptsRef.current = 0;

//                 // Auto-authenticate if token is available
//                 if (token) {
//                     ws.send(JSON.stringify({
//                         type: 'authenticate',
//                         payload: { token },
//                     }));
//                 }
//             };

//             ws.onmessage = (event) => {
//                 try {
//                     const message = JSON.parse(event.data);
//                     console.log('📨 Received:', message);

//                     setMessages((prev) => [message, ...prev].slice(0, 100));

//                     // Handle auth status
//                     if (message.type === 'auth:success') {
//                         setIsAuthenticated(true);
//                     } else if (message.type === 'auth:error') {
//                         setIsAuthenticated(false);
//                     }
//                 } catch (error) {
//                     console.error('Error parsing message:', error);
//                 }
//             };

//             ws.onerror = (error) => {
//                 console.error('❌ WebSocket error:', error);
//             };

//             ws.onclose = (event) => {
//                 console.log('🔌 WebSocket closed:', event.code, event.reason);
//                 setIsConnected(false);
//                 setIsAuthenticated(false);
//                 wsRef.current = null;

//                 // Auto-reconnect with exponential backoff
//                 if (reconnectAttemptsRef.current < 5) {
//                     const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
//                     console.log(`Reconnecting in ${delay}ms...`);
//                     reconnectTimeoutRef.current = setTimeout(() => {
//                         reconnectAttemptsRef.current++;
//                         connect();
//                     }, delay);
//                 }
//             };

//             wsRef.current = ws;
//         } catch (error) {
//             console.error('Failed to connect:', error);
//         }
//     }, [token]);

//     const disconnect = useCallback(() => {
//         if (reconnectTimeoutRef.current) {
//             clearTimeout(reconnectTimeoutRef.current);
//         }
//         if (wsRef.current) {
//             wsRef.current.close(1000, 'Client disconnect');
//             wsRef.current = null;
//         }
//         setIsConnected(false);
//         setIsAuthenticated(false);
//     }, []);

//     const sendMessage = useCallback((message: WebSocketMessage) => {
//         if (wsRef.current?.readyState === WebSocket.OPEN) {
//             wsRef.current.send(JSON.stringify(message));
//         } else {
//             console.error('WebSocket is not connected');
//         }
//     }, []);

//     // Auto-connect when token is available
//     useEffect(() => {
//         if (token) {
//             connect();
//         }

//         return () => {
//             disconnect();
//         };
//     }, [token, connect, disconnect]);

//     return {
//         isConnected,
//         isAuthenticated,
//         messages,
//         sendMessage,
//         connect,
//         disconnect,
//     };
// };

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
