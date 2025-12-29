"use client";

import { useEffect, useState } from "react";

interface ToastProps {
    message: string;
    visible: boolean;
    onDismiss: () => void;
}

export function Toast({ message, visible, onDismiss }: ToastProps) {
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            // Small delay to ensure DOM is ready for animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsAnimating(true);
                });
            });
            return;
        }
        setIsAnimating(false);
        // Wait for exit animation to complete
        const timer = setTimeout(() => {
            setShouldRender(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [visible]);

    // Auto-dismiss after 3 seconds
    useEffect(() => {
        if (!visible) return;
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [visible, onDismiss]);

    if (!shouldRender) return null;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
            style={{ paddingTop: "5rem" }}
        >
            <div
                className={`
                    pointer-events-auto
                    px-5 py-3
                    rounded-xl
                    border border-[#2a2d33]
                    backdrop-blur-sm
                    transition-all duration-300 ease-out
                    ${isAnimating ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}
                `}
                style={{
                    background: "linear-gradient(135deg, #fecaca 0%, #fca5a5 100%)",
                    // Layered shadows for the floating aura effect
                    boxShadow: `
                        0 0 0 1px rgba(239, 68, 68, 0.15),
                        0 4px 6px -1px rgba(0, 0, 0, 0.15),
                        0 10px 20px -5px rgba(0, 0, 0, 0.1),
                        0 20px 40px -10px rgba(239, 68, 68, 0.15),
                        0 0 60px -10px rgba(239, 68, 68, 0.2),
                        inset 0 1px 0 rgba(255, 255, 255, 0.6)
                    `,
                }}
                role="alert"
                aria-live="polite"
            >
                <p className="text-sm font-medium tracking-tight" style={{ color: "#1a1612" }}>
                    {message}
                </p>
            </div>
        </div>
    );
}
