import { ChatSession } from './types';

const STORAGE_KEYS = {
    SESSIONS: 'mc_guide_chat_sessions',
    ACTIVE_SESSION_ID: 'mc_guide_active_session_id',
};

export const StorageService = {
    // Get all sessions sorted by lastUpdated desc
    getSessions: (): ChatSession[] => {
        try {
            if (typeof window === 'undefined') return [];
            const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to get sessions', e);
            return [];
        }
    },

    // Get specific session
    getSession: (id: string): ChatSession | undefined => {
        const sessions = StorageService.getSessions();
        return sessions.find(s => s.id === id);
    },

    // Save or Update a session
    saveSession: (session: ChatSession) => {
        try {
            if (typeof window === 'undefined') return;
            const sessions = StorageService.getSessions();
            const index = sessions.findIndex(s => s.id === session.id);

            let updatedSessions;
            if (index >= 0) {
                updatedSessions = [
                    ...sessions.slice(0, index),
                    session,
                    ...sessions.slice(index + 1)
                ];
            } else {
                updatedSessions = [session, ...sessions];
            }

            // Sort by lastUpdated desc
            updatedSessions.sort((a, b) => b.lastUpdated - a.lastUpdated);

            localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updatedSessions));
        } catch (e) {
            console.error('Failed to save session', e);
        }
    },

    // Create new session
    createSession: (name: string = "New Chat"): ChatSession => {
        const newSession: ChatSession = {
            id: crypto.randomUUID(),
            name,
            messages: [],
            summary: null,
            lastUpdated: Date.now()
        };
        StorageService.saveSession(newSession);
        StorageService.setActiveSessionId(newSession.id);
        return newSession;
    },

    // Delete session
    deleteSession: (id: string) => {
        try {
            if (typeof window === 'undefined') return;
            const sessions = StorageService.getSessions();
            const updated = sessions.filter(s => s.id !== id);
            localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));

            // If deleted active session, clear active ID
            if (StorageService.getActiveSessionId() === id) {
                localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
            }
        } catch (e) {
            console.error('Failed to delete session', e);
        }
    },

    // Active Session Management
    setActiveSessionId: (id: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, id);
    },

    getActiveSessionId: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    },

    clearActiveSessionId: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    }
};
