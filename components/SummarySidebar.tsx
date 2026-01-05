import { useState, useEffect } from 'react';
import { Download, Upload, MessageSquare, Loader2, Save, Trash2, Plus, X, Edit2, Search } from 'lucide-react';
import { SessionSummary, ChatMessage, ChatSession } from '@/lib/types';
import { StorageService } from '@/lib/storage';

interface SessionSidebarProps {
    messages: ChatMessage[];
    onImport: (summary: SessionSummary) => void;
    summary: SessionSummary | null;
    setSummary: (s: SessionSummary) => void;
    currentSessionId: string | null;
    onLoadSession: (session: ChatSession) => void;
    onCreateSession: () => void;
    isGenerating?: boolean;
}

export default function SessionSidebar({
    messages,
    onImport,
    summary,
    setSummary,
    currentSessionId,
    onLoadSession,
    onCreateSession,
    isGenerating = false
}: SessionSidebarProps) {
    const [savedSessions, setSavedSessions] = useState<ChatSession[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Refresh sessions list
    const refreshSessions = () => {
        setSavedSessions(StorageService.getSessions());
    };

    // Initial load and hydration
    useEffect(() => {
        refreshSessions();
    }, [currentSessionId]); // Refresh when session changes

    // Auto-save current session whenever it changes
    useEffect(() => {
        if (summary) {
            // This useEffect is likely handled by the parent component now,
            // but keeping it here for local summary updates if needed.
            // StorageService.saveCurrentSession(summary);
        }
    }, [summary]);

    // Generate Summary logic has been moved to parent

    const handleSaveSession = () => {
        // This function is no longer used directly for saving new sessions via a dialog.
        // Session saving is now managed by the parent component and StorageService.
    };

    const handleDeleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this chat session?')) {
            StorageService.deleteSession(id);
            refreshSessions();
            if (currentSessionId === id) {
                onCreateSession(); // Switch to new if deleted current
            }
        }
    };

    const handleLoadSession = (s: ChatSession) => {
        // This function is replaced by the onLoadSession prop.
        // The parent component will handle loading and setting the current session.
    };

    const handleKeyDate = (ts: number) => {
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    const handleExport = () => {
        if (!summary) return;
        const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `minecraft-session-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                onImport(json);
                setSummary(json);
            } catch (err) {
                console.error("Invalid JSON", err);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="w-80 border-l border-white/10 bg-zinc-900/50 flex flex-col h-full overflow-hidden shrink-0">

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">

                {/* Actions */}
                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                        {isGenerating ? (
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <Loader2 className="w-3 h-3 animate-spin" /> Updating...
                            </span>
                        ) : 'Current View'}
                    </h3>

                    <div className="flex items-center gap-2">
                        {summary && (
                            <button onClick={handleExport} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                                <Download className="w-3 h-3" /> JSON
                            </button>
                        )}
                        <label className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer transition-colors">
                            <Upload className="w-3 h-3" /> Import
                            <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                        </label>
                    </div>
                </div>

                {/* Active Summary View */}
                {summary ? (
                    <div className="space-y-6 pt-2">

                        {/* Export/View Header removed as it's merged above */}

                        {summary.currentProjects?.length > 0 && (
                            <div>
                                <h3 className="text-emerald-500/80 font-medium text-xs mb-2">Active Projects</h3>
                                <ul className="space-y-2">
                                    {summary.currentProjects.map((p, i) => (
                                        <li key={i} className="bg-zinc-800/40 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="font-medium text-blue-300 text-xs">{p.name}</div>
                                            <div className="text-[10px] text-zinc-400 mt-1 flex justify-between items-center">
                                                <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500">{p.status}</span>
                                                <span>{p.progress}%</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {summary.goals?.shortTerm?.length > 0 && (
                            <div>
                                <h3 className="text-amber-500/80 font-medium text-xs mb-2">Goals</h3>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-300">
                                    {summary.goals.shortTerm.map((g, i) => (
                                        <li key={i}>{g}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {summary.knowledgeBase?.mechanicsLearned?.length > 0 && (
                            <div>
                                <h3 className="text-purple-500/80 font-medium text-xs mb-2">Learned</h3>
                                <div className="flex flex-wrap gap-1">
                                    {summary.knowledgeBase.mechanicsLearned.map((m, i) => (
                                        <span key={i} className="px-2 py-1 bg-zinc-800/60 rounded text-[10px] text-zinc-300 border border-white/5">{m}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-[10px] text-zinc-600 pt-4 border-t border-white/5 text-center">
                            Last Updated: {new Date(summary.lastUpdated || Date.now()).toLocaleString()}
                        </div>
                    </div>
                ) : (
                    <div className="text-zinc-500 text-center py-10 px-4 italic text-xs border border-dashed border-zinc-800 rounded-lg">
                        {isGenerating ? 'Generating first summary...' : 'Start chatting to see a session summary.'}
                    </div>
                )}
            </div>

            {/* Header / Sessions at Bottom */}
            <div className="bg-zinc-900/80 border-t border-white/5 flex flex-col max-h-[40%]">
                <div className="p-3 border-b border-white/5 space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm flex items-center gap-2 text-white/80">
                            <MessageSquare className="w-4 h-4 text-yellow-500" />
                            Sessions
                        </h2>
                        <button
                            onClick={onCreateSession}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                            title="New Session"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-white/5 rounded-md py-1.5 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/10 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700">
                    {savedSessions
                        .filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
                        .length === 0 ? (
                        <div className="text-zinc-500 text-xs text-center py-4 italic">
                            {searchQuery ? 'No matching sessions' : 'No saved sessions'}
                        </div>
                    ) : (
                        savedSessions
                            .filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
                            .map((s) => (
                                <div key={s.id}
                                    onClick={() => onLoadSession(s)}
                                    className={`group flex items-center justify-between p-2 rounded cursor-pointer border transition-all ${currentSessionId === s.id
                                        ? 'bg-zinc-800/80 border-white/10 shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-zinc-800/50 hover:border-white/5'
                                        }`}
                                >
                                    <div className="overflow-hidden flex items-center gap-2 min-w-0">
                                        <MessageSquare className={`w-3 h-3 shrink-0 ${currentSessionId === s.id ? 'text-green-500' : 'text-zinc-600'}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className={`text-xs font-medium truncate ${currentSessionId === s.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                                                {s.name || 'Untitled Session'}
                                            </div>
                                            <div className="text-[10px] text-zinc-600 truncate">{handleKeyDate(s.lastUpdated)}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteSession(s.id, e)}
                                        className="p-1 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                    )}
                </div>
            </div>
        </div>
    );
}
