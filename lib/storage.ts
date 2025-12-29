import { SessionSummary } from './types';

export interface SavedSession {
    id: string;
    name: string;
    timestamp: number;
    summary: SessionSummary;
}

const STORAGE_KEYS = {
    CURRENT_SESSION: 'mc_guide_current_session',
    SAVED_SESSIONS: 'mc_guide_saved_sessions',
};

export const StorageService = {
    // Current Session (Auto-save)
    saveCurrentSession: (summary: SessionSummary) => {
        try {
            if (typeof window === 'undefined') return;
            localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(summary));
        } catch (e) {
            console.error('Failed to save current session', e);
        }
    },

    loadCurrentSession: (): SessionSummary | null => {
        try {
            if (typeof window === 'undefined') return null;
            const data = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to load current session', e);
            return null;
        }
    },

    clearCurrentSession: () => {
        try {
            if (typeof window === 'undefined') return;
            localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
        } catch (e) {
            console.error('Failed to clear current session', e);
        }
    },

    // Saved Sessions (Manually saved)
    mockSaveSessionToList: (summary: SessionSummary, name: string) => {
        // Helper for robust ID generation if we need it later
        return {
            id: crypto.randomUUID(),
            name,
            timestamp: Date.now(),
            summary
        }
    },

    saveSessionToList: (summary: SessionSummary, name: string): SavedSession[] => {
        try {
            if (typeof window === 'undefined') return [];
            const sessions = StorageService.getSavedSessions();
            const newSession: SavedSession = {
                id: crypto.randomUUID(),
                name,
                timestamp: Date.now(),
                summary,
            };

            const updatedSessions = [newSession, ...sessions];
            localStorage.setItem(STORAGE_KEYS.SAVED_SESSIONS, JSON.stringify(updatedSessions));
            return updatedSessions;
        } catch (e) {
            console.error('Failed to save session to list', e);
            return [];
        }
    },

    getSavedSessions: (): SavedSession[] => {
        try {
            if (typeof window === 'undefined') return [];
            const data = localStorage.getItem(STORAGE_KEYS.SAVED_SESSIONS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to get saved sessions', e);
            return [];
        }
    },

    deleteSession: (id: string): SavedSession[] => {
        try {
            if (typeof window === 'undefined') return [];
            const sessions = StorageService.getSavedSessions();
            const updatedSessions = sessions.filter(s => s.id !== id);
            localStorage.setItem(STORAGE_KEYS.SAVED_SESSIONS, JSON.stringify(updatedSessions));
            return updatedSessions;
        } catch (e) {
            console.error('Failed to delete session', e);
            return [];
        }
    },

    updateSession: (id: string, newName: string): SavedSession[] => {
        try {
            if (typeof window === 'undefined') return [];
            const sessions = StorageService.getSavedSessions();
            const updatedSessions = sessions.map(s => s.id === id ? { ...s, name: newName } : s);
            localStorage.setItem(STORAGE_KEYS.SAVED_SESSIONS, JSON.stringify(updatedSessions));
            return updatedSessions;
        } catch (e) {
            console.error('Failed to update session', e);
            return [];
        }
    }
};
