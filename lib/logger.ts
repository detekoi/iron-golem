/**
 * Structured logger for Firebase App Hosting.
 * 
 * Outputs single-line JSON so each log call = one row in Firebase Console.
 * Structured `data` fields are expandable in the Cloud Logging viewer.
 */

type Severity = 'INFO' | 'WARNING' | 'ERROR';

interface LogEntry {
    severity: Severity;
    message: string;
    route?: string;
    durationMs?: number;
    data?: Record<string, unknown>;
}

function emit(entry: LogEntry) {
    const output = JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString(),
    });

    switch (entry.severity) {
        case 'ERROR':
            console.error(output);
            break;
        case 'WARNING':
            console.warn(output);
            break;
        default:
            console.log(output);
    }
}

/** Creates a logger scoped to a specific API route with optional context. */
export function createLogger(route: string, context?: Record<string, unknown>) {
    const base = { route, ...(context && { ctx: context }) };

    return {
        info(message: string, data?: Record<string, unknown>) {
            emit({ ...base, severity: 'INFO', message, data });
        },
        warn(message: string, data?: Record<string, unknown>) {
            emit({ ...base, severity: 'WARNING', message, data });
        },
        error(message: string, data?: Record<string, unknown>) {
            emit({ ...base, severity: 'ERROR', message, data });
        },
        /** Start a timer. Call `.done(message, data?)` to log duration. */
        startTimer() {
            const start = Date.now();
            return {
                done(message: string, data?: Record<string, unknown>) {
                    emit({
                        ...base,
                        severity: 'INFO',
                        message,
                        durationMs: Date.now() - start,
                        data,
                    });
                },
            };
        },
    };
}

/** Truncate a string for log previews. */
export function preview(text: string, maxLen = 80): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '…';
}
