import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, preview } from '@/lib/logger';

// ── preview() ──────────────────────────────────────────────

describe('preview', () => {
    it('returns short strings unchanged', () => {
        expect(preview('hello')).toBe('hello');
    });

    it('truncates strings longer than the default 80 chars', () => {
        const long = 'a'.repeat(100);
        const result = preview(long);
        expect(result).toHaveLength(81); // 80 chars + '…'
        expect(result.endsWith('…')).toBe(true);
    });

    it('respects a custom maxLen', () => {
        const result = preview('abcdef', 3);
        expect(result).toBe('abc…');
    });

    it('returns exact-length strings unchanged', () => {
        const exact = 'a'.repeat(80);
        expect(preview(exact)).toBe(exact);
    });
});

// ── createLogger() ─────────────────────────────────────────

describe('createLogger', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('info() emits structured JSON to console.log', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const log = createLogger('test-route');

        log.info('hello world', { key: 'value' });

        expect(spy).toHaveBeenCalledOnce();
        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output).toMatchObject({
            severity: 'INFO',
            route: 'test-route',
            message: 'hello world',
            data: { key: 'value' },
        });
        expect(output.timestamp).toBeDefined();
    });

    it('warn() emits to console.warn', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const log = createLogger('chat');

        log.warn('watch out');

        expect(spy).toHaveBeenCalledOnce();
        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output.severity).toBe('WARNING');
    });

    it('error() emits to console.error', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const log = createLogger('summary');

        log.error('boom', { code: 500 });

        expect(spy).toHaveBeenCalledOnce();
        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output.severity).toBe('ERROR');
        expect(output.data).toEqual({ code: 500 });
    });

    it('includes context when provided', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const log = createLogger('chat', { sessionId: 'abc' });

        log.info('test');

        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output.ctx).toEqual({ sessionId: 'abc' });
    });

    it('startTimer().done() includes durationMs', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const log = createLogger('chat');
        const timer = log.startTimer();

        // Small delay so durationMs > 0
        await new Promise((r) => setTimeout(r, 10));
        timer.done('finished');

        const output = JSON.parse(spy.mock.calls[0][0]);
        expect(output.durationMs).toBeGreaterThanOrEqual(0);
        expect(output.message).toBe('finished');
    });
});
