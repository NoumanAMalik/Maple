"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, LogOut, ShieldCheck, User as UserIcon, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const INPUT_CLASS =
    "w-full rounded border border-[var(--ui-border)] bg-[var(--editor-bg)] px-3 py-2 text-sm text-[var(--editor-fg)] placeholder:text-[var(--editor-line-number)] placeholder:opacity-70 outline-none transition-colors focus:border-[var(--ui-accent)]";
const LABEL_CLASS = "text-xs text-[var(--editor-line-number)]";
const HELPER_CLASS = "text-xs text-[var(--editor-line-number)]";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

type AuthMode = "signin" | "signup";

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function normalizeError(error: unknown) {
    if (error instanceof Error) return error.message;
    return "Something went wrong. Please try again.";
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
    const { status, user, avatarUrl, apiBaseUrl, signIn, signUp, signOut, changePassword, updateAvatar } = useAuth();

    const [mode, setMode] = useState<AuthMode>("signin");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [signInEmail, setSignInEmail] = useState("");
    const [signInPassword, setSignInPassword] = useState("");

    const [signUpEmail, setSignUpEmail] = useState("");
    const [signUpPassword, setSignUpPassword] = useState("");
    const [signUpConfirm, setSignUpConfirm] = useState("");
    const [signUpName, setSignUpName] = useState("");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const avatarInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setMode("signin");
        setError(null);
        setSuccess(null);
        setBusy(false);
    }, [isOpen]);

    useEffect(() => {
        setError(null);
        setSuccess(null);
    }, [mode]);

    const canSubmit = useMemo(() => {
        if (status === "authenticated") return true;
        if (mode === "signin") {
            return signInEmail.trim() !== "" && signInPassword.trim() !== "";
        }
        return signUpEmail.trim() !== "" && signUpPassword.trim() !== "" && signUpConfirm.trim() !== "";
    }, [mode, signInEmail, signInPassword, signUpEmail, signUpPassword, signUpConfirm, status]);

    const canUpdatePassword = useMemo(
        () => currentPassword.trim() !== "" && newPassword.trim() !== "" && confirmPassword.trim() !== "",
        [confirmPassword, currentPassword, newPassword],
    );

    const handleSignIn = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            if (!canSubmit || busy) return;
            setBusy(true);
            setError(null);
            try {
                await signIn(signInEmail.trim(), signInPassword);
                setSuccess("Welcome back!");
                setSignInPassword("");
            } catch (err) {
                setError(normalizeError(err));
            } finally {
                setBusy(false);
            }
        },
        [busy, canSubmit, signIn, signInEmail, signInPassword],
    );

    const handleSignUp = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            if (!canSubmit || busy) return;
            if (signUpPassword !== signUpConfirm) {
                setError("Passwords do not match.");
                return;
            }
            setBusy(true);
            setError(null);
            try {
                await signUp(signUpEmail.trim(), signUpPassword, signUpName.trim() || undefined);
                setSuccess("Account created! You're signed in.");
                setSignUpPassword("");
                setSignUpConfirm("");
            } catch (err) {
                setError(normalizeError(err));
            } finally {
                setBusy(false);
            }
        },
        [busy, canSubmit, signUp, signUpConfirm, signUpEmail, signUpName, signUpPassword],
    );

    const handleSignOut = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            await signOut();
            setSuccess("Signed out.");
        } catch (err) {
            setError(normalizeError(err));
        } finally {
            setBusy(false);
        }
    }, [signOut]);

    const handlePasswordChange = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            if (newPassword.trim().length < 8) {
                setError("New password must be at least 8 characters.");
                return;
            }
            if (newPassword !== confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
            setBusy(true);
            setError(null);
            try {
                await changePassword(currentPassword, newPassword);
                setSuccess("Password updated.");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } catch (err) {
                setError(normalizeError(err));
            } finally {
                setBusy(false);
            }
        },
        [changePassword, confirmPassword, currentPassword, newPassword],
    );

    const handleAvatarChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > MAX_AVATAR_SIZE) {
                setError("Image must be under 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === "string") {
                    updateAvatar(reader.result);
                    setSuccess("Profile image updated.");
                }
            };
            reader.readAsDataURL(file);
            event.target.value = "";
        },
        [updateAvatar],
    );

    const handleAvatarRemove = useCallback(() => {
        updateAvatar(null);
        setSuccess("Profile image removed.");
    }, [updateAvatar]);

    if (!apiBaseUrl) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Account">
                <div className="space-y-3 text-sm text-[var(--editor-line-number)]">
                    <p>Auth is not configured for this deployment.</p>
                    <p>Set NEXT_PUBLIC_API_URL (or NEXT_PUBLIC_COLLAB_URL) to enable sign-in.</p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Account">
            <div className="space-y-6">
                {error && (
                    <div className="rounded border border-[var(--level-danger)]/40 bg-[var(--level-danger)]/10 px-3 py-2 text-sm text-[var(--level-danger)]">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="rounded border border-[var(--level-success)]/40 bg-[var(--level-success)]/10 px-3 py-2 text-sm text-[var(--level-success)]">
                        {success}
                    </div>
                )}

                {status === "loading" ? (
                    <div className="flex items-center gap-3 text-sm text-[var(--editor-line-number)]">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ui-accent)] border-t-transparent" />
                        Checking your session...
                    </div>
                ) : status === "authenticated" && user ? (
                    <div className="space-y-8">
                        <div className="flex items-start justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="relative h-14 w-14 overflow-hidden rounded-full border border-[var(--ui-border)] bg-[var(--ui-active)]">
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt={user.displayName}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-[var(--editor-line-number)]">
                                            <UserIcon className="h-6 w-6" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-[var(--editor-fg)]">{user.displayName}</p>
                                    <p className="text-sm text-[var(--editor-line-number)]">{user.email}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="flex items-center gap-2 rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-xs text-[var(--editor-fg)] transition-colors hover:bg-[var(--ui-hover)]"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </button>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--editor-line-number)]">
                                    <Camera className="h-4 w-4" />
                                    Profile image
                                </div>
                                <p className="text-sm text-[var(--editor-line-number)]">
                                    Add an optional avatar. Stored locally on this device.
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-xs text-[var(--editor-fg)] transition-colors hover:bg-[var(--ui-hover)]"
                                    >
                                        Upload image
                                    </button>
                                    {avatarUrl && (
                                        <button
                                            type="button"
                                            onClick={handleAvatarRemove}
                                            className="rounded-md border border-[var(--ui-border)] px-3 py-1.5 text-xs text-[var(--editor-line-number)] transition-colors hover:bg-[var(--ui-hover)]"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--editor-line-number)]">
                                    <ShieldCheck className="h-4 w-4" />
                                    Reset password
                                </div>
                                <form className="space-y-3" onSubmit={handlePasswordChange}>
                                    <div className="space-y-2">
                                        <label className={LABEL_CLASS} htmlFor="current-password">
                                            Current password
                                        </label>
                                        <input
                                            id="current-password"
                                            type="password"
                                            value={currentPassword}
                                            onChange={(event) => setCurrentPassword(event.target.value)}
                                            className={INPUT_CLASS}
                                            autoComplete="current-password"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={LABEL_CLASS} htmlFor="new-password">
                                            New password
                                        </label>
                                        <input
                                            id="new-password"
                                            type="password"
                                            value={newPassword}
                                            onChange={(event) => setNewPassword(event.target.value)}
                                            className={INPUT_CLASS}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={LABEL_CLASS} htmlFor="confirm-password">
                                            Confirm new password
                                        </label>
                                        <input
                                            id="confirm-password"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(event) => setConfirmPassword(event.target.value)}
                                            className={INPUT_CLASS}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={busy || !canUpdatePassword}
                                        className={cn(
                                            "w-full rounded-md border border-[var(--ui-accent)] bg-[var(--ui-accent)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--editor-bg)] transition-colors",
                                            busy || !canUpdatePassword ? "opacity-60" : "hover:bg-[var(--ui-accent-hover)]",
                                        )}
                                    >
                                        Update password
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-hover)]/30 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--ui-border)] bg-[var(--ui-active)]">
                                        <UserIcon className="h-5 w-5 text-[var(--ui-accent)]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--editor-fg)]">
                                            Maple account
                                        </p>
                                        <p className="text-xs text-[var(--editor-line-number)]">
                                            Optional, fast, and lightweight.
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden items-center gap-2 text-xs text-[var(--editor-line-number)] sm:flex">
                                    <ShieldCheck className="h-4 w-4 text-[var(--ui-accent)]" />
                                    No account required to edit.
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-active)] p-1">
                            <button
                                type="button"
                                onClick={() => setMode("signin")}
                                className={cn(
                                    "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                                    mode === "signin"
                                        ? "bg-[var(--ui-hover)] text-[var(--editor-fg)]"
                                        : "text-[var(--editor-line-number)] hover:text-[var(--editor-fg)]",
                                )}
                            >
                                <span className="inline-flex items-center justify-center gap-2">
                                    <UserIcon className="h-3.5 w-3.5" />
                                    Sign in
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("signup")}
                                className={cn(
                                    "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                                    mode === "signup"
                                        ? "bg-[var(--ui-hover)] text-[var(--editor-fg)]"
                                        : "text-[var(--editor-line-number)] hover:text-[var(--editor-fg)]",
                                )}
                            >
                                <span className="inline-flex items-center justify-center gap-2">
                                    <UserPlus className="h-3.5 w-3.5" />
                                    Create account
                                </span>
                            </button>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                            {mode === "signin" ? (
                                <form className="space-y-4" onSubmit={handleSignIn}>
                                    <div className="space-y-1.5">
                                        <label className={LABEL_CLASS} htmlFor="signin-email">
                                            Email
                                        </label>
                                        <input
                                            id="signin-email"
                                            type="email"
                                            value={signInEmail}
                                            onChange={(event) => setSignInEmail(event.target.value)}
                                            className={INPUT_CLASS}
                                            autoComplete="email"
                                            placeholder="you@maple.dev"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={LABEL_CLASS} htmlFor="signin-password">
                                            Password
                                        </label>
                                        <input
                                            id="signin-password"
                                            type="password"
                                            value={signInPassword}
                                            onChange={(event) => setSignInPassword(event.target.value)}
                                            className={INPUT_CLASS}
                                            autoComplete="current-password"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!canSubmit || busy}
                                        className={cn(
                                            "w-full rounded-md border border-[var(--ui-accent)] bg-[var(--ui-accent)] px-3 py-2 text-sm font-semibold text-[var(--editor-bg)] transition-colors",
                                            !canSubmit || busy ? "opacity-60" : "hover:bg-[var(--ui-accent-hover)]",
                                        )}
                                    >
                                        Sign in
                                    </button>
                                    <p className={HELPER_CLASS}>
                                        Sign in is optional. You can keep using Maple without an account.
                                    </p>
                                </form>
                            ) : (
                                <form className="space-y-4" onSubmit={handleSignUp}>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label className={LABEL_CLASS} htmlFor="signup-name">
                                                Display name (optional)
                                            </label>
                                            <input
                                                id="signup-name"
                                                type="text"
                                                value={signUpName}
                                                onChange={(event) => setSignUpName(event.target.value)}
                                                className={INPUT_CLASS}
                                                autoComplete="name"
                                                placeholder="Maple"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className={LABEL_CLASS} htmlFor="signup-email">
                                                Email
                                            </label>
                                            <input
                                                id="signup-email"
                                                type="email"
                                                value={signUpEmail}
                                                onChange={(event) => setSignUpEmail(event.target.value)}
                                                className={INPUT_CLASS}
                                                autoComplete="email"
                                                placeholder="you@maple.dev"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label className={LABEL_CLASS} htmlFor="signup-password">
                                                Password
                                            </label>
                                            <input
                                                id="signup-password"
                                                type="password"
                                                value={signUpPassword}
                                                onChange={(event) => setSignUpPassword(event.target.value)}
                                                className={INPUT_CLASS}
                                                autoComplete="new-password"
                                            />
                                            <p className={HELPER_CLASS}>Minimum 8 characters.</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className={LABEL_CLASS} htmlFor="signup-confirm">
                                                Confirm password
                                            </label>
                                            <input
                                                id="signup-confirm"
                                                type="password"
                                                value={signUpConfirm}
                                                onChange={(event) => setSignUpConfirm(event.target.value)}
                                                className={INPUT_CLASS}
                                                autoComplete="new-password"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!canSubmit || busy}
                                        className={cn(
                                            "w-full rounded-md border border-[var(--ui-accent)] bg-[var(--ui-accent)] px-3 py-2 text-sm font-semibold text-[var(--editor-bg)] transition-colors",
                                            !canSubmit || busy ? "opacity-60" : "hover:bg-[var(--ui-accent-hover)]",
                                        )}
                                    >
                                        <span className="inline-flex items-center justify-center gap-2">
                                            <UserPlus className="h-4 w-4" />
                                            Create account
                                        </span>
                                    </button>
                                    <p className={HELPER_CLASS}>
                                        Accounts are optional. Create one to sync identity across sessions.
                                    </p>
                                </form>
                            )}

                            <div className="space-y-4 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-hover)]/30 p-4">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--editor-line-number)]">
                                    <ShieldCheck className="h-4 w-4 text-[var(--ui-accent)]" />
                                    Why sign in
                                </div>
                                <div className="space-y-3 text-sm text-[var(--editor-line-number)]">
                                    <div className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)]" />
                                        <span>
                                            <span className="text-[var(--editor-fg)]">Identity across sessions.</span>{" "}
                                            Keep your display name and avatar consistent.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)]" />
                                        <span>
                                            <span className="text-[var(--editor-fg)]">Quick profile updates.</span> Edit
                                            your name and avatar anytime.
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)]" />
                                        <span>
                                            <span className="text-[var(--editor-fg)]">Optional by design.</span> Maple
                                            stays fast even without an account.
                                        </span>
                                    </div>
                                </div>
                                <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-active)] px-3 py-2 text-xs text-[var(--editor-line-number)]">
                                    You can close this anytime and keep editing.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
