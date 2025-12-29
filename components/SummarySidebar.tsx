import { useState, useEffect } from 'react';
import { Download, Upload, FileJson, Loader2, Save, Trash2, FolderOpen, Plus, X, Edit2 } from 'lucide-react';
import { SessionSummary, ChatMessage } from '@/lib/types';
import { StorageService, SavedSession } from '@/lib/storage';

interface SummarySidebarProps {
    messages: ChatMessage[];
    onImport: (summary: SessionSummary) => void;
    summary: SessionSummary | null;
    setSummary: (s: SessionSummary) => void;
}

export default function SummarySidebar({ messages, onImport, summary, setSummary }: SummarySidebarProps) {
    const [loading, setLoading] = useState(false);
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [renamingId, setRenamingId] = useState<string | null>(null);

    // Initial load and hydration
    useEffect(() => {
        // Load saved sessions list
        setSavedSessions(StorageService.getSavedSessions());

        // Try to load current active session if no summary exists yet
        if (!summary) {
            const current = StorageService.loadCurrentSession();
            if (current) {
                setSummary(current);
            }
        }
    }, []);

    // Auto-save current session whenever it changes
    useEffect(() => {
        if (summary) {
            StorageService.saveCurrentSession(summary);
        }
    }, [summary]);

    const generateSummary = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages })
            });
            if (!res.ok) throw new Error("Failed to generate");
            const data = await res.json();
            setSummary(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSession = () => {
        if (!summary || !newSessionName.trim()) return;
        const updated = StorageService.saveSessionToList(summary, newSessionName);
        setSavedSessions(updated);
        setShowSaveDialog(false);
        setNewSessionName('');
    };

    const handleDeleteSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this specific session summary?')) {
            const updated = StorageService.deleteSession(id);
            setSavedSessions(updated);
        }
    };

    const handleLoadSession = (s: SavedSession) => {
        if (confirm('Load this session? Unsaved progress in the current active view will be lost.')) {
            setSummary(s.summary);
            // Also update current session storage immediately
            StorageService.saveCurrentSession(s.summary);
        }
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
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
                <h2 className="font-semibold text-lg flex items-center gap-2 text-white">
                    <FileJson className="w-5 h-5 text-yellow-500" />
                    Session Progress
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Actions */}
                <div className="space-y-4">
                    <button
                        onClick={generateSummary}
                        disabled={loading || messages.length < 2}
                        className="w-full bg-green-600 hover:bg-green-700 py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all shadow-lg shadow-green-900/20 active:scale-95"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {summary ? 'Update Summary' : 'Generate Summary'}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setShowSaveDialog(true)} disabled={!summary} className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-30 transition-colors text-xs text-zinc-300">
                            <Plus className="w-3.5 h-3.5" /> Save As...
                        </button>
                        <label className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs text-zinc-300">
                            <Upload className="w-3.5 h-3.5" /> Import
                            <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                        </label>
                    </div>

                    {/* Save Dialog */}
                    {showSaveDialog && (
                        <div className="bg-zinc-800/80 p-3 rounded-lg border border-white/10 animate-in fade-in slide-in-from-top-2">
                            <div className="text-xs font-medium text-zinc-400 mb-2">Name this session</div>
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-500/50"
                                    placeholder="e.g. Iron Farm Strategy"
                                    value={newSessionName}
                                    onChange={(e) => setNewSessionName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSession()}
                                />
                                <button onClick={handleSaveSession} disabled={!newSessionName} className="p-1.5 bg-green-600 rounded hover:bg-green-500 disabled:opacity-50 text-white">
                                    <Save className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setShowSaveDialog(false)} className="p-1.5 bg-zinc-700 rounded hover:bg-zinc-600 text-zinc-400">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Saved Sessions List */}
                {savedSessions.length > 0 && (
                    <div>
                        <h3 className="text-zinc-500 font-bold mb-3 uppercase text-[10px] tracking-wider flex items-center gap-2">
                            <FolderOpen className="w-3 h-3" /> Saved Sessions
                        </h3>
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1 small-scrollbar">
                            {savedSessions.map((s) => (
                                <div key={s.id}
                                    onClick={() => handleLoadSession(s)}
                                    className="group flex items-center justify-between p-2 rounded bg-zinc-800/30 hover:bg-zinc-800 cursor-pointer border border-transparent hover:border-white/5 transition-all"
                                >
                                    <div className="overflow-hidden">
                                        <div className="text-xs text-zinc-300 font-medium truncate group-hover:text-white">{s.name}</div>
                                        <div className="text-[10px] text-zinc-600">{handleKeyDate(s.timestamp)}</div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteSession(s.id, e)}
                                        className="p-1.5 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Summary View */}
                {summary ? (
                    <div className="space-y-6 pt-4 border-t border-white/5">

                        <div className="flex items-center justify-between">
                            <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-wider">Current View</h3>
                            <button onClick={handleExport} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                                <Download className="w-3 h-3" /> JSON
                            </button>
                        </div>

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
                        No session summary active.<br />Chat with the helper then click "Generate Summary".
                    </div>
                )}
            </div>
        </div>
    );
}
