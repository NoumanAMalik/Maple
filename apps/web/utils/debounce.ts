/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last invocation.
 *
 * @param fn - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    wait: number,
): {
    (...args: Parameters<T>): void;
    cancel: () => void;
    flush: () => void;
} {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;

    const debounced = (...args: Parameters<T>) => {
        lastArgs = args;

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            timeoutId = null;
            if (lastArgs) {
                fn(...lastArgs);
                lastArgs = null;
            }
        }, wait);
    };

    debounced.cancel = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        lastArgs = null;
    };

    debounced.flush = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        if (lastArgs) {
            fn(...lastArgs);
            lastArgs = null;
        }
    };

    return debounced;
}

/**
 * Creates a throttled function that only invokes the provided function
 * at most once per the specified wait time.
 *
 * @param fn - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    wait: number,
): {
    (...args: Parameters<T>): void;
    cancel: () => void;
} {
    let lastCall = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const throttled = (...args: Parameters<T>) => {
        const now = Date.now();
        const remaining = wait - (now - lastCall);

        if (remaining <= 0 || remaining > wait) {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            lastCall = now;
            fn(...args);
        } else if (timeoutId === null) {
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                timeoutId = null;
                fn(...args);
            }, remaining);
        }
    };

    throttled.cancel = () => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return throttled;
}
