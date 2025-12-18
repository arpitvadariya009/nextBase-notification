'use client';

import { useEffect, useState } from "react";

interface ToastData {
    title: string;
    message: string;
}

export default function NotificationToast({ event }: { event?: ToastData }) {
    const [visible, setVisible] = useState(false);
    const [toast, setToast] = useState<ToastData | null>(null);

    useEffect(() => {
        if (event) {
            setToast(event);
            setVisible(true);

            const timer = setTimeout(() => setVisible(false), 9000);
            return () => clearTimeout(timer);
        }
    }, [event]);

    if (!toast) return null;

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 transition-all duration-300 
                ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
            `}
        >
            <div className="bg-gray-900 text-white p-4 rounded-lg shadow-xl w-80">
                <h4 className="font-semibold text-lg">{toast.title}</h4>
                <p className="text-sm opacity-80 mt-1">{toast.message}</p>
            </div>
        </div>
    );
}
