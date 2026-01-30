"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
}

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

interface AuthResponse {
    user: AuthUser;
    accessToken: string;
    expiresIn: number;
}

interface AuthContextValue {
    status: AuthStatus;
    user: AuthUser | null;
    accessToken: string | null;
    avatarUrl: string | null;
    apiBaseUrl: string | null;
    signIn: (email: string, password: string) => Promise<AuthUser>;
    signUp: (email: string, password: string, displayName?: string) => Promise<AuthUser>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    updateAvatar: (dataUrl: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_COLLAB_URL ?? null;

function avatarStorageKey(userId: string) {
    return `maple-avatar:${userId}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>(apiBaseUrl ? "loading" : "unauthenticated");
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const refreshTimerRef = useRef<number | null>(null);
    const refreshSessionRef = useRef<() => Promise<void>>(async () => undefined);

    const clearRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current !== null) {
            window.clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const scheduleRefresh = useCallback(
        (expiresIn: number) => {
            clearRefreshTimer();
            if (!apiBaseUrl) return;
            const delaySeconds = Math.max(expiresIn - 60, 30);
            refreshTimerRef.current = window.setTimeout(() => {
                refreshSessionRef.current().catch(() => undefined);
            }, delaySeconds * 1000);
        },
        [clearRefreshTimer],
    );

    const setSession = useCallback(
        (payload: AuthResponse) => {
            setUser(payload.user);
            setAccessToken(payload.accessToken);
            setStatus("authenticated");
            scheduleRefresh(payload.expiresIn);
        },
        [scheduleRefresh],
    );

    const clearSession = useCallback(() => {
        setUser(null);
        setAccessToken(null);
        setStatus("unauthenticated");
        clearRefreshTimer();
    }, [clearRefreshTimer]);

    const request = useCallback(
        async <T,>(path: string, options: RequestInit = {}, includeAuth = false): Promise<T> => {
            if (!apiBaseUrl) {
                throw new Error("Auth is not configured.");
            }

            const headers = new Headers(options.headers);
            if (options.body && !headers.has("Content-Type")) {
                headers.set("Content-Type", "application/json");
            }
            if (includeAuth && accessToken) {
                headers.set("Authorization", `Bearer ${accessToken}`);
            }

            const response = await fetch(`${apiBaseUrl}${path}`, {
                ...options,
                headers,
                credentials: "include",
            });

            const text = await response.text();
            let data: unknown = null;
            if (text) {
                try {
                    data = JSON.parse(text) as unknown;
                } catch (error) {
                    data = text;
                }
            }

            if (!response.ok) {
                const err = new Error(
                    typeof data === "object" && data && "error" in data
                        ? String((data as { error?: string }).error)
                        : "Request failed",
                ) as Error & { code?: string };
                if (typeof data === "object" && data && "code" in data) {
                    err.code = String((data as { code?: string }).code ?? "");
                }
                throw err;
            }

            return data as T;
        },
        [accessToken],
    );

    const refreshSession = useCallback(async () => {
        if (!apiBaseUrl) {
            clearSession();
            return;
        }

        try {
            const data = await request<AuthResponse>("/v1/auth/refresh", { method: "POST" });
            setSession(data);
        } catch (error) {
            clearSession();
        }
    }, [clearSession, request, setSession]);

    useEffect(() => {
        refreshSessionRef.current = refreshSession;
    }, [refreshSession]);

    const signIn = useCallback(
        async (email: string, password: string) => {
            const payload = await request<AuthResponse>(
                "/v1/auth/login",
                {
                    method: "POST",
                    body: JSON.stringify({ email, password }),
                },
                false,
            );
            setSession(payload);
            return payload.user;
        },
        [request, setSession],
    );

    const signUp = useCallback(
        async (email: string, password: string, displayName?: string) => {
            const payload = await request<AuthResponse>(
                "/v1/auth/register",
                {
                    method: "POST",
                    body: JSON.stringify({ email, password, displayName }),
                },
                false,
            );
            setSession(payload);
            return payload.user;
        },
        [request, setSession],
    );

    const signOut = useCallback(async () => {
        if (!apiBaseUrl) {
            clearSession();
            return;
        }

        try {
            await request("/v1/auth/logout", { method: "POST" });
        } finally {
            clearSession();
        }
    }, [clearSession, request]);

    const changePassword = useCallback(
        async (currentPassword: string, newPassword: string) => {
            await request(
                "/v1/auth/password",
                {
                    method: "POST",
                    body: JSON.stringify({ currentPassword, newPassword }),
                },
                true,
            );
        },
        [request],
    );

    const updateAvatar = useCallback(
        (dataUrl: string | null) => {
            if (!user) return;
            const key = avatarStorageKey(user.id);
            if (dataUrl) {
                window.localStorage.setItem(key, dataUrl);
            } else {
                window.localStorage.removeItem(key);
            }
            setAvatarUrl(dataUrl);
        },
        [user],
    );

    useEffect(() => {
        if (!user) {
            setAvatarUrl(null);
            return;
        }
        const key = avatarStorageKey(user.id);
        const stored = window.localStorage.getItem(key);
        setAvatarUrl(stored);
    }, [user]);

    useEffect(() => {
        if (!apiBaseUrl) {
            setStatus("unauthenticated");
            return;
        }
        refreshSession().catch(() => undefined);
        return () => {
            clearRefreshTimer();
        };
    }, [clearRefreshTimer, refreshSession]);

    const value = useMemo<AuthContextValue>(
        () => ({
            status,
            user,
            accessToken,
            avatarUrl,
            apiBaseUrl,
            signIn,
            signUp,
            signOut,
            refreshSession,
            changePassword,
            updateAvatar,
        }),
        [
            status,
            user,
            accessToken,
            avatarUrl,
            signIn,
            signUp,
            signOut,
            refreshSession,
            changePassword,
            updateAvatar,
        ],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}
